---
description: Extend next-data-model tree builders, diff aggregators, and json-crawl rules for viewer data layers.
---

# Authoring next-data-model

next-data-model is the type-safe successor to `api-data-model`. It builds
tree structures consumed by api-doc-viewer components. Code lives under
`packages/next-data-model/src/`.

## Layered layout

Two top-level layers; never mix responsibilities:

| Layer | Path | Role |
| --- | --- | --- |
| Model | `src/model/` | Tree node types, interfaces, implementations |
| Building service | `src/building-service/` | Builders, crawl rules, diff aggregators |

Each layer has **abstract** contracts plus **spec-specific** implementations
(`jso/`, `async-api/`, `ddlapi/`, …). Abstract code defines shared API; spec
sub-layers implement node kinds, meta, and crawl behaviour.

When adding a feature, extend abstract contracts first, then wire the JSO,
AsyncAPI, and/or DDL API sub-layer — do not fork logic only in one sub-layer
unless the behaviour is genuinely spec-specific.

## Encapsulation in building service

Do **not** mix a class hierarchy with exported free functions in sibling files.

| Avoid | Prefer |
| --- | --- |
| `shared/foo-helper.ts` exporting `buildX()` / `formatY()` imported by transformers | `protected` / `private` methods on the transformer (or builder) class |
| Shared plain functions between plain and with-diffs paths | **Inheritance**: base transformer + subclass override/hook |
| Exporting internal preparation steps | Export only public entry types: transformer/builder classes, crawl-rule getters, shared **types** |

Rationale:

1. Free helpers break encapsulation — they look like a public utility API.
2. They hide that the logic belongs to one cohesive preparation pipeline.

**Pattern:** `DdlApiSpecTransformer` owns Realm → crawl-document mapping as
private methods; `DdlApiSpecWithDiffsTransformer` extends it and overrides
`attachDiffMetadataToTableOrientedSpec()` (or an equivalent hook), reusing
`transformSourceToTableOrientedSpec()` from the base class.

If a module grows very large, split by **class** (e.g. a non-exported nested
class in the same file), not by exported functions. Exception: `json-crawl`
transformer **functions** referenced from crawl rules remain functions — they
are rule hooks, not domain preparation logic.

## Type narrowing (type guards)

When you would write a type assertion (`value as SomeType`) and are confident
the runtime shape matches, prefer a **type guard** (`value is SomeType`) instead.

| Avoid | Prefer |
| --- | --- |
| `schemaType as IntegerType` after a `kind` check | `isIntegerType(schemaType)` from shared guards |
| `spec as DdlApiTableOrientedSpecWithDiffs` | Explicit construction or a guard-backed factory method |
| Scattered `as` at every call site | Reusable guards in `src/utilities.ts` or `src/shared/<spec>/guards/` |

Type guards are **too generic to hide inside a single class** — place them in the
package shared utilities area when reused (see `src/shared/ddlapi/guards/`).
Domain preparation logic stays on the transformer/builder; guards only narrow types.

Apply this rule in `packages/next-data-model/` and `packages/api-doc-viewer/` when
you touch code that needs narrowing. Exceptions: `as const`, import aliases, and
reduce accumulators typed via a generic parameter instead of `as`.

**Pattern:** `DdlApiSpecTransformer` uses `isBoolType`, `isIntegerType`, … from
`shared/ddlapi/guards/`; `DdlApiSpecWithDiffsTransformer` builds the with-diffs
spec via `createTableOrientedSpecWithDiffs()` instead of casting.

## Tree without diffs

`TreeBuilder` subclasses (e.g. `JsoTreeBuilder`) crawl the source document
via `json-crawl` rules, create nodes through `node-data/builder.ts`, and
assemble a spec tree (`JsoTree`, `AsyncApiTree`, …).

Node values hold document fragments picked by typed allow-lists; meta holds
structural facts (kind, complexity, keys).

## Tree with diffs

`TreeWithDiffsBuilder` subclasses (e.g. `JsoTreeWithDiffsBuilder`) extend the
plain builder. After each node is created, **aggregator factories** under
`node-diffs-data/` populate diff-related fields:

| Field | Meaning |
| --- | --- |
| `nodeDiffs` | Diffs on this node; keys are property names, except `""` (`NODE_LEVEL_DIFF_KEY`) for whole-node add/remove/replace |
| `nodeDescendantDiffs` | Summarised diffs from direct descendants; keys match descendant `key` |
| `nodeDiffsSummary` / `nodeDescendantDiffsSummary` | Unique diff-type sets for badges |
| `nodeDiffsSeverities` | Severity per UI placement (`title-row`, `description-row`, …) |

Aggregators are spec-specific factories returning kind-aware implementations
(`JsoNodeDiffsAggregatorFactory`, etc.). Register new aggregation steps in
the builder's `createNodeDiffs()` flow, not in the view layer.

## Diff inheritance contract

Inherited root diffs (`nodeDiffs[""]`) follow **parent-first** lookup:

1. Parent `nodeDiffs[""]` (add/remove), then parent `nodeDescendantDiffs[nodeKey]`.
2. If absent, repeat on the container node.
3. Reuse the source diff object reference — do not clone.

Severity propagation for complex transitions uses the same parent-first
traversal. Descendant diff summaries include **add/remove only** — exclude
replace from the descendant summary contract.

Key resolution for value-level diff rendering:

- `DiffAdd` / `DiffRemove` → key `""`.
- `DiffReplace` primitive→primitive → key `"value"`.
- `DiffReplace` with a complex side → key `""`.

Full phased actions and entity IDs are in
`packages/api-doc-viewer/jso-diffs-implementation-actions.md`.

## Crawl rules

Document traversal rules live in
`src/building-service/<spec>/json-crawl-entities/rules/`. Builders pass
initial rules to `syncCrawl` and state through typed crawl-state objects.
Extend rules trees (`CrawlRules`) with path segments; keep transformers in
`transformers/` and building hooks colocateed with the builder.

## Tests

Unit tests for builders and aggregators live in `packages/next-data-model/tests/`
(Jest). Add focused tests when changing inheritance, summary scope, or
severity propagation — do not rely on screenshot tests alone for data-layer
regressions.

## DDL API transformer scope

`DdlApiSpecTransformer` maps one `Table` from a ddlapi `Realm` into
`DdlApiTableOrientedSpec` (see `building-service/ddlapi/shared/ddlapi-spec-transformer.ts`).

**Coverage baseline:** which ddlapi fields are mapped vs intentionally omitted — and which
view-model fields the viewer does not paint — is documented in
`packages/api-doc-viewer/ddlapi-display-coverage.md`. Use it to classify **`ndm-future`**
(add mapping here first) vs **`out-of-scope`** (no support needed) before extending
`node-value.ts` or the transformer.

## Cross-package boundary

View components in `packages/api-doc-viewer` import builders and node types
by subpath. Keep diff meta key configuration (`DiffMetaKeys`) supplied by the
caller; the data layer reads keys from crawl state, not from React context.
