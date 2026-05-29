---
name: api-unifier-authoring
description: Extend the api-unifier normalization engine — add normalization rules, unify functions, default/replace mappings, and validators for OpenAPI, AsyncAPI, JSON Schema, and GraphAPI.
---

# Authoring the api-unifier engine

api-unifier normalizes API specs into a canonical form so semantically
equal specs compare equal (for api-diff), and reverses that for readable
output. This skill covers extending the engine itself, under `src/`.

The exhaustive pattern catalogue for unify functions —
`valueDefaults`/`valueReplaces`, contextual defaults, reverse matchers,
de-unification round-tripping — lives in
`docs/unification_rules_guidelines.md`. Read it before writing a
non-trivial unify function. This skill is the map: where things live, the
contracts that are easy to get wrong, and how to wire a new rule in.

## The pipeline

Public entry points are `normalize` and `denormalize` (`src/normalize.ts`);
everything is re-exported from `src/index.ts`. Each stage is gated by an
option flag on `NormalizeOptions` (`src/types.ts`): resolve refs → `merge`
(allOf) → `mergeTraits` → `liftCombiners` → `validate` → `unify`.
`denormalize` runs the reversible stages backward (`unify: false` plus the
`backward` passes).

Stages traverse the spec with `syncClone` from
`@netcracker/qubership-apihub-json-crawl`, matching the current path
against a **rules tree**.

## Where rules live

Rules are a path-keyed tree (`NormalizationRules = CrawlRules<NormalizationRule>`).
Keys are path segments (`'/paths'`, `'/*'`, `'/**'`); the node's own
properties (`validate`, `unify`, `merge`, …) apply to the value at that
path. Per spec type:

- `src/rules/openapi.ts`, `src/rules/openapi.jsonschema.ts`
- `src/rules/asyncapi.ts`, `src/rules/asyncapi.jsonschema.ts`
- `src/rules/jsonschema.ts`
- `src/rules/graphapi.ts`
- Property-name constants in the matching `src/rules/*.const.ts` — **never
  use bare string literals** for property keys.

Every spec type is registered in the `RULES` map in `src/rules/index.ts`,
keyed by `SpecType`. A new spec version means a new `SpecType` (see
`src/spec-type.ts`) plus an entry here.

Reusable unify functions and mappings live in `src/unifies/`
(`defaults.ts`, `replaces.ts`, `type.ts`, `enums.ts`, `required.ts`,
`empty-schema.ts`, …). Validators live in `src/validate/checker.ts`
(`checkType`, `checkContains`, `checkNotEmptyType`, type constants).

## Writing a unify function

A `UnifyFunction` is either a forward-only `TransformFunction` or a
`{ forward, backward }` pair. Choose with this rule (full reasoning in the
guidelines doc): **forward-only** for permanent normalization that is
strictly cleaner reversed (dedup, redundant-constraint removal);
**forward/backward** when the forward pass injects something absent from
the source (synthetic defaults, sentinel replacements) that must be
stripped for readable de-unified output.

Four contracts the engine assumes — getting any wrong corrupts output:

1. **Guard, then transform.** Return the input untouched until you have
   confirmed it is worth changing: type check (`isObject(jso) && !isArray(jso)`),
   then state (`isPureCombiner`, `isBroken`), then your business condition.

2. **Never mutate the input in a forward pass; return a new object.** Use
   the lazy shallow-copy pattern — copy only on first real change, return
   the original reference when nothing changed.

3. **Do not recreate nested object properties.** Other nodes may share a
   reference to a nested value; replacing it wholesale breaks that
   sharing. Shallow-copy only the level you are changing. (This warning is
   load-bearing — see the note above `UnifyFunction` in `src/types.ts`.)

4. **Maintain origins metadata.** When you add a property, add its origins
   under `options.originsFlag`; when you remove properties, call
   `cleanSeveralOrigins`. Origins drive change tracking and the
   `commonOriginsCheck` test helper will fail if they are missing or
   stale.

Report recoverable problems through `ctx.options.onUnifyError?.(message,
path, jso, error)` rather than throwing — see `deduplicateParameters`.

## Composing and registering

Prefer composing existing pieces over reimplementing: spread base default
maps, reuse `TO_EMPTY_OBJECT_MAPPING` / `TO_EMPTY_ARRAY_MAPPING`, and edit
inherited `unify` arrays with `insertIntoArrayByInstruction` /
`replaceValue` / `concatArrays` (the OpenAPI-over-JSON-Schema rules show
this). Order matters inside a `unify` array — defaults before the replaces
that consume their markers.

After adding a rule:

- Wire it into the spec type's rules tree and, for a new spec type, into
  `RULES`.
- Add or extend a validator node (`validate: checkType(...)`) for any new
  property you introduce.
- Add round-trip tests (`normalize` then `denormalize`) — see the
  `api-unifier-testing` skill.
