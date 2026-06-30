---
name: twake-typescript-conventions
requires: twake-javascript-conventions
description: Use when writing, reviewing, or scaffolding TypeScript in Twake/Cozy projects. Delta over twake-javascript-conventions — read that first. Enforces explicit types and exported types, named exports only (never export default, types included), type vs interface, unknown in catch, satisfies, strict mode, constrained generics, string unions over enums, TC39 decorators, and bans any / as unknown as T / @ts-ignore / unconstrained generics / void without justification.
---

# TypeScript Conventions (Twake / Cozy)

Delta over `twake-javascript-conventions`. Read that first. Rules here narrow or override it.

JavaScript brings a grammar, a syntax, a parser and a runtime engine.<br />
TypeScript brings tools to enhance and make somewhat safer that JS core base. Not using it is silently discarding those improvements, defeating all benefits!

---

## Explicit types

All custom code must be explicitly typed. If a third-party library ships without types, maybe another one exists that does the same job and has types otherwise use it as-is... — but every function, class, and value we own must carry a type annotation.

- Explicit return type on every non-trivial function.
- Type every exported symbol. If a type is expected to be used outside its module, export it too.
- Do not rely on inference as a substitute for a declared contract.

```ts
// ✅ return type declared, exported type available to consumers
export type UserResult = { ok: true; value: User } | { ok: false; error: string };

export async function fetchUser(id: string): Promise<UserResult> { ... }

// ❌ inference only — contract is invisible to callers and breaks silently on refactor
export async function fetchUser(id: string) { ... }
```

Third-party packages without `@types` are the only accepted exception. Annotate the call site with `// no types available for <package>` and move on.

---

## Exports

Named exports only — inherited from `twake-javascript-conventions`, and it covers **types** too. Export every type, interface, and value by name; never `export default` anything. A named type keeps "find references" and auto-import working across consumers (see the explicit-types rule above — invisible contracts break silently).

```ts
// ✅
export interface UserProfile { ... }
export type UserResult = { ok: true; value: User } | { ok: false; error: string };

// ❌
export default interface UserProfile { ... }
```

---

## Type system

### `type` for unions and intersections, `interface` for object shapes

```ts
type Direction = 'north' | 'south' | 'east' | 'west';

interface UserProfile {
  id: string;
  email: string;
  displayName: string;
}
```

### Avoid enums

Use string union types. `enum` compiles to a runtime IIFE and numeric enums have a type-safety hole.

```ts
// ✅
type Direction = 'north' | 'south' | 'east' | 'west';

// ❌
enum Direction { North, South, East, West }
```

When crossing a system boundary, provide a validation helper:

```ts
const DIRECTIONS = ['north', 'south', 'east', 'west'] as const;

function toDirection(raw: string): Direction | null {
  return (DIRECTIONS as readonly string[]).includes(raw)
    ? (raw as Direction) // SAFETY: membership confirmed above
    : null;
}
```

### `unknown` for external data and caught errors

HTTP responses, `JSON.parse`, event payloads, database rows — use `unknown` and type guards. Caught errors are `unknown`, not `Error`. Narrow with `instanceof` before use.

```ts
function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'email' in value
  );
}

} catch (err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  throw new Error(`Operation failed: ${message}`, { cause: err });
}
```

### `satisfies` for literal-preserving validation

Use `satisfies` when you want to validate a value against a type without widening it. The value retains its literal shape; the compiler still catches mismatches.

```ts
const config = {
  port: 8080,
  host: 'localhost',
} satisfies ServerConfig;
// config.port is still `8080`, not `number`
```

Prefer `satisfies` over `as Config` whenever the goal is validation, not casting.

---

## Generics

### Constrain. Always.

Unconstrained `T` is a smell. If you know the shape, express it.

```ts
// ❌ accepts anything, communicates nothing
function first<T>(arr: T[]): T | undefined { ... }

// ✅ bounded when context demands it
function findById<T extends { id: string }>(items: T[], id: string): T | undefined {
  return items.find((item) => item.id === id);
}
```

### Don't reach for generics when a concrete type fits

