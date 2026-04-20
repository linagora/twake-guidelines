---
name: git-conventions
description: Use when writing commit messages, creating branches, or preparing pull requests in Twake/Linagora projects. Enforces Conventional Commits format, per-dependency-upgrade commits, and PR checklist requirements.
---

# Git Conventions (Twake / Linagora)

Apply these rules whenever you are committing code, writing commit messages, or opening pull requests.

## Commit message format

Use **Conventional Commits**:

```
type(scope): Subject line in present tense

Body explaining WHY this change is needed, not what it does.
Wrap body lines at 72 characters.

BREAKING CHANGE: describe the break and migration path.
```

### Allowed types

| Type | When to use |
|---|---|
| `feat` | A new feature visible to users |
| `fix` | A bug fix |
| `docs` | Documentation only |
| `style` | Formatting, whitespace, no logic change |
| `refactor` | Restructuring without behavior change |
| `test` | Adding or updating tests |
| `chore` | Build, tooling, dependencies |

### Rules

- **Subject in imperative mood**: "Add pagination", not "Added" or "Adds".
- **Body explains WHY**, not WHAT — the diff already shows what.
- **Wrap body at 72 chars per line**.
- **Breaking changes** must have a `BREAKING CHANGE:` footer with migration guidance.

## One atomic change per commit

- **Each dependency upgrade = its own commit.** Never bundle multiple dep bumps.
- Prefer many small commits over one large commit — easier to review, easier to revert.
- Don't mix refactor + feature + fix in the same commit.

## Branches

- Feature branches: `feat/short-description`
- Fixes: `fix/short-description`
- Never force-push to `master` / `main`.
- `master` must always be production-ready — use feature flags for unreleased work.

## Pull Request checklist

Before marking a PR ready for review, verify:

- [ ] Mockups integrated faithfully across mobile, tablet, desktop
- [ ] Tested in responsive mode on at least Chrome + Firefox
- [ ] Localization updated in **both** English and French
- [ ] Tests added or updated, coverage not regressed
- [ ] README updated if behavior or setup changed
- [ ] CHANGELOG entry added
- [ ] Feature flag added if the feature is not ready to ship

## Examples

```
✅ feat(auth): Add passwordless magic-link login

   Users reported friction with the current password reset flow.
   Magic links reduce support tickets and align with the Twake
   mobile app which already uses this pattern.

✅ fix(calendar): Prevent duplicate events on timezone change

✅ chore(deps): Upgrade react-query from 4.2 to 4.3

❌ Updated stuff
❌ fix: bug
❌ feat: add login and fix navbar and update deps
```
