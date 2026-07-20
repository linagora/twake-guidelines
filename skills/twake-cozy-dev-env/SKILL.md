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

## 0. Check the dev-app override exists

The local-app mechanism (`COZY_DEV_APP_SLUG`, `cozy_stack/scripts/install-dev-app.sh`,
`cozy_stack/docker-compose.dev-app.yml`) is on `main`. Confirm your checkout has it
before promising anything:

```bash
ls cozy_stack/scripts/install-dev-app.sh
```

If missing, your checkout predates it — pull. Without it the stack serves the
**registry** build, `yarn watch` changes nothing, and every step below that
mentions the dev app silently no-ops.

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

The mount is served live, so a rebuild shows up on a plain browser reload. You do
**not** reinstall the app after each rebuild.

## 3. Configure `.env`

Set the variables in `twake-workplace-docker/.env`, **not** with shell `export`:
the wrappers run `source ../.env` (and pass `--env-file ../.env`), so an exported
`COZY_DEV_APP_SLUG=…` is silently overwritten by whatever `.env` holds.

```bash
# twake-workplace-docker/.env
BASE_DOMAIN=twake.local
COZY_DEV_APP_SLUG=<slug>
COZY_DEV_APP_BUILD=/abs/path/to/<app>/build
COZY_ORG_ID=twpdocker        # MUST NOT contain a hyphen — see below
```

`COZY_ORG_ID` must be a valid instance slug. With `subdomains: flat` (the default),
cozy-stack rejects a `-` in the first label, because `-` separates app from instance
in `user1-drive.twake.local`. A hyphenated `COZY_ORG_ID` can never match an instance,
so `IsOrganizationInstance()` is never true, `org_drive` is never set, and
**shared drives never appear in the Drive sidebar** no matter what the feature flag says.

`org_id` is inherited from `COZY_ORG_ID` **at provisioning time only**. Instances
created before it was set keep an empty org; destroy and re-provision them.

## 4. Enable the shared-drive feature flag

`cozy_stack/config/default-flags.yaml` ships `drive.shared-drive.enabled: false`.
Override it without touching the tracked file — the wrapper prefers a gitignored
`*.local.yaml`:

```bash
cp cozy_stack/config/default-flags.yaml cozy_stack/config/default-flags.local.yaml
# then set: drive.shared-drive.enabled: true
```

Per-instance flags beat context defaults. If a flag still reads wrong, clear the
instance's own doc with `scripts/twake flags set <user> <key>=<value>`.

## 5. Let cozy-stack reach its peer instances

`cozy_stack/docker-compose.yml` only maps `auth.${BASE_DOMAIN}` in `extra_hosts`.
Instance subdomains fall through to the host resolver, where `*.twake.local` is
`127.0.0.1`, so cozy-stack dials its own loopback on :443 and gets connection
refused. Add one `extra_hosts` entry per instance domain, pointing at the
reverse proxy:

```yaml
extra_hosts:
  - "auth.${BASE_DOMAIN}:172.27.0.100"
  - "user1.${BASE_DOMAIN}:172.27.0.100"
  - "<org-id>.${BASE_DOMAIN}:172.27.0.100"
```

This failure is **silent**. `SendShortcut` discards its error and falls back to
email, so a broken peer surfaces only as an unrelated `sendmail has failed`
warning while the share sits `pending` forever. `extra_hosts` has no wildcard;
add an entry per test user. Browsers need matching `/etc/hosts` lines
(`<user>.twake.local` and `<user>-<slug>.twake.local`) — also no wildcard.

## 6. Boot with the root wrapper

Use `wrapper.sh` at the repo root, **not** `cozy_stack/compose-wrapper.sh`.
The root wrapper resolves dependencies (`--drive` pulls in `twake_auth` →
`twake_db`) and gates on health. Entering `cozy_stack/` directly starts only
`cozy-stack` + `patcher-cozy`, and `cozyt` then loops forever on
`wait-for-it.sh: timeout ... for couchdb:5984`.

```bash
./wrapper.sh up --drive -d
```

You do not need `--mail`. A recipient whose Cozy URL is known is reached directly
by `SendShortcut`, so sharing and auto-accept work with `tmail_app` down; the only
casualty is a `notifications_sharing` mail job that errors *after* acceptance. Add
`--mail` only when you need the invitation email itself, i.e. for a recipient with
no known Cozy URL. The wrappers call `sudo docker` unconditionally; in a
non-interactive session that blocks on a password prompt.

Do not assume readiness — poll until the stack answers:

```bash
until docker exec cozyt cozy-stack status 2>/dev/null | grep -q "OK"; do sleep 2; done
```

## 7. Never use `serve --dev`

The dev-app overlay ships `command: [... "serve", "--dev" ...]`. Remove `--dev`.
It sets `build.BuildMode = ModeDev`, which makes `Instance.Scheme()` return
`http`, so every absolute URL the stack emits is `http://`. Behind the
HTTPS-only proxy that means:

