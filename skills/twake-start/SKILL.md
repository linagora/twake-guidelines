---
name: twake-start
description: Use when starting work on a new task or ticket in a Linagora/Twake/Cozy project and you need a clean branch off the up-to-date default branch. Checks whether the current branch/uncommitted changes belong to the same subject before touching anything, commits any unrelated pending work first, syncs the repo's default branch (main or master, detected, never assumed), pulls latest, then cuts a feat/fix/chore branch named per Twake git conventions before any code is written.
---

# Start a task on a clean branch (Twake / Linagora)

Apply at the very beginning of a task, before writing any code, to land on a fresh branch cut from an up-to-date default branch. Branch naming and commit/PR rules that follow come from `twake-git-conventions`.

## Steps

0. **Check the working tree matches the task before touching anything.** Run `git status --short` and note the current branch.
   - If the repo is clean and already on the default branch, skip to step 1.
   - If there is uncommitted code (staged or not) or the current branch belongs to a different subject than the task about to start, **do not build the new task on top of it**. Commit the pending work as-is on its current branch first (an atomic commit per `twake-git-conventions` — do not stash it away or discard it), then proceed to step 1 for a clean branch.
   - If the uncommitted code or current branch **is** the same subject as the task (a continuation of the same feature/fix), stay on it and skip step 1-3 — keep working there instead of cutting a new branch.

   This avoids mixing two unrelated features/fixes into the same branch or commit.

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
