---
name: frontend-lib-workflow
description: Use when debugging, adding features to, or testing changes inside any cozy-* or twake-* library consumed by a Twake/Cozy React frontend app. Forbids hand-editing files under node_modules; directs to the linagora/cozy-libs monorepo and to yarn link or rlink for local testing.
---

# Local workflow for cozy-* and twake-* libraries

Apply these rules whenever you need to change, debug, or experiment with the behavior of a `cozy-*` or `twake-*` library (e.g. `cozy-ui`, `cozy-client`, `cozy-stack-client`, `twake-mui`) from inside a Twake or Cozy React app.

## Never edit `node_modules` by hand

Editing files under `node_modules/` directly:

- Is lost on the next `yarn install` / `npm install`.
- Cannot be committed back to source control.
- Creates silent drift between developers and between local and CI.

If you find yourself wanting to change a file under `node_modules/`, stop. Use the workflow below.

## Step 1: locate the library source

Most shared `cozy-*` libraries live in the **cozy-libs monorepo**:
https://github.com/linagora/cozy-libs

Look there first. The monorepo uses Yarn workspaces; each package lives under `packages/<name>`.

If the package is not in `cozy-libs`, it has its own repository:

- `cozy-ui` → https://github.com/cozy/cozy-ui
- `twake-mui` → https://github.com/linagora/twake-ui
- Other `twake-*` libraries → check the `linagora` GitHub org.

Clone the relevant repo before going further.

## Step 2: link the local source into your app

Use `yarn link`, or `rlink` when the library repo ships that helper (it wraps linking plus a watch build).

```bash
# In the library checkout (e.g. cozy-libs/packages/cozy-ui)
yarn link

# In your consuming app
cd my-twake-app
yarn link cozy-ui
```

If the library needs transpilation (most do), start its watch build in parallel so your app picks up source changes on reload.

`rlink` automates the link and the watch build in one command when it exists in the library repo.

## Step 3: commit the fix upstream, then unlink

Once the fix works locally:

1. Commit the change **inside the library repo**, following the `git-conventions` skill (atomic commits, Conventional Commits, structured PR).
2. Open a PR on the library repo and get it merged and published.
3. Bump the dependency version in your app.
4. Run `yarn unlink` (or the `rlink` unlink equivalent) and a fresh `yarn install` so the app consumes the published version again.

Forgetting step 4 will break the app for other developers and for CI, because the linked directory only exists on your machine.

## Anti-patterns

- Editing `node_modules/cozy-ui/transpiled/...` or any other file under `node_modules/`.
- Copy-pasting code out of a `cozy-*` / `twake-*` library into the app to "fix it locally".
- Shipping a `patch-package` diff against a `cozy-*` / `twake-*` library. The fix belongs upstream.
- Committing a `yarn.lock` that references a linked directory.
- Forgetting to `yarn unlink` before pushing. If CI green-lights an app pointing at a link, the lock has drifted.
