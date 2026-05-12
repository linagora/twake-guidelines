---
name: javascript-naming
description: Use when naming JavaScript/TypeScript functions, variables, cozy-client queries, or organizing imports in Twake/Cozy projects. Enforces function prefixes (fetch/get/find/has/is/compute/make/normalize/save/ensure/doSomethingAndForget), query `as` naming with doctype and params, and external→internal→local import order.
---

# JavaScript Naming Conventions (Twake / Cozy)

Apply these rules when naming functions, variables, cozy-client queries, or organizing imports in any Twake or Cozy project.

## Function prefixes

Pick the prefix that matches what the function **actually does**. Consistent prefixes make reading code faster because intent is encoded in the name.

| Prefix | Use for | Example |
|---|---|---|
| `fetch` | Async I/O — network, database, file system | `fetchUser(id)` |
| `get` | Synchronous getter from an already-loaded structure | `getFullName(user)` |
| `find` | Look up an item that may or may not exist; returns value or `null` | `findUserById(id)` |
| `has` / `is` | Boolean predicates | `hasAccess(user)`, `isAdmin(user)` |
| `compute` | Derivation from inputs, no side effects | `computeTotal(items)` |
| `make` | Constructor-style factory returning a new value | `makeEmptyDocument()` |
| `normalize` | Transform raw/external data into the project's canonical shape | `normalizeApiResponse(raw)` |
| `save` | Persist a value (async, side effects) | `saveDraft(draft)` |
| `ensure` | Idempotent — create if missing, return existing otherwise | `ensureFolder(path)` |
| `doSomethingAndForget` | Fire-and-forget async action whose result we ignore | `trackEventAndForget(evt)` |

Do **not** mix: a function called `getUser` that does a network call is misleading — rename it `fetchUser`.

## cozy-client queries

When building a `Q()` query, set a descriptive `as` (alias) for caching and debugging. The full naming convention lives in the `cozy-client` skill; the canonical source is the [cozy-guidelines query naming rules](https://github.com/cozy/cozy-guidelines#naming-of-queries). Quick form:

- **Default `as` = the doctype name.** `Q('io.cozy.files')` → `as: 'io.cozy.files'`.
- **Primary doc id**: append `/${id}` directly, no `id/` prefix and no trailing slash.
- **Other parameters**: prefix each with `/<param-name>/${value}`.

```js
// ✅ Base query
Q('io.cozy.files').as('io.cozy.files')

// ✅ Query targeting one document by its id (no prefix for id, no trailing slash)
Q('io.cozy.files').getById(id).as(`io.cozy.files/${id}`)

// ✅ Other parameters get a /<param-name>/ prefix
Q('io.cozy.files')
  .where({ dir_id: folderId })
  .as(`io.cozy.files/dir/${folderId}`)
```

## Import organization

Three groups, separated by a blank line, in this order:

1. **External libraries** — anything from `node_modules` that is not a Cozy / Twake package
2. **Internal libraries** — `cozy-*`, `twake-*`, other in-house packages
3. **Local files and styles** — same project (relative paths), plus CSS/SCSS imports last

```js
// ✅ Good
import React, { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

import { useClient } from 'cozy-client'
import { Button } from 'cozy-ui/transpiled/react/Button'

import { formatAmount } from './utils'
import styles from './Invoice.styl'
```

Within each group, order is free (usually alphabetical, or grouped by feature).
