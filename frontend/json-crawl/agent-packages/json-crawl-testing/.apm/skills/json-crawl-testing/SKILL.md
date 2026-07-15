---
name: json-crawl-testing
description: Use when adding or changing json-crawl unit tests — crawl order, hook lifecycle, path rules, and clone/transform assertions.
---

# Testing json-crawl

Tests are Jest + ts-jest configured in `package.json` (`npm test`). The points
below are project-specific; they are not implied by a generic Jest setup.

## Import from relative `src`

Tests in this repository import through `../src` (or `../src/rules`, etc.), not the
published package name. Keep new tests consistent with neighbouring files.

## Where each kind of test goes

| File | Scope |
|------|-------|
| `test/crawl.test.ts` | Visit order, root vs skip-root, sparse/symbol array keys. |
| `test/clone.test.ts` | Deep clone independence, hook interaction with clone state. |
| `test/equal.test.ts` | `equal()` helper edge cases. |
| `test/rules.test.ts` | End-to-end rules with `syncClone` + custom rule fields on `CrawlRules`. |
| `test/prefix-rules.test.ts` | `getNodeRules` directly — prefix longest-match, global propagation. |
| `test/breadth-first-traverse.test.ts` | BFS order vs DFS; do not assume shared state unless explicitly testing absence. |

Add focused cases to the existing file that matches the behaviour. New
top-level files are fine when the surface area is large (as with prefix rules).

## Console noise

`crawl.test.ts` swaps `global.console` in `beforeEach`/`afterEach` to keep hook
debug output quiet. Follow that pattern if a new test intentionally logs.

## Asserting crawl order

Depth-first walks visit a node before its descendants and finish a subtree
(`exitHook`) before siblings at the same level. Count hook invocations or collect
`(key, value)` pairs — for arrays, expect keys from `anyArrayKeys` semantics
(see the sparse-array case in `crawl.test.ts`: indices `0, 2, 4, -4`, symbols,
and `undefined` at root).

## Rules fixtures

For `getNodeRules` unit tests, build minimal `CrawlRules<{ rule?: string }>`
objects inline — no external fixtures directory. When testing rules through
`syncClone`, pair a `SyncCloneHook` that reads `ctx.rules` with a source object
small enough to assert the full output JSON (`rules.test.ts` pattern).

Prefix tests must cover: exact `/key` beats prefix; longest prefix beats shorter;
empty prefix keys are ignored; global `/**` re-attaches on the merged result.

## Zero-deps constraint in tests

Do not import other `@netcracker/*` packages into this repository's tests — the
library itself has no runtime dependencies and tests should stay self-contained.

## Before submitting

Run `npm test` from the repository root. Add or extend unit tests for any
behaviour change in `src/`; hook-order and rule-priority regressions are the
most common failure mode.
