## Classify Rules

- Classifiers live under the `$` rule key; the tuple type is `ClassifyRule` in `src/types/rules.ts`.
- Use a 3-tuple for request-like/input semantics: `[add, remove, replace]`.
- Use a 6-tuple only when response-like/output semantics must be explicit: `[add, remove, replace, reversedAdd, reversedRemove, reversedReplace]`.
- Tuple entries can be static diff types (`breaking`, `nonBreaking`, `annotation`, etc.) or `(ctx: CompareContext) => DiffType` classifiers.
- Prefer predefined triples from `src/core/constants.ts` (`allBreaking`, `allNonBreaking`, `addNonBreaking`, etc.) when they exactly match behavior.

## Response-Scope Reversal

- Do not duplicate request rules just to handle response polarity; response-like schema rules are reversed automatically when no explicit 6-tuple slot is supplied.
- `reverseDiffType` swaps only `breaking` and `nonBreaking`; `annotation`, `unclassified`, `deprecated`, and `risky` remain unchanged.
- OpenAPI response schemas are reversed in `src/openapi/openapi3.schema.ts` via `transformCompareRules(..., reverseClassifyRuleTransformer)`.
- AsyncAPI receive schemas are reversed dynamically in `src/asyncapi/asyncapi3.schema.ts` via `dynamicReclassifyTransformer(ctx => ctx.scope === COMPARE_SCOPE_RECEIVE)`.
- If a response rule should not be the mechanical reverse, provide the final three tuple entries instead of adding scope checks around every slot.

## Rule Entry Points

- REST/OpenAPI: start in `src/openapi/openapi3.rules.ts`; schema rules are in `src/openapi/openapi3.schema.ts`; extension compare rules are in `src/openapi/openapi3.compare.rules.ts`.
- GraphQL: start in `src/graphapi/graphapi.rules.ts`; scope constants are in `src/graphapi/graphapi.const.ts`; type-shape adaptation is in `src/graphapi/graphapi.adapter.ts`.
- AsyncAPI: start in `src/asyncapi/asyncapi3.rules.ts`; schema format selection/adapters are in `src/asyncapi/asyncapi3.schema.ts`; common rules and bindings are in `src/asyncapi/asyncapi3.rules.common.ts` and `src/asyncapi/asyncapi3.bindings.ts`.
- Generic JSON Schema behavior starts in `src/jsonSchema/jsonSchema.rules.ts`, with adapters in `src/jsonSchema/jsonSchema.adapter.ts`.

## Adapters

- Add adapters through the `adapter` array on a `CompareRules` node; the type is `AdapterResolver` in `src/types/rules.ts`.
- Adapters run before node comparison and run symmetrically: first `before = f(before, after, ctx)`, then `after = f(after, before, ctx)`.
- Return the original value unless the reference side proves a compatible adaptation is needed.
- Use `ctx.transformer(value, stableTransformId, current => adapted)` for cached transformations; do not mutate inputs in place.
- Preserve origin metadata when changing OpenAPI/JSON Schema structure; see `jsonSchemaOas30to31Adapter` in `src/openapi/openapi3.schema.ts`.
- If an adapter changes object shape, add rules for the adapted child paths at the same rule node; see `schemaToMultiFormatSchemaAdapter` and `/schema` rules in `src/asyncapi/asyncapi3.schema.ts`.