- SSO login redirects to `http://…/auth/login` → Traefik `404 page not found`.
- Auto-accept enqueues, then dies calling the owner back on `http://` → `404`.

The bind mount is served live **without** `--dev`, so removing it costs nothing.

## 8. Provision instances via SCIM (never `instances add`)

Instances are created SSO-side. Provision a user; its `cozyProvision` plugin
creates the cozy instance:

```bash
scripts/twake users add user1 --email user1@example.org \
  --given-name Test --family-name User --password '<pw>'
scripts/twake users list        # require status `ok`; `scim_only` = provisioning failed
```

Omitting `--password` leaves an LDAP user that cannot log in. If `users list`
shows `scim_only`, stop and surface `auth.dlq` + `cozyt` logs.

For **shared drives** you also need the organization instance, whose slug equals
`COZY_ORG_ID`:

```bash
scripts/twake users add twpdocker --email org@example.org \
  --given-name Org --family-name Instance --password '<pw>'
```

Only drives created **on that instance** get `org_drive: true`, and the Drive
sidebar (`SharedDriveList`) renders nothing but org drives. A drive created on a
normal user instance is a valid sharing that never shows up in the nav.

## 9. Install the local app into the instance

Wait until the auto-installed app is `ready` first, or the reconcile races
provisioning and fails with `CouchDB(conflict): Document update conflict`:

```bash
until [ "$(docker exec cozyt cozy-stack apps show <slug> --domain user1.$BASE_DOMAIN \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["state"])')" = ready ]; do sleep 2; done

cozy_stack/scripts/install-dev-app.sh --slug <slug> --domain user1.$BASE_DOMAIN
```

Confirm it took: `cozy-stack apps show <slug> --domain …` must report
`source = file:///app/<slug>`, not `registry://…`.

## 10. Auto-acceptance, when you need it

Auto-accept only ever fires for **drive** sharings — `web/sharings/sharings.go`
fences it behind `if s.Drive`. A plain folder share is never auto-accepted, by
design. It also requires trust, from `cozy_stack/config/default-sharing.yaml`:

```yaml
auto_accept_trusted: true
auto_accept_trusted_contacts: true
trusted_domains: [ ${BASE_DOMAIN} ]     # suffix match: covers user1.twake.local
```

`org_id` plays **no part** in the trust decision. Trust is the sender's instance
domain matching `trusted_domains`, or a contact flagged `trustedForSharing`
(which the RabbitMQ org contact sync sets, and which needs a non-empty
`org_domain`). A share discovered interactively (`?interactive=true`) is never
auto-accepted.

## 11. Seed data on request (ACH, reuse the app's fixtures)

Only if asked, and only from the app's own fixtures — never fabricate data.
Detect a `fixtures` script / `fixtures/*.json`, mint a doctype-scoped token, and
import against the instance host (not the app subdomain):

```bash
TOKEN=$(docker exec cozyt cozy-stack instances token-cli user1.$BASE_DOMAIN io.cozy.contacts)
ACH import fixtures/contacts.json -u https://user1.$BASE_DOMAIN -t "$TOKEN"
```

If the app ships no fixtures, say so and stop.

## 12. Report the live URL and login

Hand back, explicitly, so another session can verify changes:

- URL: `https://user1-<slug>.$BASE_DOMAIN`
- Login: SSO test user `user1` and the password you provisioned it with
- Note to trust the Traefik root-CA once for green HTTPS.

## 13. Teardown

```bash
scripts/twake users destroy user1 --yes
./wrapper.sh down --drive
```

## Prerequisites and references

One-time host setup (`/etc/hosts` per instance, trust the root-CA,
`docker network create twake-network`). `docs/cookbook.md` documents
`scripts/twake flags set`; `docs/upgrade-federated-sharing.md` covers
`SAFE_HTTP_TRUSTED_PRIVATE_NETWORKS`, which cozy-stack needs to call private IPs
at all.

## Anti-patterns

- Booting from `cozy_stack/` instead of the root `wrapper.sh` — CouchDB never
  starts and `cozyt` stays unhealthy.
- Keeping `--dev` in the dev-app overlay — breaks SSO login and auto-accept.
- A hyphenated `COZY_ORG_ID` — silently disables shared drives forever.
- Assuming `extra_hosts` covers instance domains — peer calls hit loopback and
  fail silently into an email fallback.
- Expecting auto-accept on a non-drive share, or on a drive created outside the
  org instance.
- Blaming `org_id` for auto-acceptance. It gates the shared-drive **nav** via
  `org_drive`, not the trust decision.
- Creating instances with `cozy-stack instances add` (bypasses SSO). Use SCIM.
- `export COZY_DEV_APP_*` in the shell instead of the `.env` file.
- Reinstalling the app after each rebuild — the mount is already served live.
- Editing `node_modules` to test a fix (see `twake-frontend-lib-workflow`).
- Fabricating seed data instead of the app's ACH fixtures.
- Blocking the session on `yarn watch` or `compose up` instead of backgrounding.
