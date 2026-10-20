---
name: twake-drive-release
description: Prepare and publish linagora/twake-drive releases with the cozy-app-release CLI and its tag-driven GitHub Actions workflow. Use for first or subsequent betas, stable promotion, release notes, and monitoring registry publication.
---

# Release Twake Drive

Use [cozy-app-release](https://github.com/linagora/twake-tools/tree/main/cozy-app-release)
to publish Twake Drive through its `release/<stable-version>` branch and GitHub
release tags. Support first beta, another beta, and final stable releases.
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

The CLI bundles branch creation, tag push, GitHub release creation, and an
optional development-version bump. Obtain approval for the whole selected
operation, including the next version or `skip`, before confirming it. Reuse
approval already given for that exact operation.

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

## Publishing with cozy-app-release

Use Node 24 or later and an authenticated `gh`. Prefer a clean checkout of
`linagora/twake-tools` synced to its default branch, with dependencies installed
using `npm ci` in `cozy-app-release/`. The `npx` wrapper can retain an older
copy in `~/.twake-tools-cache`; a fresh wrapper download does not refresh it.

Save the approved notes outside the app worktree, then run the CLI from the
app repository in an interactive terminal:

```bash
node /absolute/path/to/twake-tools/cozy-app-release/bin/cozy-app-release.js \
  --notes-file /absolute/path/to/approved-release-notes.md
```

The tool reads the notes before switching branches and publishes them unchanged.
It does not run the app's validation gates; finish preflight first. Do not
pre-create a first-beta branch or tag, since the tool creates both.

The CLI updates its detected base branch before showing the menu and offers
only its latest release branch. Verify the displayed base matches `origin/HEAD`
and the offered release branch matches the intended target. While at the menu,
recheck the target branch's commit against the approved, validated commit.
If it changed, quit and revalidate before publishing. For subsequent betas or
stable releases, sync the local release branch with its remote beforehand;
the CLI only checks it out, without pulling it.

If the CLI cannot select the intended branch, quit and use the manual fallback
below for that approved target. Never select a different release to proceed.

## Release notes

Write a short, grouped changelog in plain developer language. Explain what
users can do and what was fixed, without implementation details or copied PR
titles. Match this structure, omitting empty sections:

```markdown
Releasing Twake Drive <version> for beta testing:

## New features

### Shared drives

- You can share a folder inside an already shared folder. ([#123](<PR URL>))

### Files and folders

- You can create a destination folder while moving files. ([#124](<PR URL>))

## Security

- Unsafe links in shortcuts are blocked. ([#125](<PR URL>))

## Bug fixes

- Fixed folders not opening after sharing was removed. ([#126](<PR URL>))

**Full Changelog**: <compare URL>
```

For stable releases, use "to production" in the opening line. Choose feature
subsections from the actual changes, such as Shared drives, AI assistant,
Twake Space, or Languages. Keep descriptions short, combine related changes,
and end each item with linked PR numbers. Omit author credits, dependency
versions, internal function names, and build-tool details. Mention conditions
that affect availability, such as a feature needing to be enabled.

Use GitHub's release-note generator as the source PR list, then inspect PR
contents where needed. Omit maintenance, tooling, and test/E2E-only changes.
Keep user-visible fixes and security changes even when their PR title starts
with `chore` or `test`. Group by topic rather than merge order, and describe
each change once. Include only changes present in the release target; do not
copy features from a reference release or include unmerged PRs.

Show the complete notes for approval before publishing a new release. Use
these comparison ranges:

```bash
gh api --method POST repos/linagora/twake-drive/releases/generate-notes \
  -f tag_name=<new-tag> \
  -f target_commitish=<release-branch-or-commit> \
  -f previous_tag_name=<comparison-start-tag>
```

- first beta: previous stable tag to `x.y.z-beta.1`;
- another beta: previous beta tag to the next beta tag;
- final stable: previous stable tag to `x.y.z`.

When asked to amend an existing release's notes, read its current body and
metadata, then update only the body with `gh release edit <tag> --repo
linagora/twake-drive --notes-file <notes-file>`. The amendment request
authorizes this edit. Verify the saved body and that the tag target and
draft/prerelease flags are unchanged; do not recreate the tag or republish.

## First beta

1. Determine the target stable version with SemVer: patch for fixes, minor for
   features, and at least minor for permission changes.
2. Confirm all intended PRs are in the latest `master`. List any current-branch
   commits that are not in `master`; do not assume they should be included.
3. Confirm that neither `release/x.y.z` nor `x.y.z-beta.1` already exists.
4. Validate the exact `master` commit to release and prepare the approved notes.
5. Agree on the next development version for `master`, or `skip` to leave it
   unchanged. The CLI suggests the next minor version but accepts any greater
   stable version. Bumping separates future development from the release.
6. Run the CLI with the notes file, select **New beta**, and enter the approved
   development version or `skip`. It creates and pushes `release/x.y.z` and
   `x.y.z-beta.1`, publishes the prerelease, then applies any selected bump to
   `master` with a normal push.
7. Verify the release is not a draft, is marked prerelease, and its tag resolves
   to the approved commit.
8. Monitor the tag-triggered `CI/CD` run through completion. Verify install,
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
4. Validate the updated release branch and push any approved fixes. Confirm
   local and remote release heads match the validated commit.
5. Generate and approve notes comparing the previous beta with the new beta.
6. Run the CLI with the approved notes, select **Add beta** for the intended
   release branch, and confirm the exact next beta tag.
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
6. Confirm the local and remote release branch heads both equal the tested beta
   commit. Run the CLI with the approved notes, select **Final release** for
   that branch, and confirm the stable version. It publishes without the
   prerelease flag.

7. Verify the stable tag, release metadata, and `CI/CD` publication.
8. With approval, merge all release-branch fixes back into `master`. Do not
   delete the release branch until this is complete.

## Manual fallback

For an approved target the CLI cannot select, create and push the release
branch if this is a first beta, then use `gh release create <tag> --repo
linagora/twake-drive --target <approved-commit> --title <tag> --notes-file
<approved-notes-file>`, adding `--prerelease` for betas only. Apply the same
validation, approval, tag verification, and CI monitoring as the CLI path.
Do not bypass a failed validation gate or failed CLI operation with this path.

## Failure handling

- If the CLI fails, inspect remote tags, the GitHub release, and Actions before
  retrying. A development-version push can fail after the beta was already
  published; complete only the missing bump rather than creating another tag.
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
