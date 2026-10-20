---
name: twake-app-release
description: Prepare and publish Cozy/Twake web app releases, including Drive, Home, and Notes, with cozy-app-release and tag-driven cozy-app-publish workflows. Use for first or subsequent betas, stable promotion, release notes, and monitoring registry publication. Excludes libraries, mobile apps, and cozy-stack.
---

# Release a Cozy/Twake App

Use [cozy-app-release](https://github.com/linagora/twake-tools/tree/main/cozy-app-release)
to publish compatible Cozy/Twake web apps through `release/<stable-version>`
branches and GitHub release tags. Drive, Home, and Notes use this workflow;
verify compatibility for each selected repository before publishing. Support
first beta, another beta, and final stable releases. Treat tag creation as an
external deployment action.

## Approval gates

Work one approved step at a time unless the user explicitly approves a larger
group of steps. Pause before:

1. creating or pushing a release branch;
2. cherry-picking or committing a release fix;
3. creating a GitHub release or tag;
4. merging release fixes back into the default branch.

Before a GitHub release, print the exact tag, target commit, prerelease flag,
planned branch/version changes, and complete release notes in a normal
conversation message. Then ask a short question such as "Publish <tag> with
these notes?" with **Yes** / **No** options. Keep the notes and detailed plan
out of the approval prompt. Wait for an explicit answer; No leaves the release
prepared without publishing. A request to prepare or inspect a release does
not by itself authorize tag creation.

The CLI bundles branch creation, tag push, GitHub release creation, and an
optional development-version bump. Obtain approval for the whole selected
operation, including the next version or `skip`, before confirming it. Reuse
approval already given for that exact operation.

## Preflight for every mode

1. Identify the selected app from the user's request and the checkout's Git
   remote. Record `<owner/repo>`, the app name, registry slug from
   `manifest.webapp`, and default branch from GitHub repository metadata
   (check `origin/HEAD` agrees). Use these values throughout; do not infer the
   repository from the local directory name or reuse another app's slug.
2. Read the app's local release instructions, `package.json`, `manifest.webapp`,
   Node and package-manager configuration, lockfile, and publishing workflows
   under `.github/workflows/`. Follow reusable workflows at their pinned ref
   and inspect the publish script and configured pre/post-publish hooks.
3. Verify this workflow fits: both version files contain the same stable
   `x.y.z`, releases use `release/x.y.z`, and tag filters publish `x.y.z-beta.n`
   and `x.y.z` through `cozy-app-publish`. Tags have no `v` prefix; never put
   `-beta.n` in either version file. Check recent release history as well.
   If the app uses a different scheme or publisher, explain the mismatch and
   follow its documented release process; do not force this CLI onto it.
4. Require a clean worktree. Fetch current remote branch, tag, release, PR, and
   Actions state, then sync the relevant branch with a fast-forward-only pull.
5. Use the app's configured Node and package-manager versions to run its CI
   validation commands in order, including any app-specific checks. Derive
   these from the scripts and workflows rather than copying Drive's commands.
   For example, Yarn Classic uses `yarn install --frozen-lockfile`, while
   modern Yarn uses `yarn install --immutable`; use Corepack when configured.
   Stop on a failing gate, report warnings separately, and confirm the worktree
   is still clean. Keep local validation separate from CI's publish command.

## Publishing with cozy-app-release

Run the release tool with Node 24 or later and an authenticated `gh`; the app
may require a different Node version for validation. Prefer a clean checkout of
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
Releasing <app name> <version> for beta testing:

## New features

### <Feature area>

- <What the user can now do>. ([#123](<PR URL>))

## Security

- <What is now protected>. ([#124](<PR URL>))

## Bug fixes

- Fixed <problem and when it happened>. ([#125](<PR URL>))

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
gh api --method POST repos/<owner/repo>/releases/generate-notes \
  -f tag_name=<new-tag> \
  -f target_commitish=<release-branch-or-commit> \
  -f previous_tag_name=<comparison-start-tag>
```

- first beta: previous stable tag to `x.y.z-beta.1`;
- another beta: previous beta tag to the next beta tag;
- final stable: previous stable tag to `x.y.z`.

When asked to amend an existing release's notes, read its current body and
metadata, then update only the body with `gh release edit <tag> --repo
<owner/repo> --notes-file <notes-file>`. The amendment request
authorizes this edit. Verify the saved body and that the tag target and
draft/prerelease flags are unchanged; do not recreate the tag or republish.

## First beta

1. Determine the target stable version with SemVer: patch for fixes, minor for
   features, and at least minor for permission changes.
2. Confirm all intended PRs are in the latest default branch. List any commits
   on the current branch that are absent from it; do not assume they belong.
3. Confirm that neither `release/x.y.z` nor `x.y.z-beta.1` already exists.
4. Validate the exact default branch commit to release and prepare the approved
   notes.
5. Agree on the next development version for the default branch, or `skip` to
   leave it unchanged. The CLI suggests the next minor version but accepts any
   greater stable version. Bumping separates future development from the release.
6. Run the CLI with the notes file, select **New beta**, and enter the approved
   development version or `skip`. It creates and pushes `release/x.y.z` and
   `x.y.z-beta.1`, publishes the prerelease, then applies any selected bump to
   the default branch with a normal push.
7. Verify the release is not a draft, is marked prerelease, and its tag resolves
   to the approved commit.
8. Monitor the app's tag-triggered publishing workflow through completion.
   Verify its validation gates, registry publication for the selected slug and
   version, and configured hooks such as Downcloud upload or Mattermost
   notification. Report the Actions URL and conclusion.

## Another beta

1. Sync `release/x.y.z` and identify the greatest existing `x.y.z-beta.n`
   remote tag. The next beta must be `n + 1`; never move or reuse a tag.
2. Confirm which fixes belong in the beta. Release-branch commits must be bug
   fixes only.
3. If a fix exists only on the default branch, cherry-pick the approved atomic
   commit onto `release/x.y.z`. If a fix is made on the release branch, plan to
   carry it back to the default branch after release.
4. Validate the updated release branch and push any approved fixes. Confirm
   local and remote release heads match the validated commit.
5. Generate and approve notes comparing the previous beta with the new beta.
6. Run the CLI with the approved notes, select **Add beta** for the intended
   release branch, and confirm the exact next beta tag.
7. Verify the tag target and monitor the app's publishing workflow.

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
7. Verify the stable tag, release metadata, and the app's registry publication.
8. With approval, merge all release-branch fixes back into the default branch.
   Do not delete the release branch until this is complete.

## Manual fallback

For an approved target the CLI cannot select, create and push the release
branch if this is a first beta, then use `gh release create <tag> --repo
<owner/repo> --target <approved-commit> --title <tag> --notes-file
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
