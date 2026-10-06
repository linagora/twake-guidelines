---
name: twake-react-app
description: Use when creating, scaffolding, or implementing a Twake front-end application in React (a standalone SPA such as Twake Space, Mail, Chat, Contacts, Calendar, or a new app). Fixes the stack (React 19, twake-mui, TanStack Query or cozy-client depending on the backend, Rsbuild through rsbuild-config-twake-app, React Router, ESLint with a11y), the hexagonal layout, the local design system in @/ds/, twake-i18n with the 7 default languages, mandatory OIDC sign-in, RGAA / EN 301 549 accessibility, mandatory PostHog tracking of every user action, end-to-end tests of every feature with the Tester Army `e2e` framework, and the dockerised stack each app boots to test itself.
---

# Twake React application

The rules every agent follows when it builds a Twake front-end in React. The stack and
the rules below are **decided: do not re-discuss them** in an implementation task.
Anything this skill does not cover follows the other Twake skills:
`twake-typescript-conventions` (and `twake-javascript-conventions` it builds on),
`twake-javascript-naming`, `twake-react-conventions`, `twake-frontend-testing`,
`twake-git-conventions`, `twake-package-manager-audit`.

**This skill overrides `twake-react-conventions` on one point: there is no cozy-ui
fallback.** cozy-ui is never installed, never imported.

