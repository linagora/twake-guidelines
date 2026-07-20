---
name: twake-start
description: Use when starting work on a new task or ticket in a Linagora/Twake/Cozy project and you need a clean branch off the up-to-date default branch. Syncs the repo's default branch (main or master, detected, never assumed), pulls latest, then cuts a feat/fix/chore branch named per Twake git conventions before any code is written.
---

# Start a task on a clean branch (Twake / Linagora)

Apply at the very beginning of a task, before writing any code, to land on a fresh branch cut from an up-to-date default branch. Branch naming and commit/PR rules that follow come from `twake-git-conventions`.

## Steps

1. **Detect the default branch.** Never assume `main`; Twake and upstream Cozy repos are a mix of `main` and `master`. Read it from the remote:
   ```bash
   git remote set-head origin --auto >/dev/null 2>&1
   DEFAULT_BRANCH=$(git symbolic-ref --short refs/remotes/origin/HEAD | sed 's@^origin/@@')
   ```
   `set-head --auto` queries `origin` and records its default branch locally, so the `symbolic-ref` read is exact even if it was stale. If `DEFAULT_BRANCH` is empty (no `origin` configured), fall back to the current branch: `DEFAULT_BRANCH=$(git rev-parse --abbrev-ref HEAD)`.

2. **Sync it.** Switch to the default branch and pull latest so the new branch starts from production-ready code:
   ```bash
   git checkout "$DEFAULT_BRANCH" && git pull
   ```

3. **Cut the working branch.** Name it per `twake-git-conventions`: `feat/`, `fix/`, or `chore/` prefix matching the nature of the task, lowercase kebab-case, short:
   ```bash
   git checkout -b <prefix>/<short-description>
   ```

4. **Begin the task.** Start working immediately. Commit atomically and open the PR following `twake-git-conventions`.
