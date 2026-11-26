---
name: twake-ux
description: Use when designing or changing what the user sees or does in a Twake app (a menu, a dialog, a confirmation, a snackbar, a list, a theme), and in particular when adding or reviewing a destructive action such as delete, delete forever or transfer of ownership.
---

# Twake UX rules

These rules come from the Twake design team (Swann Maillard, designer). They apply to every Twake app. Each rule names its source and its scope (desktop, mobile or both). A point marked _provisional, confirm with Swann_ is the default to apply until Swann answers the matching open question.

Before you change a screen, read the app's `UX.md` at its root (if it has one) and search its `docs/decisions.md` (skill `twake-decisions`). Then apply, in this order:

1. A decision the app has settled, in `docs/decisions.md` or `UX.md`. It is not reopened without saying so.
2. Otherwise, the rule of this skill, provisional defaults included. A Pending entry of the app is not settled: apply the default of this skill until the app decides.
3. Where neither says anything, ask the design team.

## Destructive actions

Source: Swann Maillard, Matrix, 2026-11-20. Scope: desktop and mobile (provisional, confirm with Swann).

An action is destructive when it deletes something or cannot be undone: delete, delete forever, and any action with no way back, such as transferring ownership.

- Label and icon both in red: when the label is red, the icon before it is red too (Swann Maillard, Matrix, 2026-11-20).
- The red is `error.main` from the twake-mui palette, the colour Drive gives the label and icon of its trash action (provisional, confirm with Swann).
- At the bottom of the menu, below a divider that separates it from the other actions.
- One word when possible in menus: "Delete", not "Delete this file".
- Reversible (a delete that moves to the trash): act at once, then show a snackbar that confirms it, with an Undo action.
- Irreversible (delete forever from the trash, transfer of ownership): ask first in a confirmation dialog, then show a snackbar once it is done.

## Contrast theme

Source: Swann Maillard, Matrix, 2026-11-18. Scope: desktop and mobile (provisional, confirm with Swann).

The high-contrast theme is a platform setting, chosen once for every Twake app. An app reads the theme it is given, with no contrast toggle of its own. The design is ready: ask the design team for it before building the theme.

## Open questions

For Swann. Until he answers, apply the order above.

- Spacing and margins: general rules for the space between and around elements.
- Line heights: the rule per text style and per kind of list.
- Hierarchy of information: what makes one piece of information primary or secondary on a screen.
- Red of destructive actions: Drive uses `error.main`, Mail aims at `error.dark`. Is `error.main` the rule?
- Scope of the destructive actions rule and of the contrast theme: is it both desktop and mobile?
