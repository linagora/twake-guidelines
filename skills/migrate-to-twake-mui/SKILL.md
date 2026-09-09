---
name: migrate-to-twake-mui
description: Use when migrating one cozy-ui component to twake-mui / twake-ui (MUI v4 to MUI v9), or when the user runs /migrate-to-twake-mui <ComponentName>. Covers the theme overrides, the Storybook + Argos stories ported from the cozy-ui doc, and the single-component commit and PR.
---

# Migrate a cozy-ui component to twake-mui

**One invocation = one component = one commit = one PR.** If the user names several
components, do the first and say the others need their own invocation. Never batch.

**Input:** `/migrate-to-twake-mui <ComponentName> [extra guidelines]`.
Extra guidelines in the prompt override anything below.

**The goal:** the component renders the same as it does in the cozy-ui doc, and every example
that doc shows exists as a Storybook example. Nothing more.

## Core principle: migrating usually means deleting

`packages/twake-mui/src/index.ts` already does `export * from '@mui/material'`. Plain MUI is
therefore already exported and already themed, and MUI v9 already answers most of what the
cozy-ui component added on top of MUI v4. So the ranked outcomes are:

1. **Nothing to write.** Plain MUI already renders like cozy-ui, because the palette and
   typography in the theme already cover the delta. Report that, no PR.
2. **Theme only.** Add a `MuiXxx` entry to `src/lib/lightOverrides.tsx` (+ `darkOverrides.ts`
   if the dark render differs). No component file. This is the common case.
3. **Theme + thin wrapper.** Only when reproducing the cozy-ui render needs JS: composing
   children, mapping a prop to a class, injecting a default `deleteIcon`. See
   `src/components/Chip/index.tsx` (~45 lines) for the ceiling on wrapper size.

A wrapper that only forwards props to MUI is a bug. Delete it and style through the theme.

## Step 1 — Check what already exists

Components are often already covered under a *category* story name (Checkbox lives in
`Selection.stories.tsx`, TextField in `Input.stories.tsx`), so grep the stories by component,
never by filename:

```bash
cd packages/twake-mui
ls src/components/
grep -n "Mui<Name>" src/lib/lightOverrides.tsx src/lib/darkOverrides.ts
grep -rln "<Name>" src/stories/
```

Partial coverage is the normal starting point. Extend the existing override and the existing story
rather than adding a parallel one.

**Audit any existing override before building on it.** Check every value against the cozy-ui
render and MUI's own defaults, and confirm the rule still does what it looks like it does.

If the existing override is wrong rather than incomplete, remove it, and make that removal the
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
- **cozy-ui is the source of truth; carry over whatever MUI lacks.** When cozy-ui has a size,
  variant, state or default that MUI v9 has no equivalent for, add it and keep going.
- **Write only the delta.** Before adding any variant, read what MUI already does for that
  component and keep only the declarations that differ from it. The installed source is the
  authority, not memory or the docs:
  ```bash
  sed -n '1,200p' node_modules/@mui/material/<Name>/<Name>.js | grep -n "padding\|fontSize\|color\|variants\|props:"
  ```
  MUI's defaults are often already the cozy-ui value, and a redundant variant reads as a
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
  prop.
- **`Screenshot`** — for Argos. `tags: ['argos']`. One render covering every variant, size and state
  in `<section>`s. `.storybook/preview.tsx` runs it in 4 modes (desktop/mobile × light/dark), so do
  not write per-mode stories.

Copy the shape from `src/components/Avatar/Avatar.stories.tsx`.

**Port every example the cozy-ui doc shows.** Read the component's cozy-ui docs page
(`https://docs.cozy.io/cozy-ui/react/#/<Name>`, and its `Readme.md`) and list the examples it
shows. Every one of them needs an equivalent in the stories.

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

**Visual check against cozy-ui.** Screenshot `https://docs.cozy.io/cozy-ui/react/#/<Name>` with the
`claude-in-chrome` skill and compare it example by example with the Storybook render. The two
should look the same. Any difference is a regression until you can say why it is not, and any
difference you keep goes in the PR body.

Argos itself runs in CI on the PR (`npm run screenshots` locally needs `ARGOS_TOKEN`, do not
bother). Baselines land when the PR is opened.

## Step 6 — Commit and PR

`twake-git-conventions` applies. Conventional Commits, and note the repo commitlint rule:
**subject in Sentence case**.

One PR, and up to three commits, each atomic and in this order. Only the middle one is always
present:

1. `fix(twake-mui): Clean old <Component> override` — subject only, no body. Present when step 1
   found an existing override that was wrong.
2. `feat(twake-mui): Migrate <Component> from cozy-ui` — subject only, no body. The migration
   itself: the override, the type augmentation if any, and the component's own story. That the
   migration migrated the component is the subject line's job; do not restate it in a body.
3. `chore(twake-mui): ...` — updates to *other* components' stories that your change forced. A
   shared override moves every consumer, so when another story has to change to stay correct, it
   goes in its own commit, never folded into the migration. That keeps the migration diff readable
   and lets the collateral be reverted on its own.

**Never explain the what or the how — only the why and the context.** This governs commit bodies
and the PR body alike. The diff already states what changed and how it works, and a prose replay of
it is noise, however well written. What the diff cannot show is why this needed doing, what was
wrong before, or why a non-obvious approach beat the obvious one. Nothing else earns a sentence.

Default to no body at all. A body is the exception, for the rare case where the why is genuinely
not guessable from the subject and the diff.

Then `gh pr create`, title under 70 chars. **Keep the body short: three short
sentences at the outside, and fewer whenever fewer will do.** Plain prose, no headings at all and
never a "Summary" heading (this overrides the Summary-only wording in `twake-git-conventions`), no
invented motivation, no em dashes, no tables.

If a paragraph describes the override you wrote, the props you mapped, the values you picked, or how
the theme resolves them, delete it. Same for the stories and the checks you ran: the diff shows the
first, CI shows the second. Report all of that to the user in chat instead.
