---
name: migrate-to-twake-mui
description: Use when migrating one cozy-ui component to twake-mui / twake-ui (MUI v4 to MUI v9), or when the user runs /migrate-to-twake-mui <ComponentName>. Covers the Twake Library API revision, theme overrides, Storybook + Argos stories, and the single-component commit and PR.
---

# Migrate a cozy-ui component to twake-mui

**One invocation = one component = one commit = one PR.** If the user names several
components, do the first and say the others need their own invocation. Never batch.

**Input:** `/migrate-to-twake-mui <ComponentName> [extra guidelines]`.
Extra guidelines in the prompt override anything below.

## Core principle: migrating usually means deleting

`packages/twake-mui/src/index.ts` already does `export * from '@mui/material'`. Plain MUI is
therefore already exported and already themed. The cozy-ui component is an MUI v4 overload; the
Twake Library revision strips most of those props. So the ranked outcomes are:

1. **Nothing to write.** The revision says "remove everything" and the visual delta is covered
   by the palette/typography already in the theme. Report that, no PR.
2. **Theme only.** Add a `MuiXxx` entry to `src/lib/lightOverrides.tsx` (+ `darkOverrides.ts`
   if the dark render differs). No component file. This is the common case.
3. **Theme + thin wrapper.** Only when a prop needs JS: composing children, mapping a prop to a
   class, injecting a default `deleteIcon`. See `src/components/Chip/index.tsx` (~45 lines) for the
   ceiling on wrapper size.

A wrapper that only forwards props to MUI is a bug. Delete it and style through the theme.

## Step 1 — Decide whether to migrate at all

Read `references/api-revision.md`. Find the component.

- Listed as ❌ or ✅ (removed / to be removed) → **stop**. Report what replaces it (e.g. Spinner →
  `CircularProgress`, Banner → `Alert`/`SnackbarContent`, SelectBox → `TextField select`) and open
  no PR.
- Listed with props to drop → drop them. "Everything can be removed" means the wrapper goes away
  and consumers use plain MUI; keep only what the entry explicitly keeps.
- Not listed → migrate the MUI-equivalent behaviour only, drop cozy-specific props, and say so in
  the PR body.

Then check it is not already done. Components are often already covered under a *category* story
name (Checkbox lives in `Selection.stories.tsx`, TextField in `Input.stories.tsx`), so grep the
stories by component, never by filename:

```bash
cd packages/twake-mui
ls src/components/
grep -n "Mui<Name>" src/lib/lightOverrides.tsx src/lib/darkOverrides.ts
grep -rln "<Name>" src/stories/
```

Partial coverage is the normal starting point. Extend the existing override and the existing story
rather than adding a parallel one.

**Audit any existing override before building on it.** Check every value against the API revision
and MUI's own defaults, and confirm the rule still does what it looks like it does. A frequent case:
`styleOverrides.root` is applied *after* MUI's own `variants`, so a bare `color` or `padding` on
`root` silently replaces the whole `color` and `size` axis and every variant renders identically.
Judge from computed styles read back in Storybook, not from the CSS.

If the override does not correspond to the API revision, remove it, and make that removal the
**first commit**, subject only, no body:

```
fix(twake-mui): Clean old <Component> override
```

Then build the correct override in the next commit. Keep the two apart so the removal stays
reviewable on its own.

## Step 2 — Read the two sources

