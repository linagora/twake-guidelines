---
name: twake-workplace-b2b
description: Use when a local Twake Workplace stack must run organization (B2B) features — the organization instance, organization shared drives, organization groups and their propagation to drives, B2B vs B2C accounts. Builds on twake-cozy-dev-env and the twakedemo organization of twake-workplace-docker.
---

# Organization features in the local stack

This skill adds the organization layer on top of `twake-cozy-dev-env`, which
covers booting the stack, SCIM accounts and serving a local app.
`twake-workplace-docker` already ships the organization setup: read its
`docs/organizations.md` first, and do not hand-edit what it sets
(`extra_hosts`, the `b2b` queue, workers, `centralized_org_directory`).

## 1. Seed the organization

```bash
./wrapper.sh up -d --drive
scripts/seed-organization.sh
```

| Account | Role | Password |
|---|---|---|
| `twakedemo` | Organization instance: the organization's shared drives live here. Not an LDAP member, so Twake Space does not list it | `twakedemo` |
| `twakedemo1` | Owner | `twakedemo1` |
| `twakedemo2`, `twakedemo3` | Members | their login |
| `user1` to `user3` | B2C: no organization, Twake Space refuses them | — |

The organization id is `ORGANIZATION_ID` in `.env`. An account belongs to it when
its login starts with it. Add `/etc/hosts` entries for each `twakedemo*`
instance and its `-home`, `-drive`, `-settings` subdomains. To add a member, follow
`docs/organizations.md`: it needs `ldap-ensure`, the shared drive flag and one
more `extra_hosts` entry.

## 2. Pick the cozy-stack

The stack runs the published image (`cozy/cozy-stack:1.6.71`). There, a group
change reaches drives through `share-group` triggers.

cozy-stack master adds the `share-org-groups` worker
([cozy-stack#5147](https://github.com/linagora/cozy-stack/pull/5147)), not yet
in a released image. To test it, build a Linux binary in production mode (a
plain `go build` is a dev build: every URL becomes `http://` and SSO breaks):

```bash
cd cozy-stack
CGO_ENABLED=0 GOOS=linux GOARCH="$(docker version -f '{{.Server.Arch}}')" go build \
  -ldflags "-X github.com/cozy/cozy-stack/pkg/config.BuildMode=production" \
  -o build/cozy-stack
```

Mount it in `cozy_stack/docker-compose.yml` (do not commit it), then restart:

```yaml
volumes:
  - /abs/path/to/cozy-stack/build/cozy-stack:/usr/local/bin/cozy-stack:ro
```

`share-org-groups` waits `org_groups_propagation_delay` (30s by default) after a
group event. For local tests, set it under `contexts.default` in
`cozy_stack/config/cozy.yaml.template`:

```yaml
org_groups_propagation_delay: 2s
```

## 3. Check that a drive follows its group

Nothing in the stack publishes group events: publish them by hand.

```bash
token() { docker exec cozyt cozy-stack instances token-cli "$1.twake.local" \
  io.cozy.files io.cozy.sharings io.cozy.contacts io.cozy.contacts.groups; }
drives() { curl -ks -H "Authorization: Bearer $(token "$1")" \
  "https://$1.twake.local/sharings/drives" | jq '.data | length'; }
group() { docker exec rabbitmq rabbitmqadmin publish exchange=b2b routing_key="b2b.group.$1" \
  payload="{\"timestamp\":\"$(date -u +%FT%TZ)\",\"createdAt\":\"$(date -u +%FT%TZ)\",
    \"organizationId\":\"twakedemo\",\"id\":\"marketing\",\"name\":\"Marketing\",
    \"members\":[{\"username\":\"$2\",\"email\":\"$2@twake.local\",\"workplaceFqdn\":\"$2.twake.local\"}]}"; }

# 1. A group with twakedemo2
group created twakedemo2

# 2. Its document id is b2b-group- + the first 32 hex of sha256("<org id>\0<group id>")
GROUP="b2b-group-$(printf '%s\0%s' twakedemo marketing | shasum -a 256 | cut -c1-32)"

# 3. A drive on the organization instance, shared with the group
curl -ks -X POST "https://twakedemo.twake.local/sharings/drives" \
  -H "Authorization: Bearer $(token twakedemo)" -H 'Content-Type: application/vnd.api+json' \
  -d "{\"data\":{\"type\":\"io.cozy.sharings\",\"attributes\":{\"name\":\"Marketing\"},
    \"relationships\":{\"recipients\":{\"data\":[{\"id\":\"$GROUP\",\"type\":\"io.cozy.contacts.groups\"}]}}}}"

drives twakedemo2   # 1: auto-accepted
drives twakedemo3   # 0

group member.added twakedemo3     # after the delay: drives twakedemo3 → 1
group member.removed twakedemo2   # after the delay: drives twakedemo2 → 0
```

The response of step 3 must have `org_drive: true`. If not, the drive was not
created on the organization instance.

## Anti-patterns

- A hyphen or a capital in `ORGANIZATION_ID`: cozy-stack refuses a hyphen in an
  instance name and compares the id as written.
- A drive created on a member instance: it is a valid sharing, but not an
  organization drive, so the Drive sidebar never shows it.
- Testing propagation with a drive owned outside the organization: only owners
  reconcile ([cozy-stack#5335](https://github.com/linagora/cozy-stack/issues/5335)).
- Expecting a removed member to lose access at once: it keeps it until the
  propagation delay ends.
- Commas between `token-cli` scopes: pass them as separate arguments.
- A stack provisioned before the `twakedemo` layout (`twake-demo`, `twpdocker`):
  follow "A stack provisioned before this layout" in `docs/organizations.md`.
