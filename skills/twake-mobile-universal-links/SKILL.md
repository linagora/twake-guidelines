---
name: twake-mobile-universal-links
description: Use when a Twake or Cozy mobile app needs a universal link / Android App Link — moving an OAuth callback off its custom scheme, publishing assetlinks.json or apple-app-site-association on the apps registry, allowlisting the link in the cloudery, wiring the Android intent filter or the iOS associated domains entitlement, or debugging a link that opens the browser instead of the app.
---

# Universal links / App Links (Twake / Cozy mobile)

A universal link is an `https` URL the OS hands straight to the app instead of the
browser, once the domain has vouched for the app in a `.well-known` file. Twake and
Cozy apps share one host, **`links.twake.app`**, served by the **cozy-apps-registry**,
and claim one path each: `/drive`, `/chat`, `/mail`, `/flagship`, `/pass`.

Use it where a custom scheme is unreliable. The main case is the **OAuth callback on
Android**: launching an app from a navigation requires a user activation, and a second
factor consumes it, so the `myapp://` redirect is silently dropped and the login never
ends. A verified App Link is not subject to that gating.

## Five places must agree

| # | Where | What | Who ships it |
| - | ----- | ---- | ------------ |
| 1 | The app | Android intent filter with `autoVerify`, iOS `associated-domains` entitlement | app PR |
| 2 | The registry storage | your package / appID added to the two `.well-known` files | ops, object storage |
| 3 | The registry pillar | `trusted_protocols` + `trusted_urls` for the not-installed fallback | salt MR |
| 4 | The cloudery | the URL in `AUTHORIZED_REDIRECTIONS`, when the link is an OIDC callback | `backend-cozy` MR |
| 5 | Apple Developer portal | Associated Domains on the App ID, profiles regenerated | portal + `match` |

**Deploy server-side first, ship the app last.** 2, 3 and 4 are independent of each
other and harmless on their own. The app is the piece that breaks: a build whose
callback is a link the cloudery rejects, or that Android refuses to verify, cannot log
in at all, and the only way back is another release.

## The `.well-known` files belong to everyone

One file per host, holding **every** Twake and Cozy app. Never hand ops a file
containing only your app.

- Fetch what is served today, add your entry, hand over the **complete merged file**.
- Route: `GET /.well-known/:filename` reads `universallink/<filename>` from the storage
  container of the space that owns the host (`__default__` for `links.twake.app`), so
  the objects are `universallink/assetlinks.json` and
  `universallink/apple-app-site-association`.
- The handler returns the **Content-Type stored on the object**: it must be
  `application/json`, or iOS ignores the file.
- Claim `/<slug>` and `/<slug>/*`, nothing broader.
- Procedure for the deposit: registry universallink page on the infra wiki.

### Android: list every signing certificate

`sha256_cert_fingerprints` must hold the fingerprint of **each** certificate that signs
a build users install:

- the **Play App Signing** certificate (Play Console, App integrity), and
- the **upload / release keystore** used by any build distributed outside Play
  (Firebase App Distribution, a release APK built in CI).

A missing fingerprint does not degrade gracefully: verification fails and the link
opens in the browser, which for an OAuth callback means a login that never returns.

```json
{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.example.app",
    "sha256_cert_fingerprints": ["AA:BB:…", "CC:DD:…"]
  }
}
```

### iOS: one entry per appID

```json
{ "appIDs": ["TEAMID.com.example.app"], "paths": ["/slug", "/slug/*"] }
```

## App side

**Android** — the intent filter goes next to the existing scheme filters, it does not
replace them:

```xml
<intent-filter android:autoVerify="true">
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="https" android:host="links.twake.app" android:pathPrefix="/slug" />
</intent-filter>
```

Verification runs at **install and update**, against the file live at that moment. An
install that predates the deposit stays unverified until it is updated or re-verified
by hand.

**iOS** — in the entitlements:

```xml
<key>com.apple.developer.associated-domains</key>
<array><string>applinks:links.twake.app</string></array>
```

iOS may keep the **custom scheme** as its OAuth callback: `ASWebAuthenticationSession`
intercepts it in-process, with none of the Android gating, and an `https` callback
there raises the deployment floor to iOS 17.4. The two platforms are allowed to use
different redirects; keep the check that recognises the callback tolerant of both
shapes.

Adding the capability on the App ID **invalidates the existing provisioning profiles**.
Regenerate them (`match` with `readonly: false`, or `sigh`) and **verify the certs
repository actually received a commit** — `match` exits 0 even when the push fails.

## The cloudery must allowlist the URL

When the link is the end of a cloudery login, `oidc_auth` validates
`redirect_after_oidc` against `AUTHORIZED_REDIRECTIONS`, which lives **once per partner
controller** in `back/cloudery/backend-cozy` (`linagora_controller.rb`,
`cnb_controller.rb`). Add the URL to **all** of them, as that repo's `AGENTS.md`
requires; a missing entry raises `Invalid redirect_after_oidc parameter` before the
browser ever opens.

The check is an **exact string match**. `https://links.twake.app/drive` passes;
`https://links.twake.app/drive?fallback=…` does not.

## What the server does with the link

`OidcController#redirect_to_instance` treats any non-cloudery redirect through the
delegated-code path: it appends `code`, `fqdn` and `default_redirection` to the URL and
returns a plain 302. A verified App Link is intercepted on that 302 inside the Custom
Tab, and the app receives the whole query.

Nothing on that path adds a `fallback` parameter, and the registry's
`universalLinkRedirect` answers **404** without one. So a device that cannot open the
app lands on a 404, not on a useful page. `trusted_protocols` and `trusted_urls` in the
registry pillar exist for the flows that *do* pass a fallback (the app's own scheme, the
store listing); add yours there so those redirects are allowed.

## Verification

```sh
# The entry is really served, with the right content type
curl -s https://links.twake.app/.well-known/assetlinks.json | jq '.[] | select(.target.package_name=="com.example.app")'
curl -sI https://links.twake.app/.well-known/apple-app-site-association | grep -i content-type

# Google agrees the statement is valid
curl -s "https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://links.twake.app&relation=delegate_permission/common.handle_all_urls" | jq '.statements[] | select(.target.androidApp.packageName=="com.example.app")'

# On the device, after install
adb shell pm get-app-links com.example.app          # expect: links.twake.app: verified
adb shell pm verify-app-links --re-verify com.example.app
```

On iOS, a device fetches the AASA through Apple's CDN: a freshly deposited file can take
a while to reach it, and reinstalling the app is the reliable way to force a refetch.

## Common mistakes

- Handing ops a `.well-known` file containing only your app, wiping the other products.
- Listing only the Play App Signing fingerprint, so the Firebase or CI build is never
  verified.
- Shipping the app before the files and the allowlist are deployed.
- Updating one cloudery partner controller and not the other.
- Appending a query parameter to an allowlisted redirect and expecting the exact-match
  check to still pass.
- Changing the iOS entitlement without regenerating the provisioning profiles, or
  trusting `match`'s exit code instead of the certs repository content.
- Expecting an install that predates the deposit to verify on its own.
- Assuming a user without the app installed lands somewhere useful: without a
  `fallback`, the registry returns 404.
