---
name: twake-javascript-conventions
description: Use when writing or reviewing JavaScript/TypeScript in Twake/Cozy projects. Enforces async/await over Promise chains, null over undefined, error handling contract (null / typed result / throw), function declaration style, strict equality, date handling via Intl/date-fns (never moment.js), AppLinker for redirections (never window.location), and business-logic-only comments.
---

# JavaScript Conventions (Twake / Cozy)

Apply these rules when writing or modifying JavaScript or TypeScript in any Twake or Cozy project.

## Syntax

### Equality

Always `===` / `!==`. Never `==` / `!=`.

Null-or-undefined check: `value === null || value === undefined`. Never rely on loose equality for this.

### Function declaration style

- Top-level standalone functions: `function` keyword (hoists, readable top-down).
- Callbacks, closures, inline arguments: `const` + arrow function.

```js
function processOrder(order) {
  const valid = order.items.filter((item) => item.isAvailable);
  return valid.map((item) => item.price * item.quantity);
}
```

## Error handling

**Always return a meaningful value.** Pick the return type by how much information the caller needs:

| Return type | When to use | Example |
|---|---|---|
| `null` | Value is non-existent | `findUser(id): User \| null` |
| Any meaningful type (`string`, `boolean`, `number`, user-defined class, union, …) | Outcome is directly expressible without wrapping | `hasAttribute(name): boolean`, `getLabel(): string`, `parse(): Config` |
| `{ ok: true, value: T } \| { ok: false, error: string }` | Complex outcome where the caller needs data or a reason | `getDBRowsWith(col)` |
| `throw` | Internal invariant violated or situation is unprocessable | division by zero, corrupt state |

**`null` — value does not exist:**

```js
function findUser(id) {
  const user = db.get(id);
  return user ?? null;
}
```

**Any meaningful type — outcome is directly expressible:**

Return whatever type naturally describes the result: a `string`, `boolean`, `number`, a user-defined class, a union, an array. Reach for a discriminated result only when the caller genuinely needs to distinguish success from failure.

```js
function hasAttribute(name) {
  return attributes.includes(name); // boolean is the meaningful value
}

function getLabel(key) {
  return LABELS[key] ?? null; // string | null — no wrapper needed
}

function parseConfig(raw) {
  return new Config(raw); // user-defined class is the meaningful value
}
```

**Discriminated result — caller needs data and/or a reason:**

```js
async function getDBRowsWith(col) {
  try {
    const r = await db.query({ col });
    return { ok: true, value: r };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// caller
const result = await getDBRowsWith('email');
if (!result.ok) {
  logger.warn(result.error);
  return;
}
process(result.value);
```

Libraries like [`neverthrow`](https://github.com/supermacro/neverthrow) or an `Either` type are valid project-wide alternatives — they make the error path structurally impossible to ignore. Adopt consistently across a project, not per-file.

**`throw` — unacceptable or unprocessable situation:**

```js
function divide(a, b) {
  if (b === 0) throw new Error('Division by zero — caller invariant violated');
  return a / b;
}
```

Preserve cause when rethrowing:

```js
try {
  await syncData();
} catch (err) {
  throw new Error('Sync failed', { cause: err });
}
```

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

## Forbidden

- `console.log` in committed code — use a structured logger.
- `==` / `!=`
- Empty `catch` blocks.
- `.then().catch()` chains — use `async/await` + `try/catch`.
- `moment.js` — use `Intl` or `date-fns` instead.
- `window.location` for Cozy app navigation — use `AppLinker`.