If a function only ever handles `User[]`, type it as `User[]`. Generics add cognitive overhead — only pay that cost when the abstraction genuinely serves multiple call sites.

---

## `void` is a smell

A function returning `void` signals no information about success or failure. That is almost always wrong.

- If the operation can fail, return a typed result.
- If it truly cannot fail and has no meaningful output, `void` is acceptable — document why.
- Event handlers (DOM, framework lifecycle hooks) are the canonical forced exception.

```ts
// ❌ caller can't know if this worked
function saveUser(user: User): void { ... }

// ✅ success/failure is explicit
function saveUser(user: User): Promise<UserResult> { ... }
```

---

## Suppression directives

Prefer `@ts-expect-error` over `@ts-ignore`. `@ts-expect-error` fails the build if the error disappears — it self-cleans. `@ts-ignore` silently rots.

Every suppression requires two things:

1. **Why** the type system is wrong (not why your code is right).
2. **A tracking reference** (`// TODO(handle): GH-1234`).

```ts
// @ts-expect-error — third-party @types/foo omits the `retries` option added in v3.1
// TODO(alice): remove when @types/foo ≥ 3.1 lands — GH-4892
client.connect({ retries: 3 });
```

Suppression is only valid when the type system is wrong. If your own model is broken, fix the model.

---

## Strict mode

Always enable `"strict": true` in `tsconfig.json`. Never disable individual strict flags to silence errors — fix the types instead.

Key flags `strict` enables: `strictNullChecks`, `noImplicitAny`, `strictFunctionTypes`, `strictBindCallApply`, `useUnknownInCatchVariables`.

---

## Decorators

Use decorators for cross-cutting concerns only: logging, validation, serialization, dependency injection. Never put business logic in a decorator.

Prefer TC39 Stage 3 decorators (TypeScript 5.0+, `experimentalDecorators: false`). Legacy decorators only when a framework explicitly requires `experimentalDecorators: true` (Angular pre-v17, NestJS pre-v10).

- Decorator factories must be pure — no side effects at class definition time.
- Parameter decorators are legacy-only. Do not use in new code.

---

## Utility types

Prefer built-in utility types over manual type construction. Extract named intermediate types when nesting exceeds two levels.

| Type | Use for |
|---|---|
| `Readonly<T>` | Immutable data |
| `Partial<T>` | Update payloads, optional config |
| `Required<T>` | Assert all fields present after validation |
| `Pick<T, K>` | Derive a subshape — prefer over `Omit` when retaining few fields |
| `Omit<T, K>` | Drop one or two fields — switch to `Pick` when omitting more than half |
| `Record<K, V>` | Keyed maps — prefer over `{ [key: string]: V }` index signatures |
| `NonNullable<T>` | After narrowing — never as a shorthand cast |
| `ReturnType<F>` | Derive return type from a function |
| `Parameters<F>` | Derive param tuple for wrappers and higher-order functions |
| `Awaited<T>` | Unwrap promise types in generic contexts |

---

## Forbidden

Everything from `twake-javascript-conventions`, plus:

- **`export default` (values and types)** — named exports only; keeps every symbol greppable and IDE-refactorable.
- **`any`** — use a proper type, `unknown` with a guard, or a constrained generic.
- **`as unknown as T`** — fix the type model instead.
- **`@ts-ignore`** — use `@ts-expect-error` with explanation and ticket.
- **`@ts-expect-error` without explanation and ticket** — both required, always.
- **`enum`** — use string unions with validation helpers at system boundaries.
- **`private` keyword** — use `#` prefix (`private` is erased at runtime).
- **Unconstrained generics** — constrain `T` to the minimum required shape.
- **`void` without justification** — document why the operation has no meaningful return.
- **`"strict": false`** — fix the types, never loosen the compiler.
- **Legacy decorators without framework requirement** — use TC39 Stage 3 syntax.
- **Parameter decorators in new code** — legacy only.
- **Business logic in decorators** — decorators are for cross-cutting concerns only.
- **`NonNullable<T>` as a cast** — narrow first, then use.
- **Utility type nesting beyond two levels inline** — extract named intermediate types.
- **Unannotated exported symbols** — every public API must carry an explicit type.
