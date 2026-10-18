---
name: json-crawl-using
description: Use when consuming json-crawl from another TypeScript project — crawling or cloning JSON trees, wiring path rules, or reading hook lifecycle semantics.
---

# Using json-crawl

Import from the package root only:

```typescript
import {
  syncCrawl, syncClone,
  getNodeRules, mergeRules,
  isObject, isArray, anyArrayKeys,
  JSON_ROOT_KEY, JsonPath, CrawlRules, CrawlPrefixRules,
  CrawlRulesContext, SyncCrawlHook, SyncCloneHook, CloneState,
} from '@netcracker/qubership-apihub-json-crawl'
```

Internal paths under the package are unstable.

Typical consumer usage falls into four roles: **type-only** (`JsonPath`),
**guards** (`isObject`/`isArray`/`anyArrayKeys`), **depth-first walks**
(`syncCrawl` + hooks + rules), and **deep copies** (`syncClone` + hooks +
rules). Async `crawl`/`clone`, library `transform`, and `breadthFirstTraverse`
are available when hooks are genuinely async, you need in-place mutation, or
level-order traversal is required; most pipelines use the sync depth-first APIs.

## `JsonPath` — shared address type

`JsonPath` is `PropertyKey[]`. Store document locations as json-crawl paths
wherever your pipeline needs a stable node address. Keys in a path are whatever
the crawler visited — strings, numbers, and symbols (though most hooks skip
symbol keys; see below).

## Pick sync crawl vs sync clone

| API | When to use it |
|-----|----------------|
| `syncCrawl` | Read-only or in-place tree walks. Mutate **source** objects only when the hook intentionally writes into `value` or the parent container. |
| `syncClone` | Produce a new object graph — identity-preserving clones with cycle repair, or rule-driven copies. User hooks run **before** the built-in clone hook. Result is `root[JSON_ROOT_KEY]` (`'#'`). |

Both accept `{ state, rules }` in `params`. Pass `rules` as a single object or an
array (merged via `mergeRules`).

## Hook context and control flags

Each hook receives `{ value, path, key, state, rules? }`. At the **root**,
`key === undefined` and `path === []`.

Return `void` or a partial response. Fields that matter in consumer code:

| Field | Typical use |
|-------|-------------|
| `value` | Replace node value for later hooks / descent. |
| `state` | Carry parent context, caches, depth counters — **must** be returned when you replace it (`{ ...state, parent: newNode }`). |
| `rules` | Override rules for descendants (rare; usually rules come from the static rule tree). |
| `done: true` | **Prune subtree** — cycle guard hit, symbol key, ignored branch, or "already processed this node". |
| `terminate: true` | Abort entire walk (early exit). |
| `exitHook` | Deferred work **after children** — cycle-clone completion, cache cleanup. |
| `afterHooksHook` | Runs after all hooks on the node, before children — marks partial completion so re-entrant reference graphs get a stable back-reference. |

Run **cycle guards first**, then value transformers, then node-creation hooks.
Multiple hooks merge responses in array order.

Execution order per node (depth-first engines):

1. Run each hook in array order; merge `{ value, state, rules, … }` from
   responses into the working context.
2. Run all `afterHooksHook` runnables (LIFO stack) — **after every hook** for
   the node, **before** descending.
3. If `done`, skip children; else if `context.value` is an object, push the
   child frame with accumulated `exitHook` runnables.
4. On frame pop (after all children), run `exitHook` runnables (LIFO).

`terminate` aborts the entire walk immediately. `done` skips only the current
node's descendants.

### Symbol keys

Metadata attached via `symbol` properties is usually not part of the public
document surface. Many hooks bail out:

```typescript
if (typeof key === 'symbol') {
  return { done: true }
}
```

Some cycle guards may still pass `{ value }` for excluded components — follow
the local hook contract, but default to skipping symbols.

## Path rules (`CrawlRules<R>`)

Rule keys select **where** a rule applies; custom fields on the generic `R`
select **what happens** there. Read them from `ctx.rules` inside hooks; do not
re-parse paths by hand when rules already encode the mapping.

| Key | Role |
|-----|------|
| `/**` | Global rules — merged into every matched node; the `/**` entry itself is re-attached on the result so globals keep propagating. |
| `/*` | Local fallback for keys without a more specific match. |
| `/^` | Prefix map (`Record<string, …>`). Longest matching non-empty prefix wins; empty-string keys are ignored. |
| `/${key}` | Exact key match (key stringified with `.toString()`). |
| Other fields on `R` | Custom rule payload (e.g. a root `$` handler). |

Merge priority when building the effective rules for a node: start from the
exact `/key` match, then spread prefix rules, then local `/*`, then global
`/**`. Do not reorder this spread — downstream packages rely on it.

