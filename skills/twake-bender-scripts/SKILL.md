---
name: twake-bender-scripts
description: Use when a task involves Bender (bender.cozycloud.cc), the Twake/Cozy instance administration tool — updating or changing the source of an app or konnector on instances, reading or setting feature flags on an instance or a context, listing installed apps, or reading a context's config. The agent never calls the Bender API and never handles a Bender token; it writes curl scripts that the user runs, and reads the output the user pastes back.
---

# Bender scripts (Twake / Linagora)

Apply whenever a task touches Bender, the admin tool for Cozy/Twake instances at
`https://bender.cozycloud.cc` (API doc: `https://bender.cozycloud.cc/api/doc/`).
Bender acts on production and dev instances with the user's personal
credentials, so the split is strict: **the agent writes the script, the user
runs it and pastes the output back.**

## Hard rules

- **Never call the Bender API.** No `curl`, no `fetch`, no browser, no
  background job against `bender.cozycloud.cc`, not even a read. Every call,
  including the verification one, is a script the user runs.
- **Never handle a Bender token.** Never ask for it. Scripts read it from the
  environment with `${BENDER_TOKEN:?}` and nothing else: never as an argument,
  never inline, never in a file. If the user pastes a token in the conversation,
  say so, do not use it, and tell them to revoke it on their Bender profile page
  (`https://bender.cozycloud.cc/profile`) and generate a new one.
- **Print only what verifies the result.** Scripts output `ok`, version, state,
  source or flag values, so the pasted output carries nothing sensitive.
- **Write actions default to being asked for.** Only write (`PUT`, `POST`,
  `DELETE`) what the user explicitly asked. A request to "check" something gets
  a read script.

## Script conventions

Give the user a single `bash` block they can paste as-is, with the token read
from the environment and the loop over instances explicit:

```bash
export BENDER_TOKEN=<paste your token here, not in the chat>
```

```bash
H=(-H "Authorization: Bearer ${BENDER_TOKEN:?}" -H "Accept: application/json" -H "Content-Type: application/json")
B=https://bender.cozycloud.cc
for d in alice.example.org bob.example.org; do
  D="$d"
  r=$(curl -s -X PUT "${H[@]}" -d '{"force":true}' "$B/instances/dev/$D/apps/drive?synchronous=true")
  echo "$d: $(echo "$r" | python3 -c 'import sys,json;j=json.load(sys.stdin);a=(j.get("data") or {}).get("attributes") or {};print(j.get("ok"),a.get("source"),a.get("version"),a.get("state"))' 2>/dev/null || echo "$r" | head -c 200)"
done
```

- `Accept: application/json` is required, otherwise Bender renders HTML.
- The env (`dev`, `prod`, ...) is the first path segment after `/instances/`.
  When unsure, give the user a guess script first:
  `curl -s "${H[@]}" "$B/instances/guess/<domain>"` returns `{"env": ...}`.
- Always finish with a **verify** script (a read) so the user can confirm the
  state and paste it back.
- When the user pastes output, read it as data: report versions, states and
  failures, then propose the next script if something is off.

## Endpoint reference

All routes are relative to `https://bender.cozycloud.cc`. `<env>` is the
environment, `<domain>` the full instance domain, `<slug>` the app slug.

### Apps and konnectors

| Action | Call |
|---|---|
| List installed apps | `GET /instances/<env>/<domain>/apps` → `{"apps": [{slug, version, source, state}, ...]}` |
| Update an app to latest on its current source | `PUT /instances/<env>/<domain>/apps/<slug>?synchronous=true` with body `{}` |
| Change an app's source and update | same, body `{"source": "registry://<slug>/<channel>"}` |
| Bypass user consent on permission changes | add `"force": true` to the body (needs the force-update scope on the user's Bender account, else 403) |
| Install an app | `POST /instances/<env>/<domain>/apps` |
| Uninstall an app | `DELETE /instances/<env>/<domain>/apps/<slug>` |
| Konnectors | same routes with `/konnectors` in place of `/apps` |

`?synchronous=true` makes Bender wait for cozy-stack and answer
`{"ok": <bool>, "data": <app manifest>}`. `ok` is true when the final state is
`installed` or `ready`. Without it the call returns immediately with the state
before the update.

"Update" means "latest version on the app's current registry channel". If a
newer version is only on another channel, change the source (for example
`registry://drive/dev`).

### Feature flags

| Scope | Call |
|---|---|
| Read a context's config and flags | `GET /contexts/<env>/<context>` → `{"context": {config, office, ...}, "context_flags": {...}}` |
| Read an instance's flags | `GET /instances/<env>/<domain>/features` |
| Set a context flag | `PUT /instances/<env>/features` with body `{"source": "ratio", "context": "<context>", "name": "<flag>", "value": [{"ratio": 1, "value": <json>}]}` |
| Set an environment default flag | `PUT /instances/<env>/features` with body `{"source": "defaults", "name": "<flag>", "value": <json>}` |
| Set an instance flag | `PUT /instances/<env>/<domain>/features` with body `{"source": "instance", "name": "<flag>", "value": <json>}` |
| Delete a flag | same call with `"value": null` |

`value` is a JSON value, not a string: `true`, `"https://..."`, or an object.
For `ratio` it is an array of `{ratio, value}` entries; `ratio: 1` applies to
every instance of the context.

A context's `office`, `config`, `cloudery_endpoint` and similar entries come
from the cozy-stack configuration file, not from flags. Bender cannot write
them. Say so and point the user to ops instead of inventing a call.

### Instances

| Action | Call |
|---|---|
| Guess the env of a domain | `GET /instances/guess/<domain>` |
| Instance details | `GET /instances/<env>/<domain>` |
| List instances of an env | `GET /instances/<env>/list` |

For anything not listed here, read the API doc at
`https://bender.cozycloud.cc/api/doc/` with the user, or the route docstrings in
the `bender` repository (`bender/routes/instances.py`,
`bender/routes/environments.py`). Do not guess payload shapes.
