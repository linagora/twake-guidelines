---
name: twake-workplace-b2b
description: Run Twake Workplace locally in B2B configuration with SSO (LemonLDAP-NG), OpenLDAP organization schema, RabbitMQ eventing, and Cozy Stack with Shared Drives and org directory group propagation. Use when deploying, testing, or developing B2B features, shared drives, or organization-level contacts and groups.
---

# Run Twake Workplace in B2B Configuration Locally

Apply when developing, testing, or verifying **Twake Workplace B2B features** locally. This includes:
- Single Sign-On (SSO) via LemonLDAP-NG backed by OpenLDAP with B2B organization schemas.
- Cozy Stack provisioned with an organization instance and member accounts.
- Organization Shared Drives (`org_drive: true`) and directory synchronization via RabbitMQ.
- Testing organization group propagation (PR #5147) where membership updates dynamically update drive access.

---

## 1. Architecture Overview

In B2B mode, Twake Workplace operates around a tenant/organization entity rather than isolated personal instances:

1. **Authentication & Identity (`twake_auth` + `twake_db`)**:
   - **OpenLDAP**: Uses the `twakeOrganization` schema (`twakeOrganizationMember`, `twakeOrganizationId`, `twakeOrganizationRole`).
   - **LemonLDAP-NG**: Acts as the OpenID Connect (OIDC) identity provider. Releases the `org_id` and `org_role` claims to connected apps (Twake Space, Tasks, Cozy).
   - **Traefik**: Reverse proxy with TLS terminating at `*.twake.local`.

2. **Personal Cloud & Drive (`cozy_stack`)**:
   - **Organization Instance**: An instance whose slug matches `COZY_ORG_ID` (e.g. `twpdocker`). All shared drives of the organization reside here.
   - **User Instances**: Personal instances (e.g. `user1.twake.local`, `user2.twake.local`).
   - **Shared Drives**: Drives created on the organization instance receive `attributes.org_drive: true`. Only org drives appear in the Twake Drive navigation bar (`SharedDriveList`).
   - **Eventing & Sync (`b2b` RabbitMQ exchange)**: Groups and contacts are communicated across services via `stack.b2b.group.lifecycle` (`b2b.group.*`) and `twake:contacts:common`.

---

## 2. Host Prerequisites

### 2.1. Docker Network
Create the dedicated subnet for the Twake ecosystem:
```bash
docker network create twake-network --subnet=172.27.0.0/16
```

### 2.2. Host DNS (`/etc/hosts`)
Map the local test domains to `127.0.0.1`. In Linux/WSL, add to `/etc/hosts`:
```text
# Twake Workplace local entries
127.0.0.1  auth.twake.local manager.twake.local oauthcallback.twake.local
127.0.0.1  ldap-rest.twake.local contacts.twake.local account.twake.local
127.0.0.1  user1.twake.local user1-home.twake.local user1-drive.twake.local user1-settings.twake.local
127.0.0.1  user2.twake.local user2-home.twake.local user2-drive.twake.local user2-settings.twake.local
127.0.0.1  user3.twake.local user3-home.twake.local user3-drive.twake.local user3-settings.twake.local
127.0.0.1  twpdocker.twake.local twpdocker-home.twake.local twpdocker-drive.twake.local twpdocker-settings.twake.local
```

### 2.3. Traefik Root Certificate Trust
Trust the root CA certificate at `twake_auth/traefik/ssl/root-ca.crt` in your browser and OS store to enable secure HTTPS without warnings.

---

## 3. Configuration (`.env` and Feature Flags)

### 3.1. Configure `twake-workplace-docker/.env`
Set key parameters in `.env`:
```bash
BASE_DOMAIN=twake.local
LDAP_BASE_DN=dc=twake,dc=local
ORGANIZATION_ID=twake-demo

# CRITICAL: COZY_ORG_ID must NOT contain a hyphen!
# With subdomains: flat, a hyphen is treated as an app-instance delimiter.
# A hyphenated ID breaks IsOrganizationInstance(), disabling shared drives completely.
COZY_ORG_ID=twpdocker

RABBITMQ_DECLARE_EXCHANGES=auth,b2b,settings
AUTH_MODE=LDAP
```

### 3.2. Enable Shared Drives Feature Flag
Create `cozy_stack/config/default-flags.local.yaml` (gitignored, overrides defaults):
```yaml
- drive.shared-drive.enabled: true
- sharing.auto-open-settings.enabled: true
- sharing.data-toggle.enabled: true
- sharing.generate-link-button.enabled: true
```

### 3.3. Prevent Silent Network Loopbacks (`extra_hosts`)
In `cozy_stack/docker-compose.yml`, map instance subdomains directly to the Traefik proxy IP (`172.27.0.100`):
```yaml
extra_hosts:
  - "auth.${BASE_DOMAIN}:172.27.0.100"
  - "user1.${BASE_DOMAIN}:172.27.0.100"
  - "user2.${BASE_DOMAIN}:172.27.0.100"
  - "user3.${BASE_DOMAIN}:172.27.0.100"
  - "twpdocker.${BASE_DOMAIN}:172.27.0.100"
```
*(Without these entries, peer-to-peer instance calls loop back to 127.0.0.1 inside the container and silently fail into email fallbacks).*

### 3.4. Enable Centralized Directory & Workers in `cozy.yaml`
In `cozy_stack/config/cozy.yaml.template` (and rendered `cozy.yaml`):
1. **Enable Centralized Directory & Fast Propagation** under `contexts.default`:
   ```yaml
   contexts:
     default:
       centralized_org_directory: true
       org_groups_propagation_delay: 2s    # Short debounce for local testing (default 30s)
   ```
2. **Ensure Sharing Workers Are Active**:
   Make sure `share-group`, `share-replicate`, `share-track`, and `share-upload` are NOT disabled (`false`) under `workers:`.
3. **Queue Bindings**:
   Declare `stack.b2b.group.lifecycle` under the `b2b` topic exchange with bindings:
   `b2b.group.created`, `b2b.group.updated`, `b2b.group.deleted`, `b2b.group.member.added`, `b2b.group.member.removed`.

---

## 4. Mounting Custom Builds (`cozy-stack` & `twake-drive`)

### 4.1. Compile `cozy-stack` with Production Mode
Compiling with `BuildMode=production` is **critical**. Without it, `Instance.Scheme()` returns `http://`, which breaks HTTPS SSO redirects and inter-instance sharing calls:
```bash
cd /path/to/cozy-stack
GOCACHE=/tmp/gocache GOPATH=/tmp/go go build \
  -ldflags "-X github.com/cozy/cozy-stack/pkg/config.BuildMode=production" \
  -o build/cozy-stack
chmod 755 build/cozy-stack
```

Mount into `cozy_stack/docker-compose.yml`:
```yaml
volumes:
  - ../../cozy-stack/build/cozy-stack:/usr/local/bin/cozy-stack:ro
```

### 4.2. Custom `twake-drive`
To serve a locally-watched drive app without building custom docker images:
```bash
# In twake-workplace-docker/.env
COZY_DEV_APP_SLUG=drive
COZY_DEV_APP_BUILD=/absolute/path/to/twake-drive/build
```
And keep `yarn watch` running in the background.

---

## 5. Booting the Stack

Always boot from the repository root using `wrapper.sh` (which resolves service dependencies):
```bash
./wrapper.sh up -d --drive
```

Wait until `cozyt` reports healthy:
```bash
until docker exec cozyt cozy-stack status 2>/dev/null | grep -q "OK"; do sleep 1; done
```

---

## 6. Provisioning Organization & Users via SCIM

Always provision accounts via SCIM (never `cozy-stack instances add`, which bypasses SSO):

```bash
# 1. Provision Organization Instance (slug equals COZY_ORG_ID)
scripts/twake users add twpdocker \
  --email org@twake.local \
  --given-name "Org" \
  --family-name "Instance" \
  --password 'Secret123!'

# 2. Provision Members
scripts/twake users add user1 \
  --email user1@twake.local \
  --given-name "Alice" \
  --family-name "Owner" \
  --password 'Secret123!'

scripts/twake users add user2 \
  --email user2@twake.local \
  --given-name "Bob" \
  --family-name "Member" \
  --password 'Secret123!'

scripts/twake users add user3 \
  --email user3@twake.local \
  --given-name "Charlie" \
  --family-name "Member" \
  --password 'Secret123!'
```

When users are created, their contact cards are automatically replicated across instances with:
- `twakeDirectory.managed = true`
- `twakeDirectory.organizationId = "twpdocker"`
- `trustedForSharing = true`
- `cozy[].url = "https://<user>.twake.local"`

---

## 7. Verifying Shared Drives & PR #5147 Group Propagation

> [!NOTE]
> `token-cli` scopes must be **space-separated** (e.g. `"io.cozy.files:ALL io.cozy.sharings:ALL"`).

### 7.1. Create a Shared Drive on the Organization Instance
```bash
docker exec cozyt sh -c '
TOKEN=$(cozy-stack instances token-cli twpdocker.twake.local "io.cozy.files:ALL io.cozy.sharings:ALL")
curl -ks -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/vnd.api+json" \
  -X POST "https://twpdocker.twake.local/sharings/drives" \
  -d "{\"data\":{\"type\":\"io.cozy.sharings\",\"attributes\":{\"name\":\"B2B Marketing Drive\"}}}"
'
```
Verify the response contains:
- `attributes.drive: true`
- `attributes.org_drive: true`
- `attributes.owner: true`

### 7.2. Create an Organization Group via RabbitMQ
Publish a `b2b.group.created` event with initial member `user2`:
```bash
docker exec rabbitmq rabbitmqadmin publish exchange=b2b routing_key=b2b.group.created payload='{
  "timestamp": "2026-11-15T20:42:00Z",
  "organizationId": "twpdocker",
  "id": "team-marketing",
  "name": "Marketing Team",
  "description": "Marketing Team Group",
  "color": "#ff5722",
  "createdAt": "2026-11-15T20:42:00Z",
  "members": [
    {"username": "user2", "email": "user2@twake.local", "workplaceFqdn": "user2.twake.local"}
  ]
}'
```
This creates an `io.cozy.contacts.groups` document `b2b-group-<hash>` and sets `relationships.groups.data` on `user2`'s contact card.

### 7.3. Share the Drive with the Group
Attach the group to the Shared Drive on `twpdocker`:
```bash
docker exec cozyt sh -c '
TOKEN=$(cozy-stack instances token-cli twpdocker.twake.local "io.cozy.files:ALL io.cozy.sharings:ALL io.cozy.contacts:ALL io.cozy.contacts.groups:ALL")
curl -ks -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/vnd.api+json" \
  -X POST "https://twpdocker.twake.local/sharings/<sharing-id>/recipients" \
  -d "{\"data\":{\"type\":\"io.cozy.sharings\",\"id\":\"<sharing-id>\",\"relationships\":{\"recipients\":{\"data\":[{\"id\":\"b2b-group-<hash>\",\"type\":\"io.cozy.contacts.groups\"}]}}}}"
'
```
* **Verify `user2`**: Automatically receives and auto-accepts the drive (`GET /sharings/drives` on `user2.twake.local` returns the drive with `status: "ready"` and a `shortcut_id`).
* **Verify `user3`**: `GET /sharings/drives` on `user3.twake.local` returns empty (`count: 0`).

### 7.4. Test Dynamic Member Addition Propagation (PR #5147)
Publish `b2b.group.member.added` to add `user3`:
```bash
docker exec rabbitmq rabbitmqadmin publish exchange=b2b routing_key=b2b.group.member.added payload='{
  "timestamp": "2026-11-15T20:48:00Z",
  "organizationId": "twpdocker",
  "id": "team-marketing",
  "members": [
    {"username": "user3", "email": "user3@twake.local", "workplaceFqdn": "user3.twake.local"}
  ]
}'
```
* The `share-org-groups` worker reconciles drive recipients.
* `user3.twake.local` auto-accepts the drive.
* Querying `GET /sharings/drives` on `user3.twake.local` returns the drive with `status: "ready"` and a `shortcut_id`.

### 7.5. Test Dynamic Member Removal Propagation (PR #5147)
Publish `b2b.group.member.removed` to remove `user2`:
```bash
docker exec rabbitmq rabbitmqadmin publish exchange=b2b routing_key=b2b.group.member.removed payload='{
  "timestamp": "2026-11-15T20:50:00Z",
  "organizationId": "twpdocker",
  "id": "team-marketing",
  "members": [
    {"username": "user2", "email": "user2@twake.local", "workplaceFqdn": "user2.twake.local"}
  ]
}'
```
* The `share-org-groups` worker runs and updates `user2`'s status to `revoked`.
* `GET /sharings/drives` on `user2.twake.local` returns `count: 0` (drive access immediately removed).
* Direct grants (`user1`) and remaining members (`user3`) keep active ready access uninterrupted.

---

## 8. Anti-Patterns to Avoid

- **Hyphen in `COZY_ORG_ID`**: Breaks flat subdomains; shared drives will not show up in the sidebar.
- **Using `cozy-stack serve --dev`**: Forces URLs to `http://`, breaking HTTPS SSO redirects and callbacks.
- **Disabling `centralized_org_directory`**: Group propagation triggers never schedule `share-org-groups`.
- **Disabling sharing workers (`share-group: false`)**: Causes `jobs: could not find worker` on group change events.
- **Skipping peer `extra_hosts`**: Auto-accept and peer syncing fail silently.
- **Creating instances via `cozy-stack instances add`**: Bypasses LDAP/SSO sync.
- **Comma-separated token scopes**: Cozy expects space-separated scopes in `token-cli`.
