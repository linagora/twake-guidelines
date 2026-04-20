# Twake Guidelines — Agent Rules

Linagora Twake / Cozy coding conventions for AI coding agents. This file aggregates every convention so that agents reading a single rules file (like [OpenCode](https://opencode.ai) via `AGENTS.md`) pick up all rules at once.

> **Claude Code users:** do not load this file directly. Install the plugin instead (`/plugin install twake-guidelines@twake-guidelines`) — skills are auto-triggered per context, which keeps each prompt lean.
>
> **Source of truth:** the per-skill files under `skills/*/SKILL.md`. This `AGENTS.md` is the aggregated view for tools that prefer one flat rules file. Edit the skill files first, then regenerate this aggregate.

---

## JavaScript Conventions

Apply these rules when writing or modifying JavaScript or TypeScript in any Twake or Cozy project.

### Async code

**Use `async` / `await`, not `.then()` chains**, except when composing many independent promises with `Promise.all`.

```js
// ✅ Good
const user = await fetchUser(id)
const posts = await fetchPosts(user.id)

// ❌ Avoid
fetchUser(id).then(user => fetchPosts(user.id)).then(...)
```

### Null vs undefined

**Return `null` when a value is intentionally absent.** Never return `undefined` on purpose — `undefined` should only appear for unset variables or missing object keys.

```js
// ✅ Good — explicitly "no user found"
const findUser = (id) => users.find(u => u.id === id) ?? null

// ❌ Avoid — ambiguous whether the function even ran
const findUser = (id) => users.find(u => u.id === id)  // returns undefined
```

### Dates

Priority order for date handling:

1. **Native [`Intl` API](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl)** for formatting and locale-aware display.
2. **[`date-fns`](https://date-fns.org/)** for arithmetic, parsing, and comparisons not covered by `Intl`.
3. **Never `moment.js`** — it is deprecated and heavy. Remove it when you touch code that uses it.

### Redirections

**Use `AppLinker` for in-app and cross-app navigation.** Never rely on `window.location`, `window.open`, or manual URL assembly for Cozy app links — those break sharing, deep-linking, and the mobile native shell. `window.location` is acceptable only for truly external URLs that are not Cozy apps.

### Comments

**Only comment business-logic complexity** — the *why*, not the *what*. Do not comment obvious code. If the comment describes what the code does, delete it and improve the naming instead.

---

## JavaScript Naming

Apply these rules when naming functions, variables, cozy-client queries, or organizing imports.

### Function prefixes

Pick the prefix that matches what the function **actually does**. Consistent prefixes make reading code faster because intent is encoded in the name.

| Prefix | Use for | Example |
|---|---|---|
| `fetch` | Async I/O — network, database, file system | `fetchUser(id)` |
| `get` | Synchronous getter from an already-loaded structure | `getFullName(user)` |
| `find` | Look up an item that may or may not exist; returns value or `null` | `findUserById(id)` |
| `has` / `is` | Boolean predicates | `hasAccess(user)`, `isAdmin(user)` |
| `compute` | Derivation from inputs, no side effects | `computeTotal(items)` |
| `make` | Constructor-style factory returning a new value | `makeEmptyDocument()` |
| `normalize` | Transform raw/external data into the project's canonical shape | `normalizeApiResponse(raw)` |
| `save` | Persist a value (async, side effects) | `saveDraft(draft)` |
| `ensure` | Idempotent — create if missing, return existing otherwise | `ensureFolder(path)` |
| `doSomethingAndForget` | Fire-and-forget async action whose result we ignore | `trackEventAndForget(evt)` |

Do **not** mix: a function called `getUser` that does a network call is misleading — rename it `fetchUser`.

### cozy-client queries

When building a `Q()` query, set a descriptive `as` (alias) for caching and debugging.

- **Default `as` = the doctype name.** If you query `io.cozy.files`, `as` is `io.cozy.files`.
- **If the query is parameterized**, include the parameters in the alias with `/[PARAM_NAME]/` syntax so each parameter combination gets its own cache entry.

```js
// ✅ Base query
Q('io.cozy.files').as('io.cozy.files')

// ✅ Parameterized — one cache bucket per folder id
Q('io.cozy.files')
  .where({ dir_id: folderId })
  .as(`io.cozy.files/${folderId}/`)
```

### Import organization

Three groups, separated by a blank line, in this order:

1. **External libraries** — anything from `node_modules` that is not a Cozy / Twake package
2. **Internal libraries** — `cozy-*`, `twake-*`, other in-house packages
3. **Local files and styles** — same project (relative paths), plus CSS/SCSS imports last

```js
// ✅ Good
import React, { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

import { useClient } from 'cozy-client'
import { Button } from 'cozy-ui/transpiled/react/Button'

import { formatAmount } from './utils'
import styles from './Invoice.styl'
```

---

## React Conventions

Apply these rules whenever you are writing or modifying React code in a Twake or Cozy frontend project.

### Components

- **Use functional components only** for any new code. Do not write class components.
- **Named exports preferred** over default exports.
  ```js
  // ✅ Good
  export const UserCard = ({ user }) => { ... }

  // ❌ Avoid
  export default UserCard
  ```
- **One component per file** when the component is non-trivial.

### Performance

- Use `React.memo` **only** for medium-to-large components that render frequently with identical props.
- Prefer `useMemo` / `useCallback` only when profiling shows a need, or when passing stable references to memoized children.

### Event handlers

- **Named handlers** over inline arrow functions in JSX when the handler is non-trivial.
- Name handlers `handleX` or `onX` consistently within a file.

### UI library

Twake / Cozy React projects use two in-house component libraries. **Never import Material-UI (`@mui/material`) directly in application code** — always go through one of these design systems.

| Library | Based on | Status | Role |
|---|---|---|---|
| [`twake-mui`](https://github.com/linagora/twake-ui) | MUI **v7** | Modern, early stage (limited catalogue) | **First choice** — use whenever the component you need exists here |
| [`cozy-ui`](https://github.com/cozy/cozy-ui) | MUI **v4** | Mature, outdated, very complete | **Fallback** when `twake-mui` does not yet provide the component or variant |

This order reflects the soft migration toward MUI v7: reach for `twake-mui` first, and only drop back to `cozy-ui` when `twake-mui` is missing what you need.

**When neither library has what you need**, do not reach for raw MUI, do not invent a workaround, and do not fall back to inline styles. **Stop and ask the user** what to do. Phrase the question concretely: name the component you need, the variant or prop that is missing, whether you already checked both libraries, and the place where you would use it.

### Styling

**No inline styles.** Do not use the `style={{...}}` prop in JSX and do not inline CSS strings. Styling must go through the design system.

```jsx
// ❌ Forbidden
<div style={{ padding: 16, color: 'red' }}>...</div>

// ✅ Good — use a cozy-ui / twake-mui component with its documented props
<Stack spacing={2}>
  <Typography color="error">...</Typography>
</Stack>
```

Same escalation rule as the UI library section: if the design system does not expose the style variant you need, ask the user — do not fall back to inline styles or raw MUI `sx`.

### Dependency rules for libraries

If you are working inside a shared library (not an app):
- `react` and `react-dom` go in `devDependencies` **and** `peerDependencies` — never in `dependencies`.
- Do not import Material-UI at all.
- Do not add cross-dependencies between `cozy-*` libraries.

---

## Frontend Testing

Apply these rules when writing or reviewing any frontend test in a Twake or Cozy React project.

### Test library

- **Use [`@testing-library/react`](https://testing-library.com/docs/react-testing-library/intro/).**
- **Do not use Enzyme** — deprecated.
- **Do not use TestCafe** — deprecated.

If you find legacy Enzyme or TestCafe tests while editing nearby code, leave them alone unless migration is the task at hand.

### No snapshot tests

**Do not write `toMatchSnapshot()` / `toMatchInlineSnapshot()` tests.** They rot silently: reviewers rubber-stamp regenerated snapshots, which defeats the point of a test. Assert on explicit, meaningful properties instead.

```js
// ❌ Forbidden
expect(container).toMatchSnapshot()

// ✅ Good
expect(screen.getByRole('heading')).toHaveTextContent('Welcome, Alice')
expect(screen.queryByTestId('error-banner')).toBe(null)
```

### Selecting elements — `data-testid`

- Prefer `getByRole` / `getByLabelText` first (better for accessibility). Fall back to `data-testid` only when the semantic query is ambiguous or fragile.
- Use kebab-case for test ids: `submit-btn`, `error-banner`.

### `queryBy` vs `getBy` in assertions

| Intent | Helper | Matcher |
|---|---|---|
| Element **must** be present | `getByX` | — (`getByX` throws if absent) |
| Assert presence explicitly | `queryByX` | `.toBeInTheDocument()` |
| Assert **absence** | `queryByX` | `.toBe(null)` |

```js
// ✅ Good
expect(screen.queryByTestId('submit-btn')).toBeInTheDocument()
expect(screen.queryByTestId('error-banner')).toBe(null)

// ❌ Avoid — passes even when the element doesn't render
expect(screen.getByTestId('submit-btn')).toBeDefined()
```

### File layout — colocate, don't segregate

Test files live **next to** the source file, not in a separate `__tests__` folder.

```
components/
  UserCard.jsx
  UserCard.spec.jsx        ✅ colocated

  __tests__/               ❌ do not create
    UserCard.jsx
```

Naming: `<SourceFile>.spec.<ext>` (e.g. `UserCard.spec.jsx`).

### What to test

- Cover the component's **public behavior** — what a user (or caller) can observe.
- Do not test implementation details: internal hooks, private helpers, specific render counts.
- One `describe` per component or module; one `it` per behavior. Keep test names human-readable.

---

## Git Conventions

Apply these rules when committing code, writing commit messages, or opening pull requests.

### Commit message format

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

### One atomic change per commit

- **Each dependency upgrade = its own commit.** Never bundle multiple dep bumps.
- Prefer many small commits over one large commit — easier to review, easier to revert.
- Don't mix refactor + feature + fix in the same commit.

### Branches

- Feature branches: `feat/short-description`
- Fixes: `fix/short-description`
- Never force-push to `master` / `main`.
- `master` must always be production-ready — use feature flags for unreleased work.

### Pull Request checklist

Before marking a PR ready for review, verify:

- [ ] Mockups integrated faithfully across mobile, tablet, desktop
- [ ] Tested in responsive mode on at least Chrome + Firefox
- [ ] Localization updated in **both** English and French
- [ ] Tests added or updated, coverage not regressed
- [ ] README updated if behavior or setup changed
- [ ] CHANGELOG entry added
- [ ] Feature flag added if the feature is not ready to ship

### Examples

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
