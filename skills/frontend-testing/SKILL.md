---
name: frontend-testing
description: Use when writing, reviewing, or refactoring frontend tests in Twake/Cozy React projects. Enforces @testing-library/react (never Enzyme or TestCafe), data-testid attributes, queryBy + toBeInDocument()/toBe(null) patterns, colocated *.spec files (no __tests__ folders), and bans snapshot tests.
---

# Frontend Testing (Twake / Cozy)

Apply these rules when writing or reviewing any frontend test in a Twake or Cozy React project.

## Test library

- **Use [`@testing-library/react`](https://testing-library.com/docs/react-testing-library/intro/).**
- **Do not use Enzyme.** It is deprecated in Cozy / Twake projects.
- **Do not use TestCafe.** Also deprecated.

If you find legacy Enzyme or TestCafe tests while editing nearby code, leave them alone unless migration is the task at hand — migration is its own ticket.

## No snapshot tests

**Do not write `toMatchSnapshot()` / `toMatchInlineSnapshot()` tests.** They rot silently: reviewers rubber-stamp regenerated snapshots, which defeats the point of a test.

Assert on explicit, meaningful properties instead:

```js
// ❌ Forbidden
expect(container).toMatchSnapshot()

// ✅ Good
expect(screen.getByRole('heading')).toHaveTextContent('Welcome, Alice')
expect(screen.queryByTestId('error-banner')).toBe(null)
```

## Selecting elements — `data-testid`

- Add a `data-testid` attribute on any element a test needs to target, if no accessible role / label already works.
- Prefer `getByRole` / `getByLabelText` first (better for accessibility). Fall back to `data-testid` only when the semantic query is ambiguous or fragile.
- Use kebab-case for test ids: `submit-btn`, `error-banner`.

## `queryBy` vs `getBy` in assertions

Use the right helper for the right assertion:

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

The `.toBeDefined()` pattern is a false positive: `getByX` throws on absence, so the matcher never actually runs the absent-case assertion.

## File layout — colocate, don't segregate

Test files live **next to** the source file, not in a separate `__tests__` folder.

```
components/
  UserCard.jsx
  UserCard.spec.jsx        ✅ colocated
  UserCard.styl

  __tests__/               ❌ do not create
    UserCard.jsx
```

Naming: `<SourceFile>.spec.<ext>` (e.g. `UserCard.spec.jsx`, `formatAmount.spec.js`).

## What to test

- Cover the component's **public behavior**: what a user (or caller) can observe.
- Do not test implementation details: internal hooks, private helpers, specific render counts.
- One `describe` per component or module; one `it` per behavior. Keep test names human-readable (`it('shows an error when the password is too short')`).
