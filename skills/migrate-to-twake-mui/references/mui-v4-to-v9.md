# MUI v4 (cozy-ui) to MUI v9 (twake-mui)

cozy-ui is `@material-ui/core` v4. twake-mui is `@mui/material` ^9 + `@mui/lab`.
Almost all of the breakage is in the v4 → v5 step; that is what this file covers.

**For v6, v7, v8 and v9 deltas, fetch https://mui.com/material-ui/llms.txt and read the
relevant page. Do not guess them from memory.** What is already known to matter here:
v6+ supports `variants: [{ props, style }]` inside `styleOverrides` (used throughout
`lightOverrides.tsx`) and CSS theme variables; `Grid2` became `Grid`.

## Imports

| v4 | v9 |
|---|---|
| `@material-ui/core` | `@mui/material` |
| `@material-ui/icons` | `@mui/icons-material` |
| `@material-ui/lab` | `@mui/lab` (Alert, Autocomplete, Skeleton, Rating, Pagination moved to `@mui/material`) |
| `@material-ui/core/styles` | `@mui/material/styles` |

In twake-mui, import from `@mui/material` in source files. Consumers import from
`@linagora/twake-mui`, which re-exports all of `@mui/material`.

## Styling — the big one

`makeStyles`, `withStyles` and `createStyles` are gone from the core package. cozy-ui uses them
heavily; do not port them.

- Component-level styling → `styled()` from `@mui/material/styles`, or the `sx` prop.
- Library-wide styling → `styleOverrides` in `src/lib/lightOverrides.tsx`. **Prefer this.**

```js
// v4 theme
{ overrides: { MuiButton: { root: {...} } }, props: { MuiButton: { disableRipple: true } } }

// v9 theme
{ components: { MuiButton: { styleOverrides: { root: {...} }, defaultProps: { disableRipple: true } } } }
```

## Theme

| v4 | v9 |
|---|---|
| `createMuiTheme()` | `createTheme()` |
| `palette.type: 'light'` | `palette.mode: 'light'` |
| `palette.text.hint` | removed |
| `theme.spacing(2)` returns `16` | returns `'16px'` |
| `theme.breakpoints.down('sm')` = up to `sm` | = below `sm`, shift the key |
| `theme.mixins.gutters()` | removed, write the padding |

## Component API

| v4 | v9 |
|---|---|
| `<Hidden>` | removed, use `sx={{ display: ... }}` or `useMediaQuery` |
| `Button color="default"` | `color="inherit"` or a real palette color |
| `Chip variant="default"` | `variant="filled"` |
| `TextField` default variant `standard` | default is `outlined` |
| `Typography srOnly` | removed, use `visuallyHidden` from `@mui/utils` |
| `Box clone` | removed, use `sx` on the child |
| `ExpansionPanel*` | `Accordion*` |
| `<Modal onEscapeKeyDown>` | `onClose` with the `reason` argument |

`classes` keys were renamed in many components (`.MuiXxx-root` style global classes). Check the
component page rather than assuming the v4 key still exists.

## Codemod

The official codemod handles the mechanical part of v4 → v5 and is worth running on a copy of the
cozy-ui source before hand-porting:

```bash
npx @mui/codemod@latest v5.0.0/preset-safe <path>
```

It does not touch `makeStyles`, and it knows nothing about the cozy-ui component it replaces. Treat its output
as a starting point, never as the migration.

## Docs

- MUI v9: https://mui.com/material-ui/llms.txt · MCP: https://mui.com/material-ui/getting-started/mcp/
- MUI v4 (what cozy-ui is built on): https://v4.mui.com/
- cozy-ui styleguide: https://docs.cozy.io/cozy-ui/react/
- twake-mui storybook: https://linagora.github.io/twake-ui/twake-mui/
