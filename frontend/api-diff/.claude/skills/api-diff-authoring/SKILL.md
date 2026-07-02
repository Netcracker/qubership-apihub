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
| ddlapi (SQL) | `src/ddl/ddl.rules.ts` | classifiers/type-families: `src/ddl/ddl.classify.ts` | mappings: `src/ddl/ddl.mapping.ts`; descriptions: `src/ddl/ddl.description.ts`; dialect seam: `src/ddl/ddl.dialect.ts` |

## Adapters

Add adapters through the `adapter` array on a `CompareRules` node; the type is `AdapterResolver` in `src/types/rules.ts`.

Adapters run symmetrically before node comparison — first `before = f(before, after, ctx)`, then `after = f(after, before, ctx)`.

Rules:

- Return the original value unless the reference side proves a compatible adaptation is needed.
- Use `ctx.transformer(value, stableTransformId, current => adapted)` for cached transformations; do not mutate inputs.
- Preserve origin metadata when reshaping OpenAPI / JSON Schema structure (see `jsonSchemaOas30to31Adapter` in `src/openapi/openapi3.schema.ts`).
- When an adapter changes object shape, add rules for the adapted child paths at the same rule node (see `schemaToMultiFormatSchemaAdapter` and `/schema` rules in `src/asyncapi/asyncapi3.schema.ts`).

## Array mapping & element identity

Arrays default to positional matching (`arrayMappingResolver`), which reports a reorder as add+remove. For arrays whose elements have a stable key, set `mapping` on the **array node** (`createPropertyMappingResolver('name')` from `src/core`, `deepEqualsUniqueItemsArrayMappingResolver`, or a custom `MappingArrayResolver`).

**Gotcha:** when a resolver matches an element to a *different index*, the engine emits a `[Renamed]` diff unless `ignoreKeyDifference: true` is set — and it must sit on the **element** (`/*`) rule, not the array node:

```ts
'/columns': { mapping: createPropertyMappingResolver('name'), '/*': { $: ..., ignoreKeyDifference: true } }
```

Element add/remove is decided by the *parent* mapping and classified by the element rule's `$`; a field change inside the element is classified at the field's own node.

## Suppressing a node: `ignoreDifference`

`ignoreDifference: true` on a rule node suppresses add/remove/replace diffs for that node **and its whole subtree** (implemented at hook entry in `useMergeFactory`), while still merging the after-value. Use it for technical discriminants a user must never see (e.g. ddlapi `/kind`, redundant `/raw`). Scope boundary: it suppresses *mapped/replace* changes only — add/remove of a **whole** node is decided by the parent mapping and is **not** intercepted, so only use it for keys always present on both sides. Contrast `ignoreKeyDifference`, which silences only key-rename diffs.

## Custom node comparison: the `compare` resolver

A `compare: CompareResolver` on a node replaces the engine's default handling. Returning a falsy value (`undefined`) falls through to normal descent; returning `{ diffs, ownerDiffEntry, merged }` short-circuits — the node is compared atomically and the engine does **not** descend. Use the falsy return to *selectively* let the engine descend (e.g. collapse some cases into one diff while descending for others). Never return a cloned node for a shared instance — return the after-instance — or you break the shared-diff contract.

**Prefer granular per-property diffs over collapsing.** Report the change at the specific property that moved; only use a collapsing `compare` resolver with an explicit reason. When a verdict must ride on one field (e.g. a cross-family type signal where the discriminant `kind` is suppressed), put the classifier on that field and let siblings classify independently.

## Classification principles

- **Adding a required property is a non-breaking correction.** If a property is required by the spec, its appearance can only mean a previously-incomplete spec was fixed — classify that `add` `nonBreaking` (a `remove` of a required property stays breaking). This is why ddlapi's `/type`-name classifier is `[nonBreaking, breaking, …]`.
- Reuse the predefined triples (`addNonBreaking` = `[nonBreaking, breaking, breaking]`, etc.) so the intent reads at a glance.

## Descriptions

A node's `description: diffDescription([...templates])` renders a diff; the nearest `descriptionParamCalculator` **up the rule tree** supplies the params (so one root-level calculator can serve every node). Template selection is by *suitability* — the template whose `{{params}}` are all present wins, so an ordered list degrades gracefully (omit a param to drop its clause).

- **Compose descriptions by two consistent principles so every family reads alike.** *Identity
  enrichment*: an add/delete of a whole entity carries its defining detail inline — a column
  facet's value, an index/PK's key columns, an FK's local + referenced columns, a check's
  expression. *Attribute change*: a single field flipping names the attribute, identifies the
  entity by name only, and appends `from '<old>' to '<new>'` — nullability, an index `unique`
  flip, an FK on-delete action. Truncate potentially long free-text values (comments,
  expressions) to a shared constant. `src/ddl/ddl.description.ts` follows this throughout.
- **Resolve entity names by slicing the diff's declaration path against the diff side's root**, not by walking `ctx` parent contexts — parent-walks follow the *crawl route*, which is wrong for a **shared** node reached via an unexpected parent.
- **A replace whose after-value is a normalized default** has its after declaration path resolved to the synthetic `#defaults` origin. A path-slicing calculator must prefer a real (root-rooted) path and fall back to the before side, or it emits a junk default description.
- `beforeValue` / `afterValue` exist only on specific `Diff` union members — guard before reading.
- **Rendering convention is spec-type-local.** If you bracket actions (`[Added]`) or quote names, do it in that spec type's templates. Do **not** change the shared core `DIFF_ACTION_TO_ACTION_MAP` — it affects every spec type.

## Type guards

Narrow `unknown` with the shared guards in `src/utils.ts` — `isObject`, `isString`, `isArray`,
`isNumber`, `isBoolean` (and `checkPrimitiveType` for "any scalar") — never hand-rolled
`typeof x === 'object' && x !== null` or `typeof x === 'string'` checks. Beyond reading
consistently, `isObject` narrows to `Record<string | symbol, unknown>`, so it also removes the
`as Record<…>` cast a manual check would otherwise need:

```ts
const readKind = (value: unknown): string | undefined =>
  (isObject(value) && isString(value.kind) ? value.kind : undefined)
```

Import them from the library `utils` (`../utils`), not from a dependency — json-crawl ships its
own `isObject`, but the api-diff guards are the canonical choice and keep one source of truth.

## Registering a new spec type

Wire it in `src/api.ts`: a `compare<Spec>(version)` engine that calls `compare(before, after, { ...<NORMALIZE_OPTIONS>, ...options, rules, fresh caches })`, an entry in `COMPARE_ENGINES_MAP`, and the `areSpecTypesCompatible` / `selectEngineSpecType` branches. Heads-up: `COMPARE_ENGINES_MAP` is typed over api-unifier's `SpecType`; when api-unifier adds a member, an exhaustive `Record<SpecType, …>` stops compiling — use `Partial<Record<…>>` + a runtime "no engine" guard.

Keep enum-like domain constants (e.g. type consumption families) with the spec type's other domain constants, using the `const {…} as const` + `type X = typeof X[keyof typeof X]` pattern — not inside a dialect-interface file that merely references the type.
