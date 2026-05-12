---
name: cozy-client
description: Use when reading, writing, or designing data access against a Cozy stack from a Twake/Cozy React app — anything touching cozy-client, doctypes, Q(), client.query, useQuery, or client.collection. Forbids direct collection access that bypasses the redux store and offline cache, enforces Q() definitions through client.query/useQuery, mandates a centralized queries module, query alias naming per cozy-guidelines, an explicit fetchPolicy on every query, and the canonical where/partialIndex/indexFields/sortBy/limitBy pattern with the `{ $gt: null }` sentinel for sortBy fields.
---

# Cozy Client Patterns (Twake / Cozy)

Apply these rules whenever you read or write data from a Cozy stack inside a Twake or Cozy React app. Background reading: the [Cozy data queries tutorial](https://docs.cozy.io/en/tutorials/data/queries/) covers `where` / `indexFields` / `partialIndex` semantics in depth.

## Never hit collections directly

Calling `client.collection('io.cozy.x').all()` (or `.find`, `.get`, `.create`, ...) directly from app code:

- **Bypasses the redux store.** The result never lands in the cozy-client cache, so other components re-fetch the same data instead of reading from the store.
- **Bypasses the offline pipeline.** PouchDB replication and offline-first behavior only apply to data that flows through `client.query()` / `useQuery()`. Direct collection access works online and silently breaks offline.
- **Defeats request deduplication and revalidation** that the query layer provides for free.

```js
// ❌ Forbidden in app code — bypasses store and offline
const { data } = await client.collection('io.cozy.files').all()

// ✅ Go through the query layer
const filesQuery = Q('io.cozy.files')
const { data } = await client.query(filesQuery)
```

Direct collection access is acceptable only inside library plumbing (`cozy-client`, `cozy-stack-client`), never in app code.

## Always use `client.query()` / `useQuery()` with `Q()`

Every data read goes through the query layer:

- **In React components:** `useQuery(definition, options)` — re-renders on cache updates.
- **In imperative code (sagas, event handlers, scripts):** `client.query(definition, options)` — returns a promise.

Build the **definition** with `Q()` from `cozy-client`. Never pass a raw plain object — `Q()` is the only supported way to describe a query.

```js
import { Q, useQuery } from 'cozy-client'

const definition = Q('io.cozy.files').where({ dir_id: folderId })
const { data, fetchStatus } = useQuery(definition, options)
```

The same `Q()` definition is reused on both the hook path and the imperative path.

## Canonical query template

Non-trivial queries follow this shape (mirrors the cozy-drive web app):

```js
Q(doctype)
  .where({ ...filters, sortField: { $gt: null } })  // "field exists" sentinel
  .partialIndex({ ... })                            // stack-side filter
  .indexFields([...])                               // REQUIRED for every sortBy field
  .sortBy([{ sortField: 'asc' }, ...])
  .limitBy(100)
```

`sortField` above is a placeholder — substitute the actual field name (e.g. `name`, `created_at`). The same name must appear in the `.where()` sentinel, in `.indexFields()`, and in `.sortBy()`.

Two invariants are non-negotiable:

### 1. Every `sortBy` field must be in `indexFields`

Without an explicit index, the stack falls back to an in-memory sort (slow, bounded) and pouch-find can silently return partial or empty results. The cozy doc states it plainly: *"if the fields involved in the sortBy are not indexed, this will force CouchDB to make the sort in memory."*

```js
// ❌ sortBy without indexFields — partial/empty results possible
Q('io.cozy.files').where({ dir_id }).sortBy([{ name: 'asc' }])

// ✅ Index the sort field
Q('io.cozy.files')
  .where({ dir_id, name: { $gt: null } })
  .indexFields(['dir_id', 'name'])
  .sortBy([{ name: 'asc' }])
```

### 2. Every indexed field not in `.where()` needs a `{ $gt: null }` sentinel

Mango indexes only index documents that *have* the field. A `sortBy` field that is not also filtered in `.where()` is invisible to the index — the query returns nothing.

The fix is a "field exists" sentinel: `{ field: { $gt: null } }`. This matches any document where the field is present and not null, which is what you want for sorting.

```js
// ❌ name is sorted but never selected — query returns nothing
Q('io.cozy.files')
  .where({ dir_id })
  .indexFields(['dir_id', 'name'])
  .sortBy([{ name: 'asc' }])

// ✅ Sentinel makes name visible to the index
Q('io.cozy.files')
  .where({ dir_id, name: { $gt: null } })
  .indexFields(['dir_id', 'name'])
  .sortBy([{ name: 'asc' }])
```

### `partialIndex` vs `where`

`partialIndex` and `where` look similar but are interpreted differently:

- **Stack side**: `partialIndex` is applied as a real server-side filter.
- **Pouch side**: `partialIndex` is treated as an index name only — no runtime filtering.

The rule: **put real filters in `.where()`**. Use `partialIndex` only to declare a stable index identity for the stack. If you rely on `partialIndex` to filter, the offline (pouch) path will return rows that should have been excluded.

## `client.query` vs `client.fetchQueryAndGetFromState`

Two imperative APIs, different return semantics:

| API | Returns | Use when |
|---|---|---|
| `client.query(def, opts)` | The fetch result — **or `undefined`** if `fetchPolicy` says the cache is fresh enough and skips the fetch. | You want to trigger a fetch but do not need the data back in this call. |
| `client.fetchQueryAndGetFromState({ definition, options })` | **Always** returns the store state (fetches if needed, otherwise reads cache). | You need the data to keep going — computing something derived, branching on it, returning it. |

The upstream JSDoc spells this out: *"If you need a result anyway, please use fetchQueryAndGetFromState instead"*. Using `client.query` for its return value will look correct in dev and return `undefined` the moment the cache is warm.

## Centralize queries in a shared module

Define every query in a per-app file (typically `src/queries.js` or `src/lib/queries.js`) and import from there. Two effects:

- **Mutualization.** Two components that need the same data share the same query identity, so cozy-client serves both from a single cache bucket and a single network call.
- **Reviewability.** Alias naming, `fetchPolicy`, `indexFields`, and parameter shape live in one place, so reviewers catch divergence and missing options.

```js
// src/queries.js
import CozyClient, { Q } from 'cozy-client'

const defaultFetchPolicy = CozyClient.fetchPolicies.olderThan(60 * 1000)

export const buildFilesByFolderQuery = (folderId) => ({
  definition: Q('io.cozy.files')
    .where({ dir_id: folderId, name: { $gt: null } })
    .indexFields(['dir_id', 'name'])
    .sortBy([{ name: 'asc' }])
    .limitBy(100),
  options: {
    as: `io.cozy.files/dir/${folderId}/files`,
    fetchPolicy: defaultFetchPolicy
  }
})
```

```js
// src/components/FolderView.jsx
import { useQuery } from 'cozy-client'

import { buildFilesByFolderQuery } from 'src/queries'

export const FolderView = ({ folderId }) => {
  const filesQuery = buildFilesByFolderQuery(folderId)
  const { data } = useQuery(filesQuery.definition, filesQuery.options)
  ...
}
```

Do not redefine the same query inline in two different components.

## Name query aliases correctly

Every query must set an explicit `as` — it is the cache key. Naming follows the [cozy-guidelines query naming rules](https://github.com/cozy/cozy-guidelines#naming-of-queries):

- **Default:** `as` equals the doctype. `Q('io.cozy.files')` → `as: 'io.cozy.files'`.
- **Parameterized by `id`:** append `/${id}` directly, no prefix. `as: \`${DOCTYPE}/${id}\``.
- **Other parameters:** add `/[PARAM_NAME]/${value}` for each, in order.
- **Scoped variants:** the cozy-drive convention adds a `<scope>` segment, e.g. `'io.cozy.files/dir/${id}/files'` vs `'io.cozy.files/dir/${id}/directories'` for the two queries that back a folder listing.

```js
// ✅ Base query
as: 'io.cozy.files'

// ✅ Parameterized by id (no `id/` prefix)
as: `io.cozy.files/${id}`

// ✅ Multiple parameters — each prefixed by its name
as: `io.cozy.bank.operations/${id}/account/${account}/date/${date}`
```

**`as` is a global cache key.** Two consumers with the same `as` share the same store entry by design — that's how caching mutualization works. The corollary: two queries that share an alias but have divergent `Q()` definitions will silently corrupt each other's cache. Pick aliases that uniquely describe the data you are fetching.

Note: `cozy-pouch-link` internally uses `\`io.cozy.files/${id}\`` for its `queryFileById` lookups. Reusing that exact shape for an unrelated query in app code will collide.

## Listing a folder needs two queries

To render a folder, fire **two separate queries** — one for child directories, one for child files. This is the cozy-drive web convention, and it has two concrete benefits:

- Both queries can reuse the **same `indexFields`** while applying different `partialIndex` / `where` constraints.
- A directory rename does not invalidate the files cache, and vice versa.

```js
// src/queries.js
export const buildDirectoriesQuery = (folderId) => ({
  definition: Q('io.cozy.files')
    .where({ dir_id: folderId, type: 'directory', name: { $gt: null } })
    .indexFields(['dir_id', 'type', 'name'])
    .sortBy([{ name: 'asc' }])
    .limitBy(100),
  options: { as: `io.cozy.files/dir/${folderId}/directories`, fetchPolicy: defaultFetchPolicy }
})

export const buildFilesInFolderQuery = (folderId) => ({
  definition: Q('io.cozy.files')
    .where({ dir_id: folderId, type: 'file', name: { $gt: null } })
    .indexFields(['dir_id', 'type', 'name'])
    .sortBy([{ name: 'asc' }])
    .limitBy(100),
  options: { as: `io.cozy.files/dir/${folderId}/files`, fetchPolicy: defaultFetchPolicy }
})
```

Do not collapse the two into a single `Q('io.cozy.files').where({ dir_id })` query and filter on `type` client-side.

## Always set an explicit `fetchPolicy`

Every query — `useQuery` or `client.query` — must pass a `fetchPolicy` in its options. Omitting it falls back to refetching on every mount, which thrashes the stack and undermines the offline cache.

```js
import CozyClient, { useQuery } from 'cozy-client'

const fetchPolicy = CozyClient.fetchPolicies.olderThan(60 * 1000)

const { data } = useQuery(definition, { as: 'io.cozy.files', fetchPolicy })
```

Pick the policy that matches the data's freshness needs:

| Policy | When to use |
|---|---|
| `olderThan(ms)` | Most reads. Bounded staleness with caching. |
| `noFetch` | Data is already loaded by another query; just read from the store. |
| Custom function | Bespoke staleness rules. Rare. |

When in doubt, default to `olderThan(60 * 1000)` and adjust based on how often the doctype changes.

## Anti-patterns

- `client.collection(...)` reads or writes in app code.
- Inline `Q()` definitions duplicated across components instead of imported from the shared queries module.
- Missing `as`, or aliases that collide with another query's cache bucket.
- Missing `fetchPolicy` ("works in dev" — until offline or under load).
- Passing a raw object instead of a `Q()` builder to `useQuery` / `client.query`.
- `sortBy` on a field that is not in `indexFields` — silent partial results.
- An indexed field that is not constrained in `.where()` without a `{ $gt: null }` sentinel — query returns nothing.
- Filtering inside `partialIndex` and expecting it to apply offline — pouch ignores it as a filter.
- Calling `client.query` for its return value when the cache may be fresh — use `client.fetchQueryAndGetFromState` instead.
- One mixed query for a folder listing instead of separate directories / files queries.
