---
name: twake-app-integrations
description: "Use when a Twake/Cozy app needs another app: having another app act for the user (pick or attach a file from Drive, write a mail, save a file into Drive), with or without showing its screen, declaring an intent in its manifest.webapp, handling an intent, or keeping its data in sync with another app. Covers cozy-stack intents, cozy-interapp and @linagora/twake-sdk."
---

# App integrations (Twake / Cozy)

Twake apps do not know each other. An app talks to the platform, never to another app:

- It never calls another app's API, never builds another app's URLs, and never names another app by its slug. The only exception is the origins its CSP must list (`frame-src`, `frame-ancestors`), see below.
- When another app must act for the user, the app sends an intent to cozy-stack. The stack finds an installed app that handles it and returns a URL, which the app loads in an iframe. The other app does the work there, in its own authenticated context, and sends the result back. It may show a screen (pick a file, write a mail) or nothing at all (store files the caller sends).
- To keep their data in sync, apps exchange RabbitMQ messages. Their conventions (exchanges, message format, naming) will be covered by a dedicated skill.

This way Drive can be replaced by any app that declares the same intents and honours the same contracts.

## Intents

An intent is an `action` (`PICK`, `OPEN`, `CREATE`, `UPLOAD`...) on a `type` (a doctype such as `io.cozy.files`, or a MIME type). The caller asks for it. The handler declares it in its manifest and does the work in the caller's iframe. cozy-interapp names them *client* and *service*.

1. The caller sends `POST /intents` with the action, the type and permissions.
2. The stack reads the manifests of the installed webapps and returns `services: [{ slug, href }]`. When none matches, the list is empty, and `availableApps` lists the registry apps that would match.
3. The caller loads `href` in an iframe. The handler posts `ready`, and the caller answers with the intent data.
4. The handler posts `readyToUse` once it is ready, then ends with `done` (with a result), `cancel` or `error`.

