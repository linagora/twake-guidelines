---
name: twake-feature-video
description: Use when a Twake Chat release (mobile or web) ships a visible new feature and you need a short motion-design video of it (10 to 16 s, MP4 plus GIF), drawn as a fake animated interface in the app's own style with the stageshow skill, to post under the release note. One video per big visible feature, never for a bug fix. Includes a mobile (iPhone frame, portrait) example and recording script.
---

# Feature video (Twake Chat)

A small video that shows **one** new feature in isolation, in the app's real look, for the release note. Fake interface, not a screen recording: stageshow draws the UI and a finger or cursor, the script plays it.

## When

- One video per **big visible feature** (a screen, an action, a panel, a setting). Never for fixes, performance, tests, refactors, CI, dependencies.
- Doubt about "big enough": ask in one line.
- Used by `twake-mobile-release` (mobile) and by web releases.

## Setup (once)

```bash
git clone https://github.com/benjitaylor/skills.git
cd skills/stageshow && npm install      # the stageshow workshop; read its SKILL.md
```

Needs Node 20.19+, Chrome, and `ffmpeg`. Copy this skill's example in: `cp -R <this skill>/references/twake-mobile examples/`, then start the player:

```bash
node node_modules/vite/bin/vite.js playground --config playground/vite.config.ts --port 5199 --strictPort
```

Restart Vite after adding an example folder (the example list is read at start).

## Make the video

1. **Read the feature in the app code**: the widgets, their theme, the strings (`assets/l10n/intl_en.arb` for mobile). Use real colors, sizes and texts. Never invent a look.
2. **Pick the frame.** Mobile: `Phone` from the stageshow kit, one portrait stage (540 x 960, phone 430 wide, centered; 9:16 video 1080 x 1920, no margins to crop). Web: a window, landscape 1920 x 1080.
3. **Write the example**: copy `references/twake-mobile/` (self-contained: no shared CSS, no icon package) and change the story. Three to five beats: context, the action (long press, tap), the result. Show only the feature.
4. **Check a still** at the end state, then fix what the checker reports:
   `node scripts/film.mjs "http://localhost:5199/?capture=<example>" --select '#example' --at done --still --out shots/<example>.png`
5. **Record and export** (portrait example; `rec.cjs` is in `references/`, run from the workshop folder):

```bash
EX=<example> node <this skill>/references/rec.cjs 1080 1920 <outdir> <duration ms + 2500>
V=$(ls <outdir>/*.webm)
ffmpeg -y -loglevel error -ss 0.9 -i "$V" -c:v libx264 -pix_fmt yuv420p -crf 20 -movflags +faststart out/<example>.mp4
ffmpeg -y -loglevel error -i out/<example>.mp4 -vf "fps=1/1.6,scale=360:-1,tile=4x2" -frames:v 1 shots/<example>-strip.png
```

   Landscape: record `1920 1200` with `FRAME_H=1080`, then add `-vf "crop=1920:1080:0:0"` to the first ffmpeg. GIF: `fps=20,scale=960:-1` with a palette.
6. **Look at the strip**, then play the MP4. Compare one frame to a real screenshot of the app (mobile: simulator). Fix the gaps.
7. Write `REHEARSAL.md` next to the example: what comes from the app, what does not.

## Pitfalls

- Glob of Vite is fixed at start: a new example needs a Vite restart ("Unknown example").
- Text in `Roll` must be a plain string.
- Glyph sizes even (12, 14, 16, 22) in even boxes, else half pixels.
- The stage is narrower than a portrait frame: `rec.cjs` paints the page with the stage background (no white bands).
- Do not copy this repo's example styling for another feature: take colors and texts from the feature's own code.

## Report

Paths of the MP4, GIF and example folder, the story in 3 lines, and the gaps with the app. Posting is done by `twake-mobile-release` (or the web release process), not here.