Define a payload type `R` and attach it under path keys:

```typescript
type MyRule = {
  handler?: (value: unknown) => unknown
  skipSubtree?: boolean
  nodeKind?: string
}

const rules: CrawlRules<MyRule> = {
  '/properties': {
    '/*': { nodeKind: 'property' },
  },
  '/^': {
    'x-': { skipSubtree: false, '/*': {}, '/**': {} },
  },
  $: { handler: rootHandler },
}
```

Path keys may be **functions** `(ctx: CrawlRulesContext) => CrawlRules<R>` for
context-sensitive rule trees (e.g. branching on the type of the current key).

`mergeRules` combines multiple rule objects for `params.rules` arrays. Path keys
(`/` prefix) merge by composing their function values; **duplicate non-path keys
throw** — do not pass two rule objects with the same custom field. Split shared
payloads across path keys instead.

Extension-key rules often repeat this shape:

```typescript
const extensionPrefixRules: CrawlPrefixRules<MyRulePayload> = {
  'x-': {
    /* payload for any x-* key */
    '/*': { /* every child under that extension */ },
    '/**': { /* all descendants */ },
  },
}
export const rules = { '/^': extensionPrefixRules }
```

Nest domain rule objects under path keys and spread shared fragments.

## `getNodeRules` outside a crawl

Call when you already know `(parentRules, key, path, value)` but are not
inside a json-crawl walk — e.g. resolving which rules apply to the next key
before starting a nested walk. The `path` argument may be a sentinel, not the
literal crawl path.

Signature: `getNodeRules(rules, key, path, value) → CrawlRules<R> | undefined`.
Matching order: exact `/key` → longest `/^` prefix → `/*` → `/**` (global
re-attaches `/**` on the result).

## Cycle handling — three established patterns

json-crawl does **not** detect cycles. Consumers must track visited references:

1. **`syncClone` + source→copy Map** — Map from source object to clone state; on
   re-entry assign existing clone and `{ done: true }`; use `afterHooksHook` /
   `exitHook` to finalize partial copies. Required for cyclic object graphs and
   identity-preserving clones. At root, remaps `key ?? JSON_ROOT_KEY` when
   writing into `state.node`.

2. **`syncCrawl` + `Set<unknown>`** — add object to set on entry; on re-entry
   `{ done: true }` (optionally pass `undefined` value to skip nested
   materialization).

3. **`syncCrawl` + `Map<unknown, BuiltNode>`** — cache built nodes by **source
   object identity**; on re-entry create a cycle back-reference node, attach to
   parent, `{ done: true }`. Copy the cache into new state when descending
   (`new Map(state.alreadyConvertedValuesCache)`).

Pick the pattern that matches whether you clone or walk in place and whether
downstream needs a back-reference node.

## Sparse arrays and `anyArrayKeys`

Sparse arrays, negative indices, and symbol keys are first-class. Always use
`anyArrayKeys` (via `Reflect.ownKeys` with array prototype filtering) when
aligning custom iteration with crawl order — not `Object.keys`, spread indices,
or `.map((_, i) => i)`. Those miss symbols and negative indices.

## `syncCrawl` skip-root mode

Fourth argument `skipRootLevel: true` — when the root is an object, hooks never
run for the root visit; descent starts at top-level keys. Use when the
container object itself should not be processed.

## Clone and transform state

`clone`/`syncClone`/`transform` seed state as
`{ …params.state, root, node: root }` and append an internal hook that writes
into `state.node`. At the root visit, the internal hook remaps `key` to
`JSON_ROOT_KEY` (`'#'`) because `path.length === 0`.

`transform`'s internal hook treats `value === undefined` as **delete** from the
target (`delete` on objects, `splice` on arrays).

## `breadthFirstTraverse` is a separate walker

`breadthFirstTraverse` implements breadth-first order with its own queue. It
reuses `getNodeRules` and the same hook response fields, but **does not share
state across nodes** — each visit gets `state: {} as T`. Do not assume
`params.state` flows through a BFS walk the way it does in depth-first crawl.

## Common pitfalls

- **`done: true` vs `terminate: true`** — `done` skips one subtree; `terminate`
  stops the whole walk. Do not use `terminate` for subtree suppression.
- **Clone hooks and sharing** — do not recreate nested objects that other
  references share; clone into `state.node` or mutate in place deliberately.
- **`mergeRules` duplicate custom keys** — split shared payloads across path
  keys, not duplicate top-level rule fields.
- **BFS (`breadthFirstTraverse`)** — does not propagate `params.state`. Prefer
  depth-first crawl when state must flow through the walk.
