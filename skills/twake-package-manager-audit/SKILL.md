---
name: twake-package-manager-audit
description: Use when clearing audit vulnerabilities in a Twake/Cozy JS project (npm audit, yarn audit, pnpm audit). Detects the package manager and version (npm, Yarn classic, Yarn Berry, or pnpm), fixes each finding by upgrading a real dependency only (never a resolution, override, or pnpm override), defers what cannot be cleanly fixed, and opens one PR per project per Twake git conventions.
---

# Fix dependency vulnerabilities (Twake / Linagora)

Clear `audit` findings across a Twake/Cozy JS project without masking them.

**Core rule: fix a vulnerability by upgrading a real dependency, or defer it. Never pin a transitive version.** No `overrides` (npm/pnpm), no `resolutions` (yarn). A resolution silences the audit without fixing the tree and hides the fact that an upstream lib still ships the vulnerable version. If a finding can only be silenced that way, defer it and name the lib that owes a release.

## Detect the package manager

Read the lockfile in the project root. Never assume npm.

| Lockfile | Manager | Version check |
|---|---|---|
| `yarn.lock` | Yarn | `yarn --version` -> `1.x` = classic, `>=2` = Berry |
| `pnpm-lock.yaml` | pnpm | (n/a) |
| `package-lock.json` | npm | (n/a) |

If more than one lockfile exists, use the manager the project's CI uses and note the choice.

## Commands per manager

| Step | npm | Yarn v1 (classic) | Yarn Berry (v2+) | pnpm |
|---|---|---|---|---|
| Audit | `npm audit` | `yarn audit` | `yarn npm audit` | `pnpm audit` |
| Safe auto-fix | `npm audit fix` | none (manual) | none (manual) | none (manual) |
| Trace a package | `npm why <pkg>` | `yarn why <pkg>` | `yarn why <pkg>` | `pnpm why <pkg>` |
| Upgrade a dep | `npm install <pkg>@<ver>` | `yarn upgrade <pkg>@<ver>` | `yarn up <pkg>@<ver>` | `pnpm add <pkg>@<ver>` |
| Refresh lockfile | `npm install` | `yarn install` | `yarn install` | `pnpm install` |

**Forbidden**, because they add a pin instead of a real fix or force a broken tree:

- `npm audit fix --force`
- `pnpm audit --fix` (it writes `pnpm.overrides`)
- Any hand-added `overrides`, `resolutions`, or `pnpm.overrides` entry.
- `--legacy-peer-deps` unless the project's CI already passes it.

## Fix strategy (the convention)

For each project, in sequence:

1. **Baseline.** Run the audit command and record the findings.
2. **Safe auto-fix (npm only).** Run `npm audit fix` (no `--force`). Yarn and pnpm have no non-override equivalent, so go straight to step 3.
3. **Resolve each remaining advisory.** Trace it with `<manager> why <pkg>`:
   - **Direct dependency** -> upgrade it to the patched range.
   - **Transitive** -> upgrade the *direct* dependency that pulls it in, until its tree resolves the patched version. In Cozy this parent is often a `cozy-*` / `twake-*` lib; bumping it follows `twake-frontend-lib-workflow`, and the real fix may be a new release of that lib.
   - **Neither clears it** -> Deferred. Do not add a resolution or override. Record the advisory, the dependency path from `why`, and the upstream lib that owes a fix.
4. **Confirm.** Refresh the lockfile and re-run the audit. Only deferred findings should remain.

## Verify

Run whichever scripts the project's `package.json` defines, in order:

```
lint -> typecheck -> build -> test
```

Skip scripts that are not defined. Skip `test` when it needs services (a running stack, CouchDB) that are not up locally, and note that in the PR.

If a check breaks because of one upgrade, roll back THAT upgrade and move the finding to Deferred.

## One PR per project

Follow `twake-git-conventions`. Never bundle multiple projects.

- Branch: `chore/audit-<project>`.
- Body bullets: patched count, upgraded packages with new versions, deferred findings (advisory, why no clean fix exists, upstream lib to chase).
- Keep the diff to audit-driven changes only. No incidental cleanup.
