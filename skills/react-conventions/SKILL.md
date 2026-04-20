---
name: react-conventions
description: Use when writing, reviewing, or refactoring React components in Twake/Cozy frontend projects. Enforces functional components, named exports, React.memo usage, event handler naming, no inline styles, and twake-mui first with cozy-ui as fallback (never raw Material-UI).
---

# React Conventions (Twake / Cozy)

Apply these rules whenever you are writing or modifying React code in a Twake or Cozy frontend project.

## Components

- **Use functional components only** for any new code. Do not write class components.
- **Named exports preferred** over default exports. This makes refactors and IDE imports predictable.
  ```js
  // ✅ Good
  export const UserCard = ({ user }) => { ... }

  // ❌ Avoid
  export default UserCard
  ```
- **One component per file** when the component is non-trivial.

## Performance

- Use `React.memo` **only** for medium-to-large components that render frequently with identical props. Don't memo everything — it adds cost and complexity.
- Prefer `useMemo` / `useCallback` only when profiling shows a need, or when passing stable references to memoized children.

## Event handlers

- **Named handlers** over inline arrow functions in JSX when the handler is non-trivial.
  ```jsx
  // ✅ Good
  const handleSubmit = () => { ... }
  return <form onSubmit={handleSubmit} />

  // ❌ Avoid for non-trivial logic
  return <form onSubmit={() => { /* lots of logic */ }} />
  ```
- Name handlers `handleX` or `onX` consistently within a file.

## UI library

Twake / Cozy React projects use two in-house component libraries. **Never import Material-UI (`@mui/material`) directly in application code** — always go through one of these design systems.

| Library | Based on | Status | Role |
|---|---|---|---|
| [`twake-mui`](https://github.com/linagora/twake-ui) | MUI **v7** | Modern, early stage (limited catalogue) | **First choice** — use whenever the component you need exists here |
| [`cozy-ui`](https://github.com/cozy/cozy-ui) | MUI **v4** | Mature, outdated, very complete | **Fallback** when `twake-mui` does not yet provide the component or variant |

This order reflects the soft migration toward MUI v7: reach for `twake-mui` first, and only drop back to `cozy-ui` when `twake-mui` is missing what you need.

### When neither library has what you need

**Do not** reach for raw MUI, do not invent a workaround, do not copy-paste a stripped-down version, and do not fall back to inline styles.

**Stop and ask the user** what to do. Typical options they may choose:
- Add the missing component/variant to `twake-mui` (preferred) or `cozy-ui` first, then use it
- Use a close-enough existing component with documented trade-offs
- Escalate to the design-system maintainers

Phrase the question concretely: name the component you need, the variant or prop that is missing, whether you already checked both libraries, and the place where you would use it.

## Styling

**No inline styles.** Do not use the `style={{...}}` prop in JSX and do not inline CSS strings. Styling must go through the design system:

```jsx
// ❌ Forbidden
<div style={{ padding: 16, color: 'red' }}>...</div>

// ✅ Good — use a cozy-ui / twake-mui component with its documented props
<Stack spacing={2}>
  <Typography color="error">...</Typography>
</Stack>
```

Same rule as the UI library section: if `cozy-ui` / `twake-mui` does not expose the style variant you need, **ask the user** — do not fall back to inline styles or raw MUI `sx`.

## Testing

See the dedicated `frontend-testing` skill for testing rules (testing-library, `data-testid`, `queryBy` patterns, colocated `*.spec.jsx` files, no snapshots).

## Dependency rules for libraries

If you are working inside a shared library (not an app):
- `react` and `react-dom` go in `devDependencies` **and** `peerDependencies` — never in `dependencies`.
- Do not import Material-UI at all.
- Do not add cross-dependencies between `cozy-*` libraries.
