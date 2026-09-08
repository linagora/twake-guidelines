# Twake Library API revision

The migration is also an API revision. This table is the decision, not a suggestion.

Legend: ❌ should be removed · ❌ 👀 remove after verification · ✅ already removed

## Style overloads with API changes

| Component | cozy-ui props | Decision |
|---|---|---|
| Alert | block, square, severity primary/secondary, icon | Remove everything. `Alert block` becomes `SnackbarContent`. |
| Avatar | size, color, border, innerBorder, display | Remove everything. |
| Badge | size, withBorder, custom colors | Remove everything. |
| Buttons | variants primary/secondary/ghost/text, busy, label, height | Remove everything. `busy` becomes `loading`, `ghost` becomes `contained secondary`. |
| Checkbox | label, error, mixed, disableEffect, size, labelPlacement | Remove everything. `mixed` becomes `indeterminate`. |
| Chips ✅ | variants ghost/active, custom colors | Remove everything. `active` becomes `variant="filled"`. Add a `square` prop. |
| Dialog | useDialogEffects, useCozyTheme, defaultProps | Keep everything. |
| Divider | children string for TextDivider | Delete `TextDivider`. |
| IconButton | size 'xlarge', color 'error' | Remove everything. |
| ListItem | gutters, ellipsis, componentElement, size | Delete `doubleGutter`. Get `ellipsis` from `Typography`. Keep `size`. |
| ListItemText | ellipsis, deprecated primaryText/secondaryText | Get `ellipsis` from `Typography`. |
| MenuItem | ListItem integration, componentElement | Keep the same. |
| Radios | custom icon, defaultProps | Remove everything. |
| Snackbar | hardcoded anchorOrigin, defaultProps | Remove, or keep the same. |
| Switch | icon | Remove `icon`. |
| Tabs | narrowed, segmented, mobile adaptation | Remove everything. `segmented` becomes `Toggle`. |
| TextField | MobileSelect, UUID for a11y, custom icon | Keep the same. |
| Typography | automatic color per variant | Remove everything. |

## Composed components (not direct MUI overloads)

| Component | Decision |
|---|---|
| ActionsBar, ActionsMenu, AppTitle, BarTitle, BottomSheet, CozyDialogs, DropdownButton, DropdownText, Empty, ExtendableFab, Filename, FilePath, FilePathLink, Icon, IntentHeader, IntentWrapper, Layout, LoadMore, Markdown, MidEllipsis, Nav, NavigationList, NestedSelect, PasswordField, PointerAlert, ProgressionBanner, SearchBar, Sidebar, Skeleton, Skeletons, Stack | Keep, migrate on demand |
| BottomNavigation, BottomNavigationAction, MuiTabs | Category 1, plain MUI |
| BarButton ✅ | Removed, was only in Notes |
| Banner ✅ | Removed, replaced by `Alert` or `SnackbarContent` |
| Card ✅, CircleButton ✅, CircularChart ✅, Counter ✅, Figure ✅, Hero ✅, IconStack ✅, Label ✅, Page ✅, Panel ✅, PasswordExample ✅, PieChart ✅, Popup ✅, PopupOpener ✅, Progress ✅, Textarea ✅, Thumbnail ✅, Toggle ✅, Wizard ✅ | Removed |
| Circle ✅ | Removed, replaced by `Avatar` plus the ability to force a background color |
| GhostFileBadge ✅ | Removed, was a Badge override only in Drive |
| InfosBadge ✅ | Removed, replaced by `Badge` |
| SelectionBar ✅ | Removed, replaced by `ActionsBar` |
| DateMonthPicker ❌, DatePicker ❌ | Replaced by the mui-x date pickers |
| FileInput ❌ 👀 | Maybe replaced by `mui-file-input`, used in Drive |
| HistoryRow ❌ | Only in Drive, extract it there |
| InputGroup ❌ | Replaced by `TextField` |
| SelectBox ❌ | Replaced by `TextField select` |
| Spinner ❌ | Replaced by `CircularProgress` |
| Textarea ❌ | Replaced by `TextField multiline` |
| Tile ❌ | Only used by cozy-ui-plus `AppTile`, move it there |