| Source | Where |
|---|---|
| cozy-ui implementation | `react/<Name>/index.jsx` + `Readme.md`, and `stylus/components/*<name>*` in a [cozy-ui](https://github.com/cozy/cozy-ui) checkout |
| MUI v9 API | `references/mui-v4-to-v9.md`, then https://mui.com/material-ui/llms.txt when unsure |

## Step 3 — Implement

Work in a [twake-ui](https://github.com/linagora/twake-ui) checkout, Node 24 (`nvm use`), branch cut from the synced default branch
(`twake-start` conventions): `git checkout -b feat/<name>-twake-mui`.

- **Theme:** `packages/twake-mui/src/lib/lightOverrides.tsx`, keys in `Mui<Name>` order matching
  the file. Use `radius` from `src/lib/radius`, `paletteData` from `palette.json`, and MUI
  `variants: [{ props, style }]` inside `styleOverrides.root` rather than a prop-driven class,
  whenever the switch is on a real MUI prop. Reserve `'&.<class>'` selectors for props MUI does not
  have (see `MuiChip` `.square`).
- **Ask when the revision and MUI disagree.** The revision names props by intent, MUI by its own
  prop names, and they do not always line up: the names can match while the values do not, or the
  behaviour can exist under a different prop. When a variant or state has no unambiguous MUI
  counterpart, stop and ask the user which mapping they want, giving the options and what each
  costs. Do not pick one silently. Which prop a state answers to is an API decision for every
  consuming app, not a styling detail, and a wrong guess is invisible in the screenshots because
  the pixels still match. Example: `text.secondary` (grey) reads like MUI's `color="secondary"`,
  which actually resolves to `palette.secondary.main` (blue); MUI's grey is `color="default"`.
- **Write only the delta.** Before adding any variant, read what MUI already does for that
  component and keep only the declarations that differ from it. The installed source is the
  authority, not memory or the docs:
  ```bash
  sed -n '1,200p' node_modules/@mui/material/<Name>/<Name>.js | grep -n "padding\|fontSize\|color\|variants\|props:"
  ```
  MUI's defaults are often already the revised value, and a redundant variant reads as a
  deliberate deviation while pinning a value MUI would otherwise keep in step.
- **Express sizes the way MUI does.** MUI states font sizes in rem via
  `theme.typography.pxToRem(n)` so they scale with the reader's browser font size. Hardcoding
  `'20px'` drops that, and mixing the two leaves some sizes scaling and others frozen. Use
  `pxToRem` for font sizes; padding stays in px like the rest of the file.
- **Dark mode:** `src/lib/darkOverrides.ts` is a bare `merge({}, lightOverrides)`, so every value
  you add applies to the dark theme too. `theme.palette.*` flips on its own and needs nothing; a
  literal colour from `palette.json` (a near-black border, a near-white fill) does not, and will be
  invisible on the other background. Add its counterpart as a second `merge` argument in the same
  commit, and render the dark story before claiming it works. Read the file first: it holds no
  dark-specific block today, so you may be the one introducing it.
- **Wrapper (only for outcome 3 of the core principle):** `src/components/<Name>/index.tsx`, default + named export,
  props interface extending the MUI props, `cx` from `classnames` for class merging.
- **Export:** add to `src/index.ts` under `// COMPONENTS & HELPERS` and its type under `// TYPES`.
  Skip this if there is no wrapper.

## Step 4 — Stories

`src/components/<Name>/<Name>.stories.tsx` for a wrapper, `src/stories/<Name>.stories.tsx` for a
theme-only override. Two stories, both required:

- **`Default`** — for humans. `tags: ['autodocs']` on the meta, `argTypes` with controls for every
  prop that survived the revision.
- **`Screenshot`** — for Argos. `tags: ['argos']`. One render covering every variant, size and state
  in `<section>`s. `.storybook/preview.tsx` runs it in 4 modes (desktop/mobile × light/dark), so do
  not write per-mode stories.

Copy the shape from `src/components/Avatar/Avatar.stories.tsx`.

**Cover at least what cozy-ui documented.** Read the component's cozy-ui docs page
(`https://docs.cozy.io/cozy-ui/react/#/<Name>`, and its `Readme.md`) and list the examples it
shows. Every one of them needs an equivalent in the stories, minus the props the revision dropped.
A consumer migrating comes to Storybook looking for the usage they already know, and an example
that disappears reads as a feature that disappeared.

## Step 5 — Verify before claiming anything

```bash
# from the twake-ui repo root
npm run lint --workspace=@linagora/twake-mui
npm run build --workspace=@linagora/twake-mui
```

Both must pass. **Never run `npm run release`** — it publishes to npm for real.

Prettier runs inside eslint, so fix formatting with `npx eslint <your files> --fix` rather than
hand-reflowing JSX.

If lint or build fails on files you never touched (`error typed value`, `@linagora/twake-icons has
no exported member ...`), the checkout's `node_modules` is stale, not your code. `npm ci` at the
repo root, then re-run; do not "fix" unrelated files. If failures remain, prove they are
pre-existing rather than asserting it: `git stash && npm run lint ... ; git stash pop`, compare the
counts, and report the baseline.

Visual check against cozy-ui: screenshot `https://docs.cozy.io/cozy-ui/react/#/<Name>` with the
`claude-in-chrome` skill and compare it with the Storybook render. Differences are expected
wherever the revision removed a prop; anything else is a regression. State the intentional
differences in the PR body.

Argos itself runs in CI on the PR (`npm run screenshots` locally needs `ARGOS_TOKEN`, do not
bother). Baselines land when the PR is opened.

## Step 6 — Commit and PR

`twake-git-conventions` applies. Conventional Commits, and note the repo commitlint rule:
**subject in Sentence case**.

One PR, and up to three commits, each atomic and in this order. Only the middle one is always
present:

1. `fix(twake-mui): Clean old <Component> override` — subject only, no body. Present when step 1
   found an existing override that does not match the API revision.
2. `feat(twake-mui): Align <Component> with the Twake API revision` — the migration itself: the
   override, the type augmentation if any, and the component's own story.
3. `chore(twake-mui): ...` — updates to *other* components' stories that your change forced. A
   shared override moves every consumer, so when another story has to change to stay correct, it
   goes in its own commit, never folded into the migration. That keeps the migration diff readable
   and lets the collateral be reverted on its own.

`feat` for a new component or override, `feat!` / `BREAKING CHANGE:` when the revision drops props
consumers use. multi-semantic-release derives the published version from this.

**Write the why, not the what.** This governs commit bodies and the PR body alike. The diff already
states what changed and how, and restating it in prose is noise. What the diff cannot show is the
context: why this needed doing, what was wrong before, why a non-obvious approach was chosen over
the obvious one. Write that, in as few sentences as it takes. A commit whose change is
self-evident needs no body at all.

Then `gh pr create`, title lowercase and under 70 chars. A few short paragraphs of plain prose.
**Never write a "Summary" heading**, or any heading: the body is short enough not to need one.
This overrides the Summary-only wording in `twake-git-conventions`. No invented motivation, no
em dashes, no tables.

The PR body is not a work log. Leave out the dropped props (the revision already records them),
the stories, and the checks you ran. The diff shows the first two and CI shows the third. Report
those to the user in chat instead.
