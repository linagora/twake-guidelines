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

## 3. Boot the cozy subset (background, then poll)

From the `twake-workplace-docker` checkout, point the stack at the local build
and bring up the subset (`twake_db` + `twake_auth` + `cozy_stack`):

```bash
export COZY_DEV_APP_SLUG=<slug>
export COZY_DEV_APP_BUILD=/abs/path/to/<app>/build
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
- Editing `node_modules` to test a fix (see `twake-frontend-lib-workflow`).
- Fabricating seed data instead of the app's ACH fixtures.
- Blocking the session on `yarn watch` or `compose up` instead of backgrounding.
