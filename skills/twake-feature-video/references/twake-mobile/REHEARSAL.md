# Rehearsal: twake-mobile ("Copy link", twake-on-matrix #3604)

- **From the app (source):** colors are `LinagoraSysColors.material()` (primary `#0A84FF`, primaryContainer `#D2E9FF`, surface `#F4F4F4`, inverseSurface `#313033`); strings come from `assets/l10n/intl_en.arb` (`copyLink`, `linkCopied`, `reply`, `forward`, `copy`, `select`, `report`); the snackbar follows `lib/utils/twake_snackbar.dart` (padding 16 x 14, dark, close icon); the bubble shadow follows `message_style.dart`.
- **Not checked against a real screen:** the long-press menu and the message bubble. Their size, spacing and radius are approximations. Compare one frame with a screenshot from the app (simulator) before publishing, and fix the gaps.
- **Not the app:** the avatars (initials on a gradient), the menu order and icons (Material-style outlines), the font (Inter stands in).
- **Story:** long press on a message, the menu opens over a dimmed room, tap "Copy link", the snackbar says "Link copied". About 11 s, 1080 x 1440 (3:4), loops back to the room.
