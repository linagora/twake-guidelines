---
name: twake-mobile-login
description: Use when building or reviewing the sign-in / sign-up flow of a Twake or Cozy mobile app (React Native, Flutter, native) — the welcome screen, Twake Workplace login via sign-up.twake.app, org-server / SSO discovery, opening the Cozy cloudery/manager, obtaining a Cozy Stack token (token exchange), the in-app browser surface (no WebView), or the OIDC redirect scheme.
---

# Mobile login (Twake / Cozy)

A Twake mobile app serves **two kinds of customer**, and both authenticate against an
**SSO** — only the entry point differs:

- **SaaS** — customers hosted on Twake Workplace (`sign-up.twake.app`).
- **On-prem** — customers on their own **organization server**; the app asks for its
  address and discovers the SSO from there.

The other axis is **what the app talks to** — its own OIDC backend, or the **Cozy
Stack** — which decides how you turn the SSO login into a usable token (see
[Reaching the Cozy Stack](#reaching-the-cozy-stack)).

## The welcome screen: exactly three entries

1. **Se connecter** — sign in a **SaaS** (Twake Workplace) user.
2. **S'inscrire** — register a new **SaaS** (Twake Workplace) account.
3. **Se connecter avec le serveur de l'organisation** — sign in an **on-prem** user:
   the app takes the org server address and discovers its SSO.

## Never a WebView. Always the system in-app browser.

- **Never collect credentials in an app-owned WebView**, and **never prompt for a
  password inside a WebView** — it violates RFC 8252 and is phishing-shaped.
- Use the **system in-app browser**: SFSafariViewController (iOS) / Chrome Custom
  Tab (Android) — `expo-web-browser`'s `openBrowserAsync` in RN, `FlutterWebAuth2` /
  the native equivalent in Flutter. The app cannot read the page's cookies.
- Capture the result as an **OS deep link** on your app's custom scheme (a `Linking`
  listener), not by scraping the page.

## Redirect scheme: app-specific, never `cozy://`

`cozy://` is also registered by the Cozy flagship app, so on a device with both
installed the redirect deep link can open the **wrong app**. Use a **unique scheme**
per app (e.g. `twakedrive://`, `twakemail.mobile://`, `twake.chat://`) and register
it natively (iOS `CFBundleURLTypes`, Android intent filter).

## Se connecter / S'inscrire (SaaS — Twake Workplace)

Two cases, depending on whether the app needs the **Cozy Stack**:

### A. OIDC-only app (no Cozy Stack access) → `sign-up.twake.app`

Open **`https://sign-up.twake.app/`** directly (the Twake Workplace registration web).
Key query parameters — full reference:
`linagora/twake-workplace-private` → `documentation/docs/registration/url-parameters.md`.

| Parameter                      | Effect                                                                 |
| ------------------------------ | ---------------------------------------------------------------------- |
| `login`                        | Presence forces the **login** view.                                    |
| `register`                     | Presence starts the **signup** flow at the email step.                 |
| `post_login_redirect_url`      | Where to return after login (also selects the login view).             |
| `post_registered_redirect_url` | Where to return after signup (also selects the register view).         |
| `app`                          | App-specific redirect building: `chat`, `tmail`, `tdrive`, `default` (aliases `twake-chat` / `twake-mail` / `twake-drive`). |
| `login_hint`                   | Pre-fills the identifier.                                              |

**What comes back on the redirect depends on `app`** (registration's `buildRedirectionUrl`):

- `tmail` / `tdrive` — a server-side OIDC exchange runs and the **tokens** are appended
  to the deep link (`access_token`, `refresh_token`, `id_token`, `expires_in`,
  `username`); the app consumes those directly.
- `chat` — the target is wrapped in the **Matrix OIDC provider URL** (homeserver + user id).
- `default` — the target is used **as-is** (passthrough).

Pick the `app` value that matches your product and check the doc for the exact shape.

### B. App that needs the Cozy Stack → do NOT open `sign-up.twake.app` directly

`sign-up.twake.app` does not mint a Cozy Stack session for Drive-style apps. Use one
of the two Stack paths in **[Reaching the Cozy Stack](#reaching-the-cozy-stack)**.

## Se connecter avec le serveur de l'organisation (on-prem)

The user types their email or org server; you resolve their SSO / login URL from it.
**The discovery differs by app type:**

### Pure Cozy app (goes through the cloudery)

1. `domain` = the part after `@` in the email.
2. `GET https://<domain>/.well-known/twake-configuration` (JSON).
3. Read **`twake-flagship-login-uri`** — the org's flagship/cloudery login URL
   (`twake-pass-login-uri` is the Twake Pass variant).
4. Open that URI in the system browser with your `redirect_after_oidc=<scheme>://`
   **and `login_hint=<the email from step 1>`** so the SSO page comes up pre-filled
   instead of asking for the address the user just typed; it returns
   `<scheme>://?fqdn=…&code=…` (consume via the Stack register flow below).

### OIDC app (talks to its own backend, e.g. tmail/JMAP) → WebFinger

Resolve the SSO/OIDC provider from the server, like `tmail-flutter`:

1. `GET https://<server>/.well-known/webfinger?resource=<user>&rel=<oidc rel>`.
2. The response's `links[0].href` is the OIDC **authority** (SSO provider). Empty
   links → the server does not advertise SSO.
3. `GET <authority>/.well-known/openid-configuration` for the OIDC endpoints, then run
   the standard OIDC Authorization Code + PKCE flow against that authority. Pass the
   email/identifier the user typed as `login_hint` on the authorize request so the SSO
   page is pre-filled.

## Reaching the Cozy Stack

Apps that read/write Stack data need a **Stack token**. Two supported paths — pick by
app type:

### 1. Full "cozy" app → through the cloudery (manager)

Open the **cloudery/manager** in the system browser, like `cozy-flagship-app`:
`https://manager.cozycloud.cc/<partner>/<offer>?redirect_after_oidc=<scheme>://`
(e.g. `/linagora/twake_prod`, `?register=true` for signup). The cloudery orchestrates
the whole login (it drives `sign-up.twake.app` internally, and handles the
already-signed-in case) and returns `<scheme>://?fqdn=…&code=…`. Then, on
`https://<fqdn>`: register an OAuth client → `POST /oidc/access_token` (may return a
`session_code`) → `/auth/authorize` (delegated code / flagship email-code
certification) → Stack token.

> The cloudery **validates `redirect_after_oidc` against an allowlist**
> (`AUTHORIZED_REDIRECTIONS`, one per partner controller in `backend-cozy`: currently
> `linagora` and `cnb`). A new scheme must be added to **all** of them or you get
> `Invalid redirect_after_oidc parameter`. See that repo's `AGENTS.md`.

### 2. OIDC app that must call the Stack → token exchange

If the app already has an OIDC `id_token` (from its own SSO), exchange it for a Stack
token: `POST /auth/token_exchange` with `{ "id_token": "…", "exchange_type": "app" }`.
It returns a Stack OAuth client + access/refresh tokens, scoped to the app's registry
manifest. Requires per-context config (`allow_app_token_exchange`, `app_token_exchange`).
Full reference: `linagora/twake-workplace-private` →
`documentation/docs/cozy-stack/token-exchange.md`.

> Do **not** put a client_secret in a mobile app — the delegated-auth
> `/oidc/access_token` with a secret is not usable client-side.

## Does the app open authenticated external URLs? Keep one cookie jar (iOS)

Ask this early: does the app ever open **external web pages where the user should
stay signed in** — an in-app editor (Docs / OnlyOffice), a linked web app? If so,
those pages must reuse the login session, which constrains the login browser surface
on iOS, where the SSO cookie's jar depends on the surface:

- `openBrowserAsync` = SFSafariViewController → an **app-scoped jar** that the app's
  later SFSVC opens and in-app WebViews can reuse.
- `openAuthSessionAsync` = ASWebAuthenticationSession → a **separate** jar.

So when the app opens authenticated external URLs, the **login must go through
`openBrowserAsync` (SFSVC)** so the LemonLDAP SSO cookie lands in the shared jar;
otherwise those pages re-prompt for login. (Android Custom Tabs share one jar — no
split.) If the app never opens such URLs, either surface is fine.

## Quick reference

| App / account                                   | Open in browser                                             | Returns                       |
| ----------------------------------------------- | ----------------------------------------------------------- | ----------------------------- |
| OIDC-only, Twake Workplace                       | `sign-up.twake.app/?login&app=…`                            | OIDC tokens on the deep link  |
| Needs Stack, Twake Workplace / consumer          | cloudery `manager.cozycloud.cc/<partner>/<offer>`           | `fqdn` + `code`               |
| Pure Cozy, org server                            | `twake-flagship-login-uri` from `.well-known/twake-configuration` | `fqdn` + `code`         |
| OIDC app, org server                             | OIDC `authority` from `.well-known/webfinger`               | OIDC `code` (→ your backend)  |
| OIDC app already holding an `id_token`, needs Stack | —                                                        | `POST /auth/token_exchange`   |

## Common mistakes

- Collecting the password in a WebView (RFC 8252 violation) — use the system browser.
- Using `cozy://` as the redirect scheme (opens the flagship app) — use a unique one.
- Opening `sign-up.twake.app` directly for a Stack app (no `fqdn`/`code` returned) —
  route through the cloudery instead.
- On iOS, logging in via `openAuthSessionAsync` when the app also opens authenticated
  external pages (Docs) — the cookie lands in the wrong jar and those pages re-prompt;
  use SFSVC (`openBrowserAsync`) for the login.
- Adding a redirect scheme to only one cloudery partner controller — update all.
- On the org-server login, not forwarding the email the user just typed as
  `login_hint` — the SSO page asks them for it a second time.
