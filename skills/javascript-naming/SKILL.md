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

When building a `Q()` query, set a descriptive `as` (alias) for caching and debugging.

- **Default `as` = the doctype name.** If you query `io.cozy.files`, `as` is `io.cozy.files`.
- **If the query is parameterized**, include the parameters in the alias with `/[PARAM_NAME]/` syntax so each parameter combination gets its own cache entry.

```js
// ✅ Base query
Q('io.cozy.files').as('io.cozy.files')

// ✅ Parameterized — one cache bucket per folder id
Q('io.cozy.files')
  .where({ dir_id: folderId })
  .as(`io.cozy.files/${folderId}/`)
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
