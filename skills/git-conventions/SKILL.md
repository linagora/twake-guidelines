---
name: git-conventions
description: Use when writing commit messages, creating branches, or opening pull requests on Linagora/Twake/Cozy projects. Enforces Conventional Commits, one subject per commit (atomic commits), a structured PR workflow (branch, commit, push, gh pr create), lowercase PR titles under 70 chars, and Summary-only PR bodies with no invented motivation and no em dashes.
---

# Git Conventions (Twake / Linagora)

Apply these rules when committing code, writing commit messages, branching, or opening pull requests.

## Commit message format

Use **Conventional Commits**:

```
type(scope): subject line in imperative mood

Body explaining WHY this change is needed, when the reason is
known and non-obvious from the diff. Wrap body lines at 72
characters.

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

- **Subject in imperative mood**: "add pagination", not "added" or "adds".
- **Body explains WHY when the reason is known and non-obvious.** If the diff speaks for itself, a subject alone is enough.
- **Do not invent motivation.** If you do not know *why* the change is happening, state the *what* plainly instead of manufacturing a rationale.
- **Wrap body at 72 chars per line**.
- **Breaking changes** must include a `BREAKING CHANGE:` footer with migration guidance.

## Atomic commits: one subject per commit

A commit must handle **exactly one subject**. Multiple concerns in a single commit make the change hard to review, hard to merge, and hard to revert.

- **Each dependency upgrade = its own commit.** Never bundle multiple dep bumps.
- **Do not mix** refactor + feature + fix in one commit.
- **Do not mix** unrelated files, even for small changes.
- Prefer many small commits over one large commit.

If the commit subject needs the word "and" to describe the change, split the commit.

## Branches

- Feature branches: `feat/short-description`
- Fixes: `fix/short-description`
- Chores: `chore/short-description`
- Never force-push to `main` / `master`.
- `main` must always be production-ready. Use feature flags for unreleased work.

## Pull Requests

Pull requests must be as atomic as possible: one concern per PR, mirroring the atomic-commit rule at a larger granularity.

### Workflow

Every PR goes through the same mechanical steps:

1. Run `git diff` and `git status` to understand every change in scope.
2. Create a branch named `feat/...`, `fix/...`, or `chore/...` matching the nature of the change.
3. Stage the relevant files and commit with a clear message.
4. Publish the branch with `git push -u origin <branch>`.
5. Open the PR with `gh pr create --title "..." --body "..."`.

### Title

- **Under 70 characters.**
- **Lowercase.**
- Short and direct. A Conventional Commits prefix is fine (`feat: ...`, `fix: ...`) when it fits.

### Body

Only one section: `## Summary`, followed by concise bullets. Write like a human. Focus on *why* only when the reason is genuinely known.

**Do not include:**
- Test plan sections.
- File lists or checkbox checklists.
- Em dashes, long dashes, or double dashes (`—`, `–`, `--`).
- Walls of text or implementation details.
- References to stakeholders, reviewers, or decisions not visible in the diff (no "as discussed", "per CTO review", "requested by team").
- Invented motivation.

### Scope (strict)

The PR body describes **only what the current diff changes**. Nothing else.

- Never pull context from memory, `CLAUDE.md`, `AGENTS.md`, or prior conversations, not even for motivation.
- Never quote or paraphrase text from other conversations, in any language.
- If the *why* is not evident from the code or commit, state the *what* plainly.
- When in doubt, keep the bullet literal to the diff.

## Examples

### Commit subjects

```
✅ feat(auth): add passwordless magic-link login
✅ fix(calendar): prevent duplicate events on timezone change
✅ chore(deps): upgrade react-query from 4.2 to 4.3

❌ Updated stuff
❌ fix: bug
❌ feat: add login and fix navbar and update deps
```

### PR title

```
✅ feat: add passwordless magic-link login
✅ fix(calendar): prevent duplicate events on timezone change
✅ chore: upgrade react-query to 4.3

❌ Feature: Add Passwordless Magic-Link Login to the Auth Flow   (too long, wrong case)
❌ WIP: stuff                                                    (vague)
```

### PR body (good example)

```
## Summary

- Add `fetchMagicLink` helper that posts to `/auth/magic-link`.
- Wire the `/login` route to render `MagicLinkForm` when the feature flag is on.
- Add `magicLink` feature flag defaulting off.
```

### PR body (bad example)

```
## Summary

- Adds a new login feature as discussed with the CTO last week.
- Users have been asking for this for months, so this ships it.
- This rewrites the entire auth flow and also fixes several bugs.

## Test plan

- [ ] Login works
- [ ] Logout works
```

Problems with the bad example: invented stakeholder motivation, context from outside the diff, multiple concerns in one PR, a test plan section, a checklist.
