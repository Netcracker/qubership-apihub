---
description: How to add or modify classify rules, classifiers, response-scope handling, and adapters in the api-diff library.
---

# api-diff Authoring

## Classify Rules

Classifiers live under the `$` rule key; the tuple type is `ClassifyRule` in `src/types/rules.ts`.

Use a **3-tuple** `[add, remove, replace]` for request-like / input semantics.

Use a **6-tuple** `[add, remove, replace, reversedAdd, reversedRemove, reversedReplace]` only when the response-side behaviour is not the mechanical opposite of the request side.

Tuple entries may be static diff types (`breaking`, `nonBreaking`, `annotation`, `unclassified`, `deprecated`, `risky`) or `(ctx: CompareContext) => DiffType` functions.

Prefer predefined triples from `src/core/constants.ts` (`allBreaking`, `allNonBreaking`, `addNonBreaking`, etc.) when they exactly match the required behaviour.

## Response-Scope Reversal

`reverseDiffType` swaps only `breaking` ↔ `nonBreaking`; `annotation`, `unclassified`, `deprecated`, and `risky` are unchanged.

Where automatic reversal is wired up:

- **OpenAPI** response schemas — `src/openapi/openapi3.schema.ts` via `transformCompareRules(..., reverseClassifyRuleTransformer)`.
- **AsyncAPI** receive schemas — `src/asyncapi/asyncapi3.schema.ts` via `dynamicReclassifyTransformer(ctx => ctx.scope === COMPARE_SCOPE_RECEIVE)`.

If a response rule must not be the mechanical reverse, supply all six tuple entries rather than adding per-slot scope checks.

## Rule Entry Points

| Protocol | Entry point | Schema / format rules | Extras |
| --- | --- | --- | --- |
| REST / OpenAPI | `src/openapi/openapi3.rules.ts` | `src/openapi/openapi3.schema.ts` | extension rules: `src/openapi/openapi3.compare.rules.ts` |
| GraphQL | `src/graphapi/graphapi.rules.ts` | scope constants: `src/graphapi/graphapi.const.ts` | type-shape adapter: `src/graphapi/graphapi.adapter.ts` |
| AsyncAPI | `src/asyncapi/asyncapi3.rules.ts` | format + adapters: `src/asyncapi/asyncapi3.schema.ts` | common rules: `asyncapi3.rules.common.ts`; bindings: `asyncapi3.bindings.ts` |
| JSON Schema | `src/jsonSchema/jsonSchema.rules.ts` | — | adapters: `src/jsonSchema/jsonSchema.adapter.ts` |

## Adapters

Add adapters through the `adapter` array on a `CompareRules` node; the type is `AdapterResolver` in `src/types/rules.ts`.

Adapters run symmetrically before node comparison — first `before = f(before, after, ctx)`, then `after = f(after, before, ctx)`.

Rules:

- Return the original value unless the reference side proves a compatible adaptation is needed.
- Use `ctx.transformer(value, stableTransformId, current => adapted)` for cached transformations; do not mutate inputs.
- Preserve origin metadata when reshaping OpenAPI / JSON Schema structure (see `jsonSchemaOas30to31Adapter` in `src/openapi/openapi3.schema.ts`).
- When an adapter changes object shape, add rules for the adapted child paths at the same rule node (see `schemaToMultiFormatSchemaAdapter` and `/schema` rules in `src/asyncapi/asyncapi3.schema.ts`).
