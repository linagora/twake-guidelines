---
name: twake-drive-release
description: Release the linagora/twake-drive web app through its tag-driven GitHub Actions and cozy-app-publish workflow. Use when preparing or publishing the first beta for a stable target, publishing another sequential beta after fixes, promoting a tested beta to the final stable release, drafting release notes, or monitoring the resulting Drive registry publication.
---

# Release Twake Drive

Release Twake Drive through its `release/<stable-version>` branch and GitHub
release tags. Support three modes: first beta, another beta, and final stable.
Treat tag creation as an external deployment action.

## Approval gates

Work one approved step at a time unless the user explicitly approves a larger
group of steps. Pause before:

1. creating or pushing a release branch;
2. cherry-picking or committing a release fix;
3. creating a GitHub release or tag;
4. merging release fixes back into `master`.

Before a GitHub release, show the exact tag, target commit, prerelease flag, and
complete release notes. A request to prepare or inspect a release does not by
itself authorize tag creation.

## Preflight for every mode

1. Confirm the checkout is `linagora/twake-drive` and read, rather than assume:
   - the default branch from `origin/HEAD`;
   - `package.json` and `manifest.webapp` versions;
   - `.nvmrc` and the `packageManager` field;
   - `.github/workflows/ci-cd.yml` tag filters and publish command.
2. Require a clean worktree. Sync the relevant branch with its remote using a
   fast-forward-only pull.
3. Fetch current remote branch, tag, release, PR, and Actions state. Do not rely
   on stale local refs.
4. Require `package.json` and `manifest.webapp` to contain the same stable
   `x.y.z` version. Never put `-beta.n` in either file.
5. Use tags without a `v` prefix:
   - beta: `x.y.z-beta.n`;
   - stable: `x.y.z`.
6. Use the repository-pinned Yarn through Corepack. Run the CI gates in order:

   ```bash
   corepack yarn install --immutable
   corepack yarn lint
   corepack yarn test
   corepack yarn build
   ```

   Stop on a failing gate. Report warnings separately from failures. Confirm
   the worktree is still clean after validation.

## Release notes

Match the established GitHub release format:

```markdown
## What's Changed
* <PR title> by @<author> in <PR URL>

**Full Changelog**: <compare URL>
```

Use GitHub's release-note generator to obtain the complete PR and author list,
then remove `chore` PRs and test/E2E-only PRs. Preserve the remaining PR order.
Show the filtered result for approval before publishing. Use these comparison
ranges:

```bash
gh api --method POST repos/linagora/twake-drive/releases/generate-notes \
  -f tag_name=<new-tag> \
  -f target_commitish=<release-branch-or-commit> \
  -f previous_tag_name=<comparison-start-tag>
```

- first beta: previous stable tag to `x.y.z-beta.1`;
- another beta: previous beta tag to the next beta tag;
- final stable: previous stable tag to `x.y.z`.

If a `chore`-titled PR contains user-visible fixes, note its removal while
requesting approval so the user can choose to retain it.

## First beta

1. Determine the target stable version with SemVer: patch for fixes, minor for
   features, and at least minor for permission changes.
2. Confirm all intended PRs are in the latest `master`. List any current-branch
   commits that are not in `master`; do not assume they should be included.
3. Confirm that neither `release/x.y.z` nor `x.y.z-beta.1` already exists.
4. With approval, create `release/x.y.z` at the exact approved `master` commit
   and push it.
5. Explain that bumping `master` to the next stable target separates future
   development, but is not required to publish the beta. Only do it when the
   user approves.
6. Validate the release branch and prepare the approved notes.
7. Create the GitHub release with:

   ```bash
   gh release create x.y.z-beta.1 \
     --repo linagora/twake-drive \
     --target release/x.y.z \
     --title x.y.z-beta.1 \
     --prerelease \
     --notes-file <approved-notes-file>
   ```

8. Verify the release is not a draft, is marked prerelease, and its tag resolves
   to the approved commit.
9. Monitor the tag-triggered `CI/CD` run through completion. Verify install,
   lint, test, build, Downcloud upload, registry publication, and Mattermost
   notification. Report the Actions URL and conclusion.

## Another beta

1. Sync `release/x.y.z` and identify the greatest existing `x.y.z-beta.n`
   remote tag. The next beta must be `n + 1`; never move or reuse a tag.
2. Confirm which fixes belong in the beta. Release-branch commits must be bug
   fixes only.
3. If a fix exists only on `master`, cherry-pick the approved atomic commit onto
   `release/x.y.z`. If a fix is made on the release branch, plan to carry it back
   to `master` after release.
4. Validate the updated release branch.
5. Generate and approve notes comparing the previous beta with the new beta.
6. Create the next prerelease using the same command shape as the first beta,
   replacing the tag and title with `x.y.z-beta.<n+1>`.
7. Verify the tag target and monitor `CI/CD` publication.

## Final stable release

1. Require explicit confirmation that the beta has been accepted for stable
   production deployment. Stable registry releases can update production
   instances automatically.
2. Sync `release/x.y.z` and locate the latest tested beta tag.
3. Require the stable tag to point to the exact tested beta commit. If the
   release branch contains later code changes, publish and test another beta
   first.
4. Confirm the files still contain stable version `x.y.z` and run all validation
   gates again.
5. Generate and approve full release notes from the previous stable tag.
6. Create the stable GitHub release without `--prerelease`:

   ```bash
   gh release create x.y.z \
     --repo linagora/twake-drive \
     --target <tested-beta-commit> \
     --title x.y.z \
     --notes-file <approved-notes-file>
   ```

7. Verify the stable tag, release metadata, and `CI/CD` publication.
8. With approval, merge all release-branch fixes back into `master`. Do not
   delete the release branch until this is complete.

## Failure handling

- If validation or CI fails before publication, fix the release branch and use
  a new beta number. Never rewrite a published beta tag.
- If the Publish step fails, inspect Actions logs and determine whether the
  registry accepted the version before retrying. Do not delete or recreate a
  tag without explicit approval.
- Do not run `cozy-app-publish` manually from a workstation unless the user
  explicitly requests the documented manual recovery path.
- Do not create a stable release from untested changes.

The canonical publisher workflow is
https://github.com/linagora/cozy-libs/tree/master/packages/cozy-app-publish#release-workflow.
