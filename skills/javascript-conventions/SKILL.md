---
name: javascript-conventions
description: Use when writing or reviewing JavaScript/TypeScript in Twake/Cozy projects. Enforces async/await over Promise chains, returning null instead of undefined, date handling via Intl/date-fns (never moment.js), AppLinker for redirections (never window.location), and business-logic-only comments.
---

# JavaScript Conventions (Twake / Cozy)

Apply these rules when writing or modifying JavaScript or TypeScript in any Twake or Cozy project.

## Async code

**Use `async` / `await`, not `.then()` chains**, except when composing many independent promises with `Promise.all`.

```js
// ✅ Good
const user = await fetchUser(id)
const posts = await fetchPosts(user.id)

// ❌ Avoid
fetchUser(id).then(user => fetchPosts(user.id)).then(...)
```

## Null vs undefined

**Return `null` when a value is intentionally absent.** Never return `undefined` on purpose — `undefined` should only appear for unset variables or missing object keys.

```js
// ✅ Good — explicitly "no user found"
const findUser = (id) => users.find(u => u.id === id) ?? null

// ❌ Avoid — ambiguous whether the function even ran
const findUser = (id) => users.find(u => u.id === id)  // returns undefined
```

## Dates

Priority order for date handling:

1. **Native [`Intl` API](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl)** for formatting and locale-aware display.
2. **[`date-fns`](https://date-fns.org/)** for arithmetic, parsing, and comparisons not covered by `Intl`.
3. **Never `moment.js`** — it is deprecated and heavy. Remove it when you touch code that uses it.

```js
// ✅ Good
new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(date)
import { addDays } from 'date-fns'

// ❌ Forbidden
import moment from 'moment'
```

## Redirections

**Use `AppLinker` for in-app and cross-app navigation.** Never rely on `window.location`, `window.open`, or manual URL assembly for Cozy app links — those break sharing, deep-linking, and the mobile native shell.

```js
// ✅ Good
<AppLinker app={{ slug: 'drive' }} href="/#/folder/123">...</AppLinker>

// ❌ Forbidden
window.location.href = 'https://myapp.mycozy.cloud/drive'
```

`window.location` is acceptable only for truly external URLs that are not Cozy apps.

## Comments

**Only comment business-logic complexity** — the *why*, not the *what*. Do not comment obvious code.

```js
// ❌ Useless — the code already says this
// Increment counter by one
counter += 1

// ✅ Useful — explains a non-obvious constraint
// Backend rejects requests below 50ms apart, so debounce before firing
const debouncedSave = debounce(save, 50)
```

If the comment describes what the code does, delete it and improve the naming instead.