React apps call and serve intents with cozy-interapp, never with their own copy of the protocol. An app not served by the stack gets its stack token from `@linagora/twake-sdk` and hands it to cozy-interapp (see below). The cozy-interapp [README](https://github.com/linagora/cozy-libs/blob/f145185f53e86562d088e8cb26259b91b5fa6af9/packages/cozy-interapp/README.md) is the reference for the messages; the stack side is in [`docs/intents.md`](https://github.com/linagora/cozy-stack/blob/b468d0c1df7a41c4a836891caba9d6bc65d40189/docs/intents.md). [`IntentIframe` and `IntentDialogOpener`](https://github.com/linagora/cozy-libs/tree/f145185f53e86562d088e8cb26259b91b5fa6af9/packages/cozy-ui-plus/src/Intent) wrap it for apps on cozy-ui.

cozy-intent is a different library: the bridge between the React Native flagship app and its webviews. It has nothing to do with these intents.

### Declare an intent (handler)

In `manifest.webapp`, as [Drive does](https://github.com/linagora/twake-drive/blob/c28e8ceafaa15d63f688ecbfd28383c77de1a925/manifest.webapp#L107-L133):

```json
"intents": [
  { "action": "PICK", "type": ["io.cozy.files"], "href": "/intents" }
]
```

- The stack compares the action case-insensitively and the type as an exact string ([`FindIntent`](https://github.com/linagora/cozy-stack/blob/b468d0c1df7a41c4a836891caba9d6bc65d40189/model/app/webapp.go#L681-L699)). A MIME type may end with `/*` (`image/*`); a doctype has no wildcard. Handlers may compare the action exactly (Drive checks `action === 'UPLOAD'`): callers send it in the case the handler's contract uses.
- `href` is a path relative to the app, without a query string: the stack replaces the query with `?intent=<id>`.
- An app served outside its cozy subdomain names two feature flags in its manifest, whose values are URLs: `service_url_flag` (base URL of its intent pages, when it handles intents) and `client_url_flag` (its own URL, when it calls intents), see [`docs/apps.md`](https://github.com/linagora/cozy-stack/blob/b468d0c1df7a41c4a836891caba9d6bc65d40189/docs/apps.md#L33-L34).
- Write down the contract (data in, result out, errors) in the handler's repo, like Drive's [`PICK`](https://github.com/linagora/twake-drive/blob/c28e8ceafaa15d63f688ecbfd28383c77de1a925/docs/file-picker-intent.md) and [`UPLOAD`](https://github.com/linagora/twake-drive/blob/c28e8ceafaa15d63f688ecbfd28383c77de1a925/docs/upload-intent.md), or `CREATE io.cozy.mails` in twake-mail-frontend (`docs/cozy-intents.md`). Callers code against that document, never against the handler's internals.

### Get the manifest onto the instance

The stack resolves an intent from the manifests of the apps **installed** on the instance ([`FillServices`](https://github.com/linagora/cozy-stack/blob/b468d0c1df7a41c4a836891caba9d6bc65d40189/model/intent/intents.go#L96-L118)), and `GET /apps/` lists only those. A manifest that is only on the registry resolves nothing.

- Publish the app on the registry as `twake-create-app` describes (`cozy-app-publish`, channels, `REGISTRY_TOKEN`).
- Install it on the instance, from `registry://<slug>/<channel>` ([`docs/apps.md`](https://github.com/linagora/cozy-stack/blob/b468d0c1df7a41c4a836891caba9d6bc65d40189/docs/apps.md#L254-L273)). Apps listed at instance creation (`Apps`, `cozy-stack instances add --apps`) are installed from `stable` ([`installApp`](https://github.com/linagora/cozy-stack/blob/b468d0c1df7a41c4a836891caba9d6bc65d40189/model/instance/lifecycle/helpers.go#L29-L43)).
- A new or changed intent counts only once the instance runs the new version. The stack updates an app lazily, when it serves the app's index page or answers `GET /apps/:slug` ([`DoLazyUpdate`](https://github.com/linagora/cozy-stack/blob/b468d0c1df7a41c4a836891caba9d6bc65d40189/model/app/installer.go#L640-L704)), never when it resolves an intent. Until the handler app is opened or updated, callers see its old intents.
- When the new version also changes the app's permissions, the update stops at `available_version` and waits for the user, unless the app is a platform app (`additional_platform_apps` in the context) or the context sets `permissions_skip_verification` ([`installer.go`](https://github.com/linagora/cozy-stack/blob/b468d0c1df7a41c4a836891caba9d6bc65d40189/model/app/installer.go#L425-L461)). A change of terms stops it too, for every app. Ship an intent change without a permission change when you can.
- An app served outside the stack (a coquille) is installed the same way: its manifest declares the intents, and the stack builds `href` from the URL in its `service_url_flag` flag.

The page at `href`, reduced from Drive's [`IntentHandler.jsx`](https://github.com/linagora/twake-drive/blob/c28e8ceafaa15d63f688ecbfd28383c77de1a925/src/modules/services/components/IntentHandler.jsx) and [`Picker.jsx`](https://github.com/linagora/twake-drive/blob/c28e8ceafaa15d63f688ecbfd28383c77de1a925/src/modules/services/components/Picker.jsx):

```js
import { Intents } from 'cozy-interapp'

const intentId = new URLSearchParams(window.location.search).get('intent')
const service = await new Intents({ client }).createService(intentId, window)
const { action, type } = service.getIntent().attributes
const data = service.getData()

// once the UI is rendered and its first data loaded
service.notifyReadyToUse()

service.terminate(result) // the user confirmed, or the work is done
service.cancel()          // the user closed it
service.throw(error)      // the handler cannot work at all
```

- The handler acts with its own rights. Its page runs with its own token, the stack does not check that it has rights on the type, and the caller gets only what the handler sends back. Control what you return: Drive's picker returns the full documents when the caller asks for them, a sharing link, or a download link backed by a 5-minute share, never more than the user picked.
- Pass the intent id to `createService`. Without it, cozy-interapp reads `location.search.split('=')[1]`, which is wrong as soon as another parameter follows (`&session_code=` on mobile).
- A handler with a screen draws its own close button and calls `service.cancel()`. Call `service.hideCross()` when the caller should show its own instead.
- Business errors (a file deleted before confirmation) stay in the handler's UI. `service.throw()` is for technical errors, and a handler that cannot work never sends `readyToUse`.
- A handler served from another origin than the stack does two things, since the stack only sets `frame-ancestors` on pages it serves. Its server sends a CSP `frame-ancestors` listing the caller apps ([`docs/intents.md`](https://github.com/linagora/cozy-stack/blob/b468d0c1df7a41c4a836891caba9d6bc65d40189/docs/intents.md#L259), and §9 of `twake-react-app`). Its page calls `createService(intentId, window, { requireFrameAncestors: true })`, which checks `location.ancestorOrigins`, absent from Firefox before 148: the header is the only protection there.

### Call an intent (caller)

```js
import { Intents } from 'cozy-interapp'

const intents = new Intents({ client }) // an app served by the stack, with cozy-client
const picking = intents
  .create('PICK', 'io.cozy.files', { multiple: false, downloadLink: { label: 'Attach' } })
  .start(container, { onReadyToUse, onShowCross, onHideCross })

// picking.stop() closes it early (the user navigates away)
const result = await picking // the handler's result, or null when cancelled
```

An app not served by the stack uses two libraries: [`@linagora/twake-sdk`](https://github.com/linagora/twake-libs/blob/a2f22a24cc39ae14fbeebfc8694ed3fa833fc67a/packages/twake-sdk/README.md) for the stack token, cozy-interapp for the exchange with the handler. Hand the SDK's `fetchJSON` to cozy-interapp:

```js
const intents = new Intents({
  fetch: (method, path, body) =>
    sdk.fetchJSON(path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body)
    })
})
```

- To decide whether to offer the action, read the installed apps (`GET /apps/`, `sdk.getAllApps()` with twake-sdk) and look for a manifest whose `intents` declare the action and type, with the stack's matching rules (see Declare an intent). It needs `GET` on `io.cozy.apps` in the caller's permissions. Each `POST /intents` stores an intent document, so call it only when the user acts.
- `null` means the user cancelled. The promise rejects on a technical error, and with `Unable to find a service` when `services` comes back empty. `POST /intents` itself can fail with a 500 when there is no match, because the stack then queries the registries ([`createIntent`](https://github.com/linagora/cozy-stack/blob/b468d0c1df7a41c4a836891caba9d6bc65d40189/web/intents/intents.go#L102-L146)). Treat a failed call like a missing handler.
- You own `container`. cozy-interapp puts the iframe in it, and `resize` messages set the size of the container, not of the iframe: make the iframe fill it. A handler without a screen goes in a hidden container.
- Show a loading state until `onReadyToUse`, with a timeout (the README suggests 20 seconds): a cross-origin iframe reports no loading error.
- An app not served by the stack adds the handler's origin to its own CSP `frame-src`.
- cozy-interapp listens on the window of the app. When the iframe sits in another window (an overlay of the host page), dispatch each of its messages again on the app's window with `window.dispatchEvent(new MessageEvent('message', { data, origin, source }))`. A `postMessage` relay would change `origin` and `source`, and cozy-interapp would drop the message.

### What the platform does not do

These come from the stack code, and some contradict `docs/intents.md`:

- The stack grants no permission. It stores the `permissions` argument of `create` without using it ([`createIntent`](https://github.com/linagora/cozy-stack/blob/b468d0c1df7a41c4a836891caba9d6bc65d40189/web/intents/intents.go#L102-L146)).
- The intent data never reach the stack. cozy-interapp sends them by `postMessage` after `ready`; `GET /intents/:id` does not return them.
- The user does not choose between handlers. The stack lists every matching app ([`FindIntent`](https://github.com/linagora/cozy-stack/blob/b468d0c1df7a41c4a836891caba9d6bc65d40189/model/app/webapp.go#L681-L699)), and cozy-interapp takes the first ([`pickService`](https://github.com/linagora/cozy-libs/blob/f145185f53e86562d088e8cb26259b91b5fa6af9/packages/cozy-interapp/src/helpers.js#L30-L37)).
- Each side accepts messages only from the other's origin (the intent's `client` attribute, the origin of `href`).
