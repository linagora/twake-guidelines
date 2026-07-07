---
name: twake-cozy-dev-env
description: Use when you need to run, serve, or manually test a Twake/Cozy cozy-web app locally — booting cozy-stack + CouchDB + SSO, provisioning an instance via SCIM, installing the locally-watched app, and seeding data. Triggers when a session working on a cozy-web app (has manifest.webapp) needs a live environment to see its changes.
---

# Boot a local Cozy dev environment for a cozy-web app

Apply when a session needs to **see or test its cozy-web changes** in a running
stack. The goal is a prod-faithful local environment (HTTPS + SSO on
`*.twake.local`) serving the **locally-watched** app, ending with a live URL and
login. It reuses `twake-workplace-docker`; it never spins up a bespoke stack and
never edits `node_modules`.

## 1. Detect that this applies

Only proceed if the current app directory has a `manifest.webapp` **and** a cozy
build toolchain (`cozy-scripts` or `rsbuild` in `package.json`). Read the app
`slug` from `manifest.webapp`. If either is missing, this skill does not apply.

## 2. Keep the build fresh (background, non-blocking)

Start the app's watch build so `build/` stays current — run it in the
background, never blocking:

```bash
yarn watch    # cozy-scripts watch --browser, or rsbuild build --watch
```

## 3. Configure `.env`, then boot the cozy subset (background, then poll)

Set the dev-app variables in the `twake-workplace-docker/.env` file, **not** with
shell `export`: `compose-wrapper.sh` runs `source ../.env` (and passes
`--env-file ../.env`), so it overwrites any exported shell variables with the
`.env` values — an `export COZY_DEV_APP_SLUG=…` in your shell is silently reset
to whatever `.env` holds. While editing `.env`, confirm the two variables that
provisioning and sharing depend on are set:

```bash
# twake-workplace-docker/.env
COZY_DEV_APP_SLUG=<slug>
COZY_DEV_APP_BUILD=/abs/path/to/<app>/build
BASE_DOMAIN=twake.local
COZY_ORG_ID=twp-docker        # instances inherit org_id/org_domain from this
```

`COZY_ORG_ID` (with `BASE_DOMAIN`) is what gives every provisioned instance a
matching `org_id`/`org_domain`. Two instances must share the same org for
cozy-to-cozy / federated shared-drive sharing to auto-accept — set it **before**
provisioning (step 4), or the instances get an empty org and shares stay pending
forever.

Then bring up the subset (`twake_db` + `twake_auth` + `cozy_stack`) from the
`cozy_stack` checkout:

```bash
cd cozy_stack && ./compose-wrapper.sh up -d --wait
```

Do not assume readiness — poll until the stack answers:

```bash
until docker exec cozyt cozy-stack status 2>/dev/null | grep -q "OK"; do sleep 2; done
```

## 4. Provision an instance via SCIM (never `instances add`)

Instances are created SSO-side. Provision a user; its `cozyProvision` plugin
creates the cozy instance:

```bash
scripts/twake users add user1 --email user1@example.org \
  --given-name Test --family-name User
scripts/twake users list        # require status `ok`; `scim_only` = provisioning failed
```

If `users list` shows `scim_only`, stop and surface `auth.dlq` + `cozyt` logs —
the instance was not created.

For a **sharing / shared-drive test** you need two users (an owner and a
recipient). Provision both, and confirm they share the same non-empty org
(inherited from `COZY_ORG_ID`/`BASE_DOMAIN` at step 3) — auto-acceptance of a
federated share depends on it:

```bash
for u in user1 user2; do
  t=$(docker exec cozyt cozy-stack instances token-cli $u.$BASE_DOMAIN io.cozy.settings)
  docker exec cozyt curl -s -H "Host: $u.$BASE_DOMAIN" -H "Authorization: Bearer $t" \
    http://localhost:8080/settings/instance   # expect matching org_id + org_domain
done
```

An instance provisioned before `COZY_ORG_ID` was set keeps an empty org; destroy
and re-provision it (step 4) so it picks the org up.

## 5. Install the local app into the instance

Idempotent; in `serve --dev` the mounted build is served live afterwards:

```bash
cozy_stack/scripts/install-dev-app.sh --slug <slug> --domain user1.$BASE_DOMAIN
```

## 6. Seed data on request (ACH, reuse the app's fixtures)

Only if asked, and only from the app's own fixtures — never fabricate data.
Detect a `fixtures` script / `fixtures/*.json`, mint a doctype-scoped token, and
import against the instance host (not the app subdomain):

```bash
TOKEN=$(docker exec cozyt cozy-stack instances token-cli user1.$BASE_DOMAIN io.cozy.contacts)
ACH import fixtures/contacts.json -u https://user1.$BASE_DOMAIN -t "$TOKEN"
```

If the app ships no fixtures, say so and stop.

## 7. Report the live URL and login

Hand back, explicitly, so another session can verify changes:

- URL: `https://user1-<slug>.$BASE_DOMAIN`
- Login: SSO test user `user1`
- Note to trust the Traefik root-CA once for green HTTPS.

## 8. Teardown

```bash
scripts/twake users destroy user1 --yes
cd cozy_stack && ./compose-wrapper.sh down -v
```

## Prerequisites and references

One-time host setup (`/etc/hosts` for `*.twake.local`, trust the root-CA,
`docker network create twake-network`) and the full flow are documented in
`twake-workplace-docker/docs/local-app-dev.md`. If `--dev` ever misbehaves
behind the OIDC/Traefik context, fall back to prod `serve` and reinstall the app
on each rebuild.

## Anti-patterns

- Creating instances with `cozy-stack instances add` (bypasses SSO). Use SCIM.
- `export COZY_DEV_APP_*` (or `BASE_DOMAIN`/`COZY_ORG_ID`) in the shell instead
  of the `.env` file — `compose-wrapper.sh` sources `.env` and overwrites them.
- Provisioning users before `COZY_ORG_ID` is set — they get an empty org and
  federated shares never auto-accept.
- Editing `node_modules` to test a fix (see `twake-frontend-lib-workflow`).
- Fabricating seed data instead of the app's ACH fixtures.
- Blocking the session on `yarn watch` or `compose up` instead of backgrounding.
