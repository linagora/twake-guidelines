---
name: twake-figma-mockups
description: Use when creating or editing a Twake mockup, screen, maquette or prototype in Figma. Builds it only from the Library Twake components, variables, text styles and icons (no redrawn shapes, hex colours or imported SVGs) so that library changes reach every mockup, and ends with an audit of anything not linked to the library.
---

# Twake mockups in Figma

Every Twake mockup made in Figma is built from the reference library **Library Twake** (https://www.figma.com/design/6Sf5ux54xWxOjwN3j7gL78/Library-Twake, file key `6Sf5ux54xWxOjwN3j7gL78`). Components are library instances, colours and spacing are library variables, text uses library styles. Then a change in the library updates every mockup. A mockup that redraws a button, hard-codes a hex colour or pastes an SVG icon breaks that link, so it is wrong even if it looks right.

## Before starting

1. Load the Figma skills `figma-use` (mandatory before any `use_figma` call) and `figma-generate-design`. Call `create_session` on the **target** file (the designer's mockup file), never on the library file: the library is read-only for this work.
2. Check that Library Twake is enabled in the target file: run `search_design_system` for "button" and confirm results come from Library Twake. If not, stop and ask the designer to enable it (Assets panel → Libraries → Library Twake), then continue.
3. Settle with the designer, in one short question only if it is unclear: which app (Mail, Drive, Chat, Calendar, Contacts, AI…), desktop or mobile, light or dark, English (default) or French.

## Building rules

- **Components**: insert instances of library components (table below). Import by key with `importComponentSetByKeyAsync` / `importComponentByKeyAsync`; if a key fails (library republished), find the component by name with `search_design_system`. Configure instances through their variant and component properties (size, colour, state, "Change icon", texts). Never detach an instance, never rebuild a component from rectangles and text.
- **Colours**: bind fills and strokes to variables of the **Twake UI** collection (groups Background, Text, Action, Divider, Border, Primary, Secondary, Error, Warning, Success, Info, Category, Grey). Theme = variable mode on the top frame: Light, Dark, Calendar Light (Calendar app), Calendar Dark. The "Light/…" and "Dark/…" colour styles are legacy: do not use them. Never type a hex value. To bind: list the collection with `figma.teamLibrary.getVariablesInLibraryCollectionAsync(<collection key>)`, import with `figma.variables.importVariableByKeyAsync`, then `setBoundVariableForPaint` / `setBoundVariable`. Collection keys: Twake UI `ad3dfaa2d5b513e3082c5b9a6dc613ba428c0f9f`, Spacing `295cea0086dd3e179b12aafe1f5682c4e5a5624c`, Palettes `b4f8592f6af3f498df5326672a87953f96ce574c` (raw values, only when no semantic variable fits).
- **Spacing and radius**: bind gaps and paddings to the **Spacing** collection (xs 8, s 16, m 24, l 32, xl 48, xxl 64, xxxl 96). Use auto layout everywhere.
- **Text**: every text node uses a library text style (h1 to h6, subtitle1 to subtitle4, body1 to body3, caption, caption2, caption3, button large/medium/small, overline). No local font settings.
- **Shadows**: effect styles "Light/shadow/N" ("Dark/shadow/N" in dark frames): 2 for raised cards, 3 for dialogs, 8 for menus, 16 for snackbars.
- **Icons**: instances from the "♥ Icons Twake" page (`<name>_16_noborder`, e.g. `magnifier_16_noborder`, `trash_16_noborder`), found with `search_design_system`; inside library components, swap them with the "Change icon" property. File-type icons: `files-iconset`. App icons: page "💛 Icons twake 32px". App lockups: component set `Twakelogo` (property `logo`). Empty states: page "🌅 Illustrations Twake". Never import SVGs or use another icon set.
- **Layout** (desktop): frame 1440×900 on `Background/default`; app bar 50px across the top; sidebar 236px on the left (a ready-made `🔷 sidebar <App>` exists per app); content area on `Background/paper` with radius 12 in Drive, Admin and AI. Mobile: 360×800, bottom navigation, full-bleed dialogs. Only one primary button per view.
- **Wording**: English by default, French only when asked. Sentence case, verb-first buttons, realistic content (Camille Bernard, "Product committee prep", "2027 budget.xlsx"), never lorem ipsum. French: "vous", non-breaking space before ? ! : ;, 24-hour times, weeks start Monday.

## When the library has no component for it

Compose the element from library instances and variables (e.g. a chat bubble from a frame bound to `Background/default`, `body2` text and an avatar instance). Name the frame `⚠ Not in library: <name>` and list it in your final message, so the design team can decide whether to add it to the library. Never present it as a library component.

## Library components

Look up the component to use, and its key, in `references/figma-components.md`. It maps every common need (button, text field, app bar, sidebar, dialog, mail list item, attachment chip…) to its Library Twake component set. Ready-made sidebars exist per app (`🔷 sidebar Mail`, `Drive`, `Calendar`, `Contact`, `Docs`, `AI`, `Space`). Pages marked ❌ in the library (Permission dialog, Pie chart, Timeline) are not validated: do not use them.

## Final check (mandatory)

Before handing over, run an audit with `use_figma` on the mockup frame and fix every finding, then run it again:

```js
const root = await figma.getNodeByIdAsync(FRAME_ID); const issues = [];
function insideInstance(n){ for(let p=n.parent;p;p=p.parent) if(p.type==='INSTANCE') return true; return false; }
root.findAll(n => {
  if (insideInstance(n)) return false;
  const bound = n.boundVariables || {};
  if ('fills' in n && Array.isArray(n.fills) && n.fills.some(f => f.visible !== false && f.type === 'SOLID') && !(bound.fills && bound.fills.length) && !n.fillStyleId) issues.push('unbound fill: ' + n.name);
  if ('strokes' in n && Array.isArray(n.strokes) && n.strokes.length && !(bound.strokes && bound.strokes.length)) issues.push('unbound stroke: ' + n.name);
  if (n.type === 'TEXT' && !n.textStyleId) issues.push('text without style: ' + n.name);
  if (['VECTOR','BOOLEAN_OPERATION','STAR','POLYGON'].includes(n.type)) issues.push('drawn shape (use a library icon/component): ' + n.name);
  return false;
});
for (const inst of root.findAllWithCriteria({ types: ['INSTANCE'] })) {
  if (insideInstance(inst)) continue;
  const main = await inst.getMainComponentAsync();
  if (main && !main.remote) issues.push('local component, not from the library: ' + inst.name);
}
return issues.length ? issues.join('\n') : 'clean';
```

Frames deliberately marked `⚠ Not in library` may keep local structure but still use variables and text styles.

## Handing over

End with: the link to the frame, the app/theme/language used, and the list of `⚠ Not in library` elements (or "everything comes from Library Twake"). Do not describe the screen at length; the designer will look at it.

## Mockups made outside Figma

Quick explorations made outside Figma (HTML prototypes, design artifacts) are not reference mockups: rebuild them here with real library instances before they are shared as the design.