Reference implementation: the React rewrite of Twake Mail
([`Crash--/twake-mail-frontend`](https://github.com/Crash--/twake-mail-frontend)),
whose `AGENTS.md`, `common/src/ds/README.md` and `e2e/README.md` this skill
generalises. When in doubt, look at how Mail does it.

## 0. Prerequisites still open (read first)

These are known gaps between the target stack and what is published today. Do not
work around them silently; if one blocks you, stop and say so.

| Gap | Effect | Until it is fixed |
|---|---|---|
| `@linagora/twake-mui` 9.17 declares `react: ^18` | `npm install` fails with React 19 (ERESOLVE) | React 19 support is in progress in twake-ui (and the other Twake libraries). React 19 stays the target: wait for the release. Never `--legacy-peer-deps`, never `overrides`. |
| `rsbuild-config-twake-app` is not published yet in `linagora/twake-libs` | No shared Rsbuild config for Twake apps | Plain `@rsbuild/core` meanwhile (§3), then switch. |
| `eslint-config-cozy-app` 7.1 has no accessibility rules | jsx-a11y is not checked | Add `eslint-plugin-jsx-a11y-x` in the app (§3); an `a11y` export upstream in cozy-libs is the target. |
| twake-mui ships its own strings in 4 languages only (en, fr, ru, vi) | twake-mui labels fall back to English in de, es, it | Record it in `docs/twake-mui-gaps.md`; the fix belongs in twake-ui. |
| The agent steps of `e2e` (`agent.act`, `agent.assert`) call a model on a cache miss (first run, changed screen) | Without a model key they cannot run; plain steps and axe still do | Provide the key as a CI secret (OpenRouter, Vercel AI Gateway: not decided); an agent step skips without it instead of failing. |
| No shared OIDC package yet in `twake-libs` | Each app copies `oidcAuth.ts` | See §8: the package is to be extracted, not rewritten per app. |

## 1. Stack

| Concern | Choice |
|---|---|
| Runtime, package manager | Node 24 (`.nvmrc`), npm, `package-lock.json` committed |
| Language | TypeScript, `strict` |
| UI framework | **React 19** |
| Components | `@linagora/twake-mui` (MUI 9, themed), `@linagora/twake-icons`, `@linagora/twake-css` utility classes |
| Server state | **TanStack Query 5** for every backend except cozy-stack; **cozy-client** for cozy-stack (§4). No Redux of your own. |
| HTTP client | **ky**, in the adapters only (§4), with the auth hooks of the shared OIDC package (§8) |
| Routing | **React Router 8** (needs React ≥ 19.2) |
| Build | **Rsbuild** via `rsbuild-config-twake-app` (§3) |
| Lint, format | ESLint 10 flat config from `eslint-config-cozy-app` + jsx-a11y, Prettier |
| i18n | `twake-i18n` |
| Auth | OIDC, `openid-client` 6, through the shared twake-libs package (§8) |
| Product analytics | **PostHog** (`posthog-js`), behind an `Analytics` port (§12) |
| Shared code | `@linagora/twake-utils` and the other packages of [`linagora/twake-libs`](https://github.com/linagora/twake-libs) |
| Unit and component tests | Jest 30, Testing Library |
| End-to-end tests | **Tester Army `e2e`** (npm `e2e`, [tester.army/e2e](https://tester.army/e2e)), for every feature, in a separate `e2e/` package (§11) |

Existing apps (Mail, Contacts, Calendar) are on React 18 and React Router 7. New apps
start on the versions above; the existing ones migrate once twake-mui allows it.

## 2. Repository layout

```
<app>/
  src/
    domain/          pure TypeScript: entities, value objects, rules. No I/O, no React.
    application/     use cases + ports (interfaces the use cases need)
    adapters/        port implementations: HTTP, JMAP, CalDAV, cozy-stack, OIDC…
    ui/              React: routes, screens, feature components, TanStack Query hooks
    ds/              local design system (§5), imported as @/ds/
    locales/         <lang>.json, one per language (§6)
    app/             composition root: builds the adapters, providers, router
  e2e/               separate npm package (`e2e` framework), with docker/ and scripts/ (§11)
  docs/twake-mui-gaps.md
  Dockerfile         production image (nginx, runtime config)
  AGENTS.md          app-specific rules, pointing to this skill
```

Aliases: `@/` for `src/`, `@/ds/` for `src/ds/`. No barrel files.

## 3. Build and lint

**Rsbuild, through `rsbuild-config-twake-app`.** A shared config for Twake apps, to be
created in [`linagora/twake-libs`](https://github.com/linagora/twake-libs) (the Twake counterpart of `rsbuild-config-cozy-app`, without its cozy-stack
assumptions and without cozy-ui). Never use `rsbuild-config-cozy-app`: it copies
`manifest.webapp`, routes HMR through cozy-stack and requires cozy-ui. Until
`rsbuild-config-twake-app` is published, use `@rsbuild/core` with
`@rsbuild/plugin-react` and a short `rsbuild.config.ts`, as Mail does, and switch once it
is out.

**ESLint.** `eslint.config.js` spreads `eslint-config-cozy-app` (react config) and adds:

- `eslint-plugin-jsx-a11y-x` with its strict rules **as errors** (the original
  `eslint-plugin-jsx-a11y` does not support ESLint 10);
- `@tanstack/eslint-plugin-query` recommended rules;
- the import boundaries of §4 and §5 (`no-restricted-imports`, per folder);
- a ban on `@mui/*` outside `src/ds/`, and on `cozy-ui` everywhere.

## 4. Hexagonal architecture

Dependencies point inwards: `ui` → `application` → `domain`; `adapters` → `application`
(they implement its ports) and `domain`. ESLint enforces it.

- **`domain/`** imports nothing but `domain/`. No `fetch`, no React, no library client.
- **`application/`** holds one use case per file (`fetchSpace`, `saveEvent`…) and the
  ports it needs (`SpaceRepository`, `Clock`, `AuthSession`). It imports `domain/` only.
- **`adapters/`** implement the ports with real protocols (JMAP through
  `jmap-client-ts`, CalDAV, REST, cozy-stack). Protocol types stay here; they are
  mapped to domain types before leaving the adapter. HTTP calls that no protocol
  client makes for you go through **ky**: one instance per backend, created in the
  adapter, never a raw `fetch`, never axios.
- **`ui/`** never imports `adapters/`. It calls use cases, which it receives from the
  composition root through a React context. One exception: the cozy-client query
  definitions of `adapters/cozy/queries.ts` (§ below).
- **`app/`** is the only place that instantiates adapters and wires them into the use
  cases. Tests and e2e swap adapters here.

### TanStack Query lives in `ui/`

- One `queryClient` created in `app/` (no retry on 4xx), cleared when the session ends.
- Each feature has a `queries.ts` exporting a key factory and `queryOptions()` /
  `mutationOptions()` factories **that call a use case**, never an adapter. Keys start
  with the feature name, then the account or tenant id.
- `useXxx` hooks next to it only call `useQuery(xxxQueryOptions(...))`.
- TanStack Query is for every backend **except cozy-stack** (JMAP, CalDAV, Matrix, the
  app's own API…).

### cozy-stack data goes through cozy-client

When the app talks to cozy-stack, it uses **cozy-client**, never TanStack Query and never
a raw `fetch`, and follows the `twake-cozy-client` skill (centralised `Q()` definitions,
`useQuery` / `client.query`, `as` aliases, explicit `fetchPolicy`). cozy-client keeps its
store, offline cache and realtime.

- cozy-client is the adapter **and** the cache for cozy-stack data: the `Q()` query
  definitions live in `adapters/cozy/queries.ts`, mapped to domain types there when
  a use case needs them.
- An app that talks to both kinds of backend uses both libraries, each for its own
  source. Never wrap cozy-client in TanStack Query, nor the reverse.

### Tests per layer

- `domain/`, `application/`: plain Jest, no React, in-memory port implementations.
- `ui/`: Testing Library with `renderWithProviders`, wired to in-memory adapters or a
  fake server speaking the real protocol through the real client (Mail's
  `fakeJmapServer`). Never a mocked client.
- Mock at the boundaries (`openid-client`, `fetch`), not the code under test.

## 5. UI and the local design system `@/ds/`

Outside `src/ds/`:

- Import components from `@linagora/twake-mui` only (it re-exports MUI), icons from
  `@linagora/twake-icons`.
- **No `style`, no `sx`, no `styled`, no local theme override, no custom CSS.** Layout
  that truly needs it uses `@linagora/twake-css` classes (`u-flex`, `u-p-1`…).
- Never `@mui/material`, `@mui/lab`, `@mui/icons-material` directly. Never cozy-ui.

When twake-mui lacks a component or a variant, build it in `src/ds/`:

- **Component behaviour only, no business data.** No domain types, no use case, no
  TanStack Query, no React Router, no `twake-i18n`, no import from `domain/`,
  `application/`, `adapters/`, `ui/` or `app/`. Labels, values and links arrive as
  props; a link takes a `component` prop the way MUI does. ESLint enforces it.
- Raw MUI, `sx` and `styled` are allowed **here and only here**, using theme values
  (`theme.palette`, `theme.spacing`) rather than hard-coded ones. Inline `style` stays
  forbidden.
- Compose, do not fork: wrap a twake-mui component that almost fits.
- One folder per component: `ds/<Component>/<Component>.tsx`, its colocated
  `<Component>.spec.tsx` (theme only), and a header comment saying whether it should go
  upstream to twake-ui and why.
- `data-testid` is passed through as a prop by the caller.
- Record each one in `docs/twake-mui-gaps.md`: component or variant, intended usage,
  what is used meanwhile, where, what twake-ui would need. Everything in `ds/` is meant
  to move to twake-ui or disappear.
- Accessible by construction (§7): an app using `ds/` correctly cannot produce an
  inaccessible screen.

## 6. Localisation

- `twake-i18n` for every user-facing string, including `aria-label`, titles and
  live-region messages. No string literal in JSX.
- **Seven languages by default: `en`, `fr`, `de`, `es`, `it`, `ru`, `vi`**, one
  `src/locales/<lang>.json` each, `en` as source and fallback. Every key exists in all
  seven from the first commit; a spec checks that the key sets are identical.
- After editing `en.json`, propagate with the `locales` command of twake-guidelines.
- Dates, numbers, lists: `Intl` / date-fns with the active locale, never hand-built.
- `<html lang>` follows the UI language. The language comes from the user profile, then
  the browser, then `en`.

## 7. Accessibility

Twake apps are sold to European administrations. The baseline is **EN 301 549, that is
WCAG 2.1 level AA**, audited in France with **RGAA 4.1**. It is a requirement, not a
polishing step: **a feature is not done until it is accessible.**

- **Keyboard**: everything works without a mouse (Tab, Shift+Tab, Enter, Space, Escape,
  arrows where the pattern expects them), in a logical order, with a visible focus.
- **Focus management**: opening a view or a dialog moves the focus into it; closing it
  gives the focus back to what opened it. A route change moves the focus to the new main
  content.
- **Semantics**: native elements first (`button`, `a`, `table`, headings, landmarks),
  ARIA only when nothing native fits, and then the complete pattern (`role`, states,
  `aria-*` kept in sync).
- **Names**: every control has an accessible name. Every icon button has an
  `aria-label` and a tooltip with the same text.
- **Contrast and colour**: 4.5:1 for text, 3:1 for large text and UI parts; no
  information carried by colour alone.
- **Titles**: each view sets its `<title>` (`<view> - Twake <App>`).
- **Frames**: every `iframe` has a `title`.
- **Live regions**: notifications and changes away from the focus are announced
  (`role="status"` / `aria-live="polite"`, `role="alert"` for errors).
- **Motion**: respect `prefers-reduced-motion`.
- **Zoom and reflow**: usable at 200 % zoom and at 320 CSS px wide without horizontal
  scrolling.
- **Tooling**: jsx-a11y as errors (§3); every e2e screen checked with axe (WCAG 2.0/2.1 A
  and AA); one e2e spec drives the main path with the keyboard only. A violation coming
  from twake-mui is recorded in `docs/twake-mui-gaps.md`, never hidden.
- **Product**: each app publishes an accessibility statement (déclaration
  d'accessibilité), required by law for public-sector customers.

## 8. Authentication: OIDC, mandatory

Every app signs in with OIDC against the Twake identity provider. No local accounts, no
app-specific password form.

- Authorization Code + PKCE (S256), `openid-client` 6.
- Verifier, state and return path in `sessionStorage` during the round trip only.
  **Tokens in memory only**, never in web storage, never logged.
- Refresh before expiry and on 401, with one refresh shared by concurrent callers; back
  to the SSO only when the refresh fails. Logout with `id_token_hint`, broadcast to every
  tab (`BroadcastChannel`).
- Inside an intent frame (Twake Space tabs), the sign-in uses `prompt=none` and shows a
  message on `login_required`; it never renders a login form in the frame.
- The SSO configuration is read **at runtime** (`/.env.js`, `window.SSO_*`), not baked at
  build time, so the same image runs in every environment.

**Use the shared package in `linagora/twake-libs`.** Its base is the `oidcAuth.ts` that
Contacts and Calendar share (identical in both,
`common/src/features/User/oidcAuth.ts`), completed with what Mail's
`common/src/features/auth/oidcAuth.ts` adds (in-memory tokens, shared refresh, broadcast
logout). It is framework-free (`openid-client` only), with the React binding kept
separate. Until it is published, copy from Contacts or Calendar and mark the copy for
replacement; never write a new OIDC flow.

The auth service is an adapter behind an `AuthSession` port (`getAuthorizationHeader()`,
`onUnauthorized()`), consumed by the other adapters. Their ky instances get the token
and the 401 handling from the package's ky hooks (`beforeRequest`, `afterResponse`),
never from hand-written ones.

## 9. Integration with Twake Space

An app that Twake Space opens in a tab is a **cozy-stack intent handler**: it declares its
intents in the manifest of its registry entry and implements an `/intents` route
(Twake Calendar is the first app doing it). It adds the Space
origin to its `frame-ancestors`. One intent type per app; the intent data carries ids,
never URLs.

## 10. Production image

- `Dockerfile`: multi-stage build, nginx serving `dist/` with `historyApiFallback`,
  running as a non-root user with a read-only root filesystem.
- Runtime configuration in `/.env.js`, generated from the environment at start.
- Strict Content-Security-Policy and security headers set by the image; every asset
  (fonts, wasm) self-hosted.

## 11. Self-testing stack

Each app boots its whole stack (its front, its back end, the identity provider, the
dependencies) with one command, in Docker, on a stateless runner, so that an agent can
test its own change end to end.

- `e2e/` is a **separate npm package** (own `package.json` and lockfile), out of the app
  workspaces, lint and Jest.
- `e2e/docker/docker-compose.yaml`, with a compose project name unique to the app
  (`<app>-e2e`). **Every port bound to `127.0.0.1`**, never to all interfaces.
- The identity provider runs in the stack (Dex, or the Twake one), so OIDC is tested for
  real.
- `e2e/scripts/start.sh` brings everything up, waits for every healthcheck and for a
  real authenticated request to succeed, and seeds what the tests need.
  `e2e/scripts/stop.sh` removes containers, networks and volumes.
- The app is tested **as its production image** (`E2E_APP_IMAGE=…`), or as a local build
  for quick iterations (`E2E_APP_DIR=…`).
- **Every feature is tested with Tester Army `e2e`** ([tester.army/e2e](https://tester.army/e2e)),
  with no exception: a feature is not done until an `e2e/**/*.e2e.ts` test covers it.
  All end-to-end testing goes through this framework: no separate hand-written
  Playwright suite next to it. A change to a screen or a flow ships with its test in the
  same commit.
- Write the steps that matter as goals (`agent.act`, `agent.assert`) and the checks that
  must be exact with locators and deterministic assertions (`expect`). The cached actions
  are replayed without calling the model.
- No mock, no stub. Desktop, tablet and phone targets. A CSP violation in the browser
  console fails the test. Each screen is checked with axe (§7).
- `data-testid` values are a contract with `e2e/`, listed in `e2e/pages/README.md`.
- The CI runs the same `start.sh` / `npx e2e` / `stop.sh` as a developer.

```bash
cd e2e && npm ci
./scripts/start.sh && npx e2e; ./scripts/stop.sh
```

## 12. Product analytics: PostHog, mandatory

Every app reports its user actions to PostHog. **Every user action is tracked, with no
exception: a feature is not done until each of its actions emits an event.**

- **What counts as an action**: anything the user triggers. A click or tap on a control,
  a form submission, a keyboard shortcut, a drag and drop, a context-menu choice, opening
  or closing a dialog or a panel, a search, a filter or sort change, a settings change,
  and every route change (as a page view). A shortcut and a button that do the same thing
  emit the same event, with an `input` property (`pointer`, `keyboard`, `touch`).
- **Outcome too**: an action that calls the back end also reports how it ended
  (`<event>_succeeded` / `<event>_failed`, with an error code, never the error message).
- **One port, one adapter.** `application/` declares an `Analytics` port (`track(event)`,
  `page(view)`, `identify(userId)`, `reset()`); `adapters/posthog/` implements it with
  `posthog-js` and is the only place that imports it. An in-memory adapter serves tests
  and the runs where analytics is off. ESLint bans `posthog-js` everywhere else.
- **Typed catalogue.** Events are a discriminated union in
  `application/analytics/events.ts`: name in `snake_case`, `<object>_<action>` in the past
  tense (`message_sent`, `thread_opened`, `room_search_submitted`), with its typed
  properties. `track()` accepts that union only, so an event that is not in the catalogue
  does not compile. Every event carries the app name and version.
- **Where the call goes.** In the use case when the action goes through one, otherwise in
  the `ui/` handler, through the `useAnalytics()` hook from the composition root. Never in
  `ds/`: a design-system component exposes its callbacks and the caller tracks.
- **Fire and forget.** Tracking never blocks, delays or breaks the action: no `await` on
  it, and a failure of the adapter is swallowed and logged.
- **Identity.** `identify()` with the OIDC `sub` once the session is up, `reset()` on
  logout. No name and no e-mail address as the distinct id.
- **Never send content or personal data.** No message, subject, file name, room, contact
  or event title, search query, e-mail address, display name, token or URL carrying one.
  Properties are ids, counts, enums and booleans. Because of that, PostHog **autocapture
  is off** (it sends the text of the clicked element), automatic page-view capture is off
  (the router reports views, with the route pattern and not the resolved URL), and session
  recording is off.
- **Consent first.** The app asks the user for consent to analytics, and nothing is sent
  before they accept: PostHog starts opted out (`opt_out_capturing_by_default`) and is
  opted in only on acceptance. Refusing is as easy as accepting, the app works the same
  either way, and the choice can be changed at any time in the settings.
- **Self-hosted in the EU.** Events go to the Twake PostHog instance, self-hosted in the
  EU. Never PostHog Cloud, never a host outside the EU.
- **Runtime configuration.** Project key and host are read at runtime (`/.env.js`,
  `window.POSTHOG_KEY`, `window.POSTHOG_HOST`), like the SSO settings (§8). Without a key
  the in-memory adapter is wired and nothing leaves the browser. The host is added to the
  `connect-src` of the CSP (§10); no PostHog script is loaded from a CDN.
- **Tests.** Each feature spec asserts, on the in-memory adapter, the events its actions
  emit. The e2e stack (§11) runs without a PostHog key.

## 13. Before committing

```bash
npm run lint && npm run format:check && npm run typecheck && npm test && npm run build
```

and, for anything that changes a screen or a flow, its `e2e` test and the e2e suite of §11.
