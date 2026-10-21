---
name: json-crawl-authoring
description: Use when adding or changing crawl/clone/transform behaviour, hook lifecycle, path rules, or exported utilities inside the json-crawl library.
---

# Authoring json-crawl

This package is a maintained fork of [json-crawl](https://github.com/udamir/json-crawl)
with cycle detection removed from the library (callers own it), an
`afterHooksHook` lifecycle hook added, and typing fixes. The notes below are
what the exported types alone do not spell out.

## Zero runtime dependencies

Do **not** add package dependencies. The readme states this explicitly and it
may change later, but for now every feature must stay self-contained. Dev-only
deps (Jest, Vite, TypeScript) belong in `package.json` `devDependencies` only.

## Public surface is `src/index.ts`

Reexport new symbols from `index.ts`. Internal modules (`crawl.ts`, `rules.ts`,
…) are not a stable import path for consumers.

## Depth-first engines share one hook contract

`crawl`, `syncCrawl`, `clone`, `syncClone`, and `transform` all drive the same
depth-first stack walker in `crawl.ts` (clone/transform append their own hook).
When you change hook ordering, `done`/`terminate` handling, or
`afterHooksHook`/`exitHook` scheduling, update **both** `crawl` and `syncCrawl`
— they are intentionally parallel, not factored into one function.

Execution order per node:

1. Run each hook in array order; merge `{ value, state, rules, … }` from
   responses into the working context.
2. Run all `afterHooksHook` runnables (LIFO stack) — **after every hook** for
   the node, **before** descending.
3. If `done`, skip children; else if `context.value` is an object, push the
   child frame with accumulated `exitHook` runnables.
4. On frame pop (after all children), run `exitHook` runnables (LIFO).

`terminate` aborts the entire walk immediately. `done` skips only the current
node's descendants.

## `syncCrawl` root handling

The fourth argument `skipRootLevel` exists only on `syncCrawl`. When `true` and
the root value is an object, the root node is **not** visited by hooks — the
walk starts at its children (`key` is never `undefined` on the first hook
invocation). Default mode visits the root once with `key === undefined`.

## Clone and transform build on `CloneState`

`clone`/`syncClone`/`transform` seed state as
`{ …params.state, root, node: root }` and append an internal hook that writes
into `state.node`. At the root visit, the internal hook remaps
`key` to `JSON_ROOT_KEY` (`'#'`) because `path.length === 0`.

`createCloneHook` in `clone.ts` is a named function on purpose — inlining breaks
debugging separation between user hooks and the built-in clone hook. Keep it.

`transform`'s internal hook treats `value === undefined` as **delete** from the
target (`delete` on objects, `splice` on arrays). That is the only transform-
specific behaviour; everything else reuses the crawl stack.

## Path rules (`rules.ts`)

Rule keys on `CrawlRules<R>`:

| Key | Role |
|-----|------|
| `/**` | Global rules — merged into every matched node; the `/**` entry itself is re-attached on the result so globals keep propagating. |
| `/*` | Local fallback for keys without a more specific match. |
| `/^` | Prefix map (`Record<string, …>`). Longest matching non-empty prefix wins; empty-string keys are ignored. |
| `/${key}` | Exact key match (key stringified with `.toString()`). |
| Other fields on `R` | Custom rule payload (e.g. a root `$` handler). |

Merge priority when building the effective rules for a node: start from the
exact `/key` match, then spread prefix rules, then local `/*`, then global
`/**`. Do not reorder this spread — tests and downstream packages rely on it.

`mergeRules` combines multiple rule objects for `params.rules` arrays. Path keys
(`/` prefix) merge by composing their function values; **duplicate non-path
keys throw** — callers must not pass two rule objects with the same custom field.

## Array key iteration

Sparse arrays, negative indices, and symbol keys are first-class. Always use
`anyArrayKeys` (via `Reflect.ownKeys` with array prototype filtering) when
enumerating array elements inside the library. Do **not** switch to
`Object.keys`, spread indices, or `.map((_, i) => i)` — those miss symbols and
negative indices (see `crawl.test.ts`).

## `breadthFirstTraverse` is a separate walker

`breadthFirstTraverse.ts` implements breadth-first order with its own queue.
It reuses `getNodeRules` and the same hook response fields, but **does not
share state across nodes** — each visit gets `state: {} as T`. Do not assume
`params.state` flows through a BFS walk the way it does in depth-first crawl.
Keep BFS hook-loop changes in sync with the depth-first contract above.

## Cycles are the caller's problem

Unlike upstream json-crawl, this fork does **not** detect cyclic object graphs.
Document new APIs accordingly; callers must track visited references themselves.

## `equal` is a reference helper, not structural gold standard

`equal.ts` compares via `syncCrawl` but uses `Object.keys` for object key sets
and array `.length` — it does not use `anyArrayKeys`. Treat it as a pragmatic
helper for tests/simple cases, not as the canonical equality semantics for sparse
or symbol-keyed objects. Align with existing behaviour unless a test explicitly
requires a change.
