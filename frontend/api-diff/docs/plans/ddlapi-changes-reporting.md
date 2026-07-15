# Plan: ddlapi change reporting in api-diff

## 1. Goal & guiding use case

Add **ddlapi** (`ddlapi-1.0`) as a first-class specification type that api-diff can
compare, classify, and describe — identifying changes between two versions of a database
schema represented as a ddlapi `Realm`.

The **intended consumer is a reporting/BI maintainer** (e.g. someone owning Apache Superset
dashboards) who reads data only via `SELECT`. A dashboard was built against version *A* of
the schema; version *B* rolls out; they need to know **which schema changes require them to
adapt the dashboard, and which are safe to ignore.**

**The classification contract — "query still runs" (executional compatibility).** A change is:
- **`breaking`** iff there exists a query that was valid against the old schema and now **fails
  to execute** against the new schema (relation/column gone, or an operation that was type-valid
  is no longer type-valid).
- **`non-breaking`** iff **every previously-valid query still executes** — even if the *results*
  differ (a value is truncated, a NULL now appears, a category disappears). **Result-correctness
  is deliberately outside this contract** (we cannot know the dashboard's queries from the schema
  alone; pretending to judge correctness produces an inconsistent, over-broad "breaking").
- **`annotation`** for documentation-only changes (descriptions).

This is the single axis used everywhere below — not *"is this DDL backward compatible for a
writer?"* and explicitly not *"do my numbers stay the same?"*. (Result-shifting-but-still-running
changes — NULL introduction, precision/size narrowing, enum value removal — are therefore
`non-breaking`; §13 notes an optional future *data-quality* signal for those who want them
surfaced separately.)

This is consistent with how api-unifier already supports ddlapi (normalization), and reuses
the same dialect-split mechanism. The two libraries are linked via `npm link` for now.

## 2. Current state (verified in this branch)

**api-unifier — ddlapi normalization already landed:**
- `src/spec-type.ts` — `SPEC_TYPE_DDL_API_1 = 'ddlapi-1.0'`, `SPEC_TYPE_DDL_API_TYPE_FAMILY`,
  `isDdlApi`, and a `resolveSpec` branch that recognises a Realm by its `ddlapi` version
  string (deliberately placed before the JSON-Schema fallthrough).
- `src/rules/ddlapi.ts` — `ddlApiRules(version, dialect)`: the driver-neutral rules tree
  (Realm → schemas → tables → columns/indexes/foreignKeys/attrs/objects), `DDL_API_NORMALIZE_OPTIONS`.
- `src/rules/ddlapi.dialect.ts` — `DdlApiDialect` registry interface + `DIALECT_ID_POSTGRES`.
- `src/rules/ddlapi.postgres.ts` — `DIALECT_POSTGRES` implementation (PG escape-hatch kinds,
  primitive defaults).
- `src/rules/index.ts` — wires `ddlApiRules(SPEC_TYPE_DDL_API_1, DIALECT_POSTGRES)`.
- `src/unifies/ddlapi.ts`, `src/define-ddlapi-origins.ts` — nullability defaulting, dangling-FK
  reporting, model-aware origins.

**api-diff — nothing ddlapi yet.** There is no `src/ddl/`. (A prototype existed ~9 days ago in
a different session/branch — see memory `project-ddl-prototype` — but it is **not present in
`feature/ddl`**. Its architectural findings are reused below but the code must be re-created.)

**api-diff — the two prerequisite core changes are also not yet done here:**
- `createPropertyMappingResolver` still lives in `src/asyncapi/asyncapi3.mapping.ts` (imported
  by `asyncapi3.rules.ts`); it has **not** been extracted to `src/core/mapping.ts`.
- There is **no** rule-level mechanism to suppress a diff for a specific property.

## 3. How api-diff registers a spec type (the integration contract)

A new spec type is added by:
1. Resolving it in api-unifier `resolveSpec` → already done (`SPEC_TYPE_DDL_API_1`).
2. Adding an engine to `COMPARE_ENGINES_MAP` in `src/api.ts`:
   ```ts
   [SPEC_TYPE_DDL_API_1]: compareDdlApi(SPEC_TYPE_DDL_API_1),
   ```
3. Teaching `areSpecTypesCompatible` / `selectEngineSpecType` in `src/api.ts` about ddlapi
   (ddlapi only compares against ddlapi; no cross-version coercion in v1 since there is one
   version).
4. An engine module mirroring `src/asyncapi/asyncapi3.compare.ts`:
   ```ts
   export const compareDdlApi = (version: typeof SPEC_TYPE_DDL_API_1) =>
     (before, after, options: StrictCompareOptions): CompareResult =>
       compare(before, after, { ...options, rules: ddlRules({ mode: options.mode, version }, DIALECT_DIFF_POSTGRES) })
   ```

## 4. Module layout (`src/ddl/`)

Mirror the per-protocol convention used by `src/asyncapi/` and `src/jsonSchema/`:

| File | Responsibility |
| --- | --- |
| `src/ddl/index.ts` | Re-exports (`compareDdlApi`, public types). |
| `src/ddl/ddl.compare.ts` | Engine entry `compareDdlApi(version)` → `compare(...)` with the rules tree. |
| `src/ddl/ddl.rules.ts` | **Core SQL** `CompareRules` tree: `ddlRules(options, dialect)`. Realm → schema → table → column/columnType/index/foreignKey/attr. Attaches `$` classifiers, `mapping`, `description`, `descriptionParamCalculator`, `adapter`, and the new suppress-diff flag. |
| `src/ddl/ddl.classify.ts` | `ClassifyRule` exports (nullability, type-change, attr-presence, enum-values…) and the SQL **type-compatibility** function. |
| `src/ddl/ddl.mapping.ts` | `MappingResolver`s for ddlapi arrays (tables, columns, attrs, indexes, foreignKeys, enum values). |
| `src/ddl/ddl.description.ts` | Description templates + `DiffTemplateParamsCalculator`s (param extraction via api-unifier path matcher + origins). |
| `src/ddl/ddl.dialect.ts` | `DdlDiffDialect` registry interface (the diff-side analogue of api-unifier's `DdlApiDialect`). |
| `src/ddl/ddl.postgres.ts` | `DIALECT_DIFF_POSTGRES` — PG-specific classify/description rules. |
| `src/ddl/ddl.const.ts` | Property-name / kind constants re-exported from ddlapi, template-param keys. |

Import the ddlapi model enums (`TypeKind`, `AttrKind`, `ObjectKind`, `ExprKind`,
`DdlapiProperties`, PG variants) from `@netcracker/qubership-apihub-ddlapi`, exactly as
api-unifier does — never hand-duplicate the strings (apply the `ddlapi-using` skill).

## 5. Core SQL vs dialect-specific split

**Decision: mirror the api-unifier registry from day one.** Define a diff-side registry that
the core dispatchers consult for kinds they do not classify:

```ts
// ddl.dialect.ts
export const DIALECT_ID_POSTGRES = 'postgres'
export interface DdlDiffDialect {
  readonly id: DialectId
  /** classify/describe rules for a dialect-specific Attr kind, or undefined to fall back. */
  attrRulesFor(kind: string): CompareRules | undefined
  objectRulesFor(kind: string): CompareRules | undefined
  typeRulesFor(kind: string): CompareRules | undefined
  /** dialect override of SQL type-consumption-family mapping (see §7). */
  typeFamilyFor?(schemaType: unknown): TypeConsumptionFamily | undefined
}
```

`ddlRules(options, dialect)` owns all **core SQL** rules (the closed, driver-neutral unions:
Integer/Decimal/Float/String/Binary/Time/Bool/JSON/UUID/Enum types; Comment/Check/Charset/
Collation/GeneratedExpr attrs; Table/View/Index/ForeignKey objects). Anything the core
dispatcher does not recognise is delegated to `dialect.*RulesFor(kind)`; a dialect miss falls
back to **`unclassified` for add/remove/replace** (O3), expressed once as a root-level `/**`
catch-all rule (`$: allUnclassified`) rather than per-node fallbacks. This is structurally identical to
`ddlApiRules` ↔ `DdlApiDialect` in api-unifier, so the two libraries stay aligned and a future
dialect (MySQL, …) is a new module on each side with no core edits.

**Dialect selection (interview decision): hardcode PostgreSQL for now.** The spec type is just
`ddlapi-1.0` with no dialect inside it, and api-unifier likewise hardcodes `DIALECT_POSTGRES` in
its `RULES` map. `compareDdlApi` therefore binds `DIALECT_DIFF_POSTGRES` directly (no detection,
no caller option). The registry seam exists so that swapping/adding a dialect later is a
one-line change plus a new module — but until a second dialect is real, there is exactly one
binding, kept deliberately parallel to api-unifier.

**Why enum is in scope for v1:** `EnumType` is a *core* `TypeKind`, but enum **value-set
changes** are the clearest example of a domain change that must be classified by a rule which a
dialect can refine (PostgreSQL models enums as first-class `CREATE TYPE … AS ENUM`). Including
it now exercises both the core classifier and the dialect override seam end-to-end.

## 6. Diff cases — phased scope

Scope is curated by **reader relevance** (the Superset use case), staged so the first
iteration delivers exactly the breaking/non-breaking calls a dashboard maintainer acts on,
plus the two enabling core mechanisms, plus one dialect-direction case (enum).

### Phase 1 — reader-critical structural changes + enabling mechanisms

| # | Description | Action | Classification |
|---|---|---|---|
| 1 | Added table `<t>` [in schema `<s>`] | add | non-breaking |
| 2 | Deleted table `<t>` [in schema `<s>`] | remove | **breaking** |
| 3 | Added column `<c>` to table `<t>` [in schema `<s>`] | add | non-breaking |
| 4 | Deleted column `<c>` from table `<t>` | remove | **breaking** |
| 5 | Changed type for column `<c>` of table `<t>` from `<old>` to `<new>` | replace | **type-compatibility fn** (§7) |
| 6 | Changed nullability … from nullable to not nullable | replace | non-breaking |
| 7 | Changed nullability … from not nullable to nullable | replace | non-breaking |
| E1 | Added value `<v>` to enum `<type>` [in schema `<s>`] | add | non-breaking |
| E2 | Removed value `<v>` from enum `<type>` [in schema `<s>`] | remove | non-breaking |

Enum value add **and** remove are `non-breaking` (interview decision): the allowed-value set is a
write constraint; a `SELECT` still returns whatever values exist in the data, and PostgreSQL
forbids dropping a value still in use. A removed value simply means a category that can no longer
appear — existing query results stay correct (a filter for it returns empty, it does not error).

Enum stays the phase-1 dialect-direction exemplar even though both outcomes are non-breaking: it
exercises set-mapping, the dialect seam, and the shared-instance contract (one enum typing many
columns). **Breaking coverage in phase 1 comes from cases 2, 4, and 5** (delete table, delete
column, cross-family type change) — the changes that make a previously-valid query fail.

Plus the two core mechanisms (§9): **createPropertyMappingResolver extraction** and the
**suppress-diff rule** (used to hide `kind` discriminator changes).

### Phase 2 — column metadata (low reader-risk, completes the column story)

| # | Description | Action | Classification |
|---|---|---|---|
| 8 | Added default `<d>` for column `<c>` of table `<t>` | add | non-breaking |
| 9 | Deleted default for column `<c>` of table `<t>` | remove | non-breaking |
| 10 | Changed default … from `<old>` to `<new>` | replace | non-breaking |
| 11 | Added description for column `<c>` of table `<t>` | add | annotation |
| 12 | Deleted description for column `<c>` of table `<t>` | remove | annotation |
| 13 | Changed description for column `<c>` of table `<t>` | replace | annotation |
| 11s–13s | Same three actions for **table** and **schema** descriptions | add/remove/replace | annotation |

Descriptions are in scope at **schema, table, and column** levels (interview decision; views too
once views land in phase 4). All come from PostgreSQL `COMMENT ON …`, which the ddlapi parser
already handles (`comment.ts`) and stores as `Comment` attrs on the respective node — so the same
`Comment`-attr mapping + templates serve every level, only the entity word in the template
changes.

### Phase 3 — constraints & access structures (non-breaking for a reader)

Index add/remove, primary-key add/remove, foreign-key add/remove, check add/remove — all
`non-breaking` per the rationale (indexes are performance-only; FKs and checks are
write-constraints invisible to `SELECT`). Table/column/index/FK **rename** detection is a
separate, harder problem (mapping heuristics) — deferred and called out in open questions.

### Phase 4 — views & PostgreSQL escape-hatch objects (future scope — not in the M0–M5 execution plan)

Views, PG `Domain`/`RangeType`/`CompositeType`/`ExcludeConstraint`, identity/partition/trigger
attrs. Classified opaquely (whole-object add/remove) until a concrete reader-impact rule is
justified. Tracked under "Future scope" in §12, not scheduled in the current execution plan.

### Classification rationale (reader perspective — carried from the brief)

Restated against the single "query still runs" contract (§1): `breaking` ⇔ a previously-valid
query now fails to execute.

- **Table / column deleted** → breaking: a `SELECT` referencing the object now fails (relation
  or column no longer resolves).
- **Type change** → see §7. Cross-family is breaking because an operation that was type-valid
  (e.g. `SUM` on a number, `LOWER` on text) is no longer valid; same-family never invalidates an
  operation → non-breaking.
- **Table / column added** → non-breaking: existing queries are untouched.
- **Nullability, either direction** (not-null→nullable *and* nullable→not-null) → non-breaking:
  a nullability change never makes a `SELECT` fail to execute. (not-null→nullable may let NULLs
  affect results, but that is outside the contract — §1.)
- **Enum value add or remove** → non-breaking: the allowed-value set is a write constraint; no
  `SELECT` fails to execute (a removed category simply stops appearing).
- **Index / FK / check / primary-key / unique add or remove, default add/remove/change** →
  non-breaking: performance or write-time only; no query is invalidated. (Primary-key/unique
  changes alter table *grain*, which can shift `COUNT(DISTINCT)`/dedup results, but no query
  fails to run → non-breaking.)
- **Description changes** (schema/table/column) → annotation: documentation only.

## 7. Column type-change classification (case 5)

**Decision: a dedicated SQL type-compatibility function**, modelled on
`isTypeAssignable`/`typeClassifier` in `src/jsonSchema/jsonSchema.classify.ts`, but expressed
in terms of **reader consumption families** rather than raw SQL type names.

`ColumnType` is `{ type: SchemaType, raw: string, null: boolean }` where `SchemaType`
(`ColumnType.type`) carries a `kind` (`IntegerType`, `DecimalType`, `StringType`, `TimeType`,
`EnumType`, …) plus its own params. **The type comparison runs on the `type` property (the
`SchemaType`); `kind` and `raw` are suppressed (§9b).**

- `column.type.type` (the `SchemaType`) is the **single source of truth** for the type-change
  classification.
- `column.type.raw` (the raw SQL string, e.g. `'integer'`, `'varchar(255)'`) is **suppressed**:
  it changes redundantly with `type` and would otherwise double-report and collide with it in
  `mergedJsoCache`. Suppressing it both removes the noise and resolves the collision the
  prototype's `columnTypeAdapter` was working around — so **the adapter is dropped** (it also
  cloned the node, which would break shared-instance identity — see §8A).
- every `kind` discriminant is **suppressed** everywhere (§9b).

Define:

```ts
type TypeConsumptionFamily = 'numeric' | 'textual' | 'temporal' | 'boolean'
                           | 'binary' | 'uuid' | 'json' | 'enum' | 'opaque'

// maps a SchemaType to how a dashboard consumes its values
function consumptionFamily(t: SchemaType, dialect): TypeConsumptionFamily
```

Classification of `old → new` on `column.type.type`, under the "query still runs" contract (§1):
- **Same family** → `non-breaking`: every operation that was type-valid on the old type is still
  type-valid on the new one (smallint→integer→bigint, varchar(50)→varchar(200), float→decimal,
  timestamp→date all keep `numeric`/`textual`/`temporal` operations valid). **Within-family
  precision/size changes — including narrowing/loss — are `non-breaking`** (O1): the query still
  executes; the fact that a value may be truncated or rounded is a *result* change, which is
  outside the contract. (An optional data-quality signal — §13 — can surface these for callers
  who want them.)
- **Cross-family** → `breaking`: an operation that was type-valid is no longer valid — `SUM` /
  arithmetic on a now-textual column, `LOWER` / `||` on a now-numeric column, date functions on a
  now-textual column — so a previously-valid query fails to execute.
- **`opaque`/dialect type on either side, or family undecidable** → `breaking` (conservative: we
  cannot prove operations remain valid).

**Canonicalization is already handled by the ddlapi parser** (verified in
`ddlapi/src/parser/typeMapper.ts`), which is why comparing `type` (not `raw`) is safe and
false-positive-resistant: `int`/`integer`/`int4` all map to `IntegerType('integer')`,
`serial`→`IntegerType`, and — notably — `timetz`→`Time`, `timestamptz`→`Timestamp` (**the model
collapses timezone**). So two syntactically different but semantically equal DDLs produce equal
`SchemaType`s → no diff. (`varchar` vs `varchar(255)` *do* differ in `size` and *should* — that
is a real semantic difference, not a false positive.) Because the model already collapses
timezone and serial-ness, the coarse family model is aligned with what the model can even
distinguish — splitting temporal by tz is not possible without the escape hatch, reinforcing the
coarse-families-in-v1 choice.

**Result-drift (out of the breaking/non-breaking contract):** within-family changes that the
model *can* see and that keep every query executing but may change *values* — `float`↔`decimal`
(exactness), decimal precision/scale narrowing, `timestamp`→`date` (time component loss), and
nullability not-null→nullable (NULLs appear). These are `non-breaking` by definition (§1). If
callers need them flagged, the right vehicle is a **separate, optional "data-quality"/result-drift
signal** (a new classification axis or a `risky` annotation) — *not* a reclassification to
breaking, which would re-introduce the inconsistency the contract was chosen to remove. Out of
scope for v1; noted in §13.

`consumptionFamily` is **core SQL** for the closed kinds; a dialect may override via
`DdlDiffDialect.typeFamilyFor` for its escape-hatch types (e.g. PG `Domain` resolves to its
base type's family). The classifier is the `replace` slot of the `column.type.type` rule:

```ts
export const columnTypeClassifier: ClassifyRule = [
  breaking, breaking, // add/remove of a whole type node — not normally reached for a mapped column
  ({ before, after }) => breakingIf(!sameConsumptionFamily(before.value, after.value)),
]
```

## 8. Mapping resolvers

ddlapi collections are arrays whose elements have stable identity keys, so the default
positional `arrayMappingResolver` is wrong — it would report a reorder as add+remove. Add
identity-based resolvers in `ddl.mapping.ts`:

| Collection | Identity key | Notes |
| --- | --- | --- |
| `schemas[]` | `name` | |
| `tables[]` | `name` | enables "added/deleted table" at element granularity |
| `columns[]` | `name` | enables column add/remove and per-column field diffs |
| `indexes[]`, `foreignKeys[]` | `name` / `symbol` | phase 3 |
| `attrs[]` | composite `kind` (+ `name` for named attrs like Check) | a Comment attr is a singleton-per-owner → key on `kind` alone; this is what powers description add/remove/change (cases 11–13) |
| `EnumType.values[]` | the value string itself (set semantics) | use `deepEqualsUniqueItemsArrayMappingResolver` + `ignoreKeyDifference`; powers E1/E2 |

The attr resolver is the prototype's `tableAttrsMappingResolver` idea generalised: composite
`kind:name` for named attrs, bare `kind` for singletons. Column **description** lives in
`column.attrs[]` as a `Comment` attr (`{ kind: 'Comment', text }`), so add/remove/change of the
Comment attr maps directly to cases 11/12/13.

**Empty-array test-data note (from prototype memory):** when `before` lacks an array property
entirely, the engine fires one coarse add/remove for the whole array, bypassing element-level
rules. api-unifier's normalization already defaults absent ddlapi arrays to `[]`
(`TO_EMPTY_ARRAY_MAPPING`), so **post-normalization inputs will have explicit `[]`** and
element-level rules fire correctly — tests must compare *normalized* Realms (they will, since
the engine normalizes), but any hand-built fixtures must include the empty arrays.

## 8A. Shared diff-instance contract & the merged document

`apiDiff` returns `{ diffs, merged }` (see `CompareResult`). The **merged document** is a
single tree that embeds diff metadata, and a hard contract holds: **when one logical entity is
referenced from several places, the change to it is represented by the *same* `Diff` instance
at every reference site.** Examples that matter for ddlapi:
- an `EnumType` used to type several columns → adding a value yields **one** diff, shared at
  every column that uses that enum;
- a `Column` instance that is also part of an index (`indexPart.column`) and/or a foreign key
  (`fk.columns`/`fk.refColumns`) → a change to that column's type is **one** diff, shared at the
  table column, the index part, and the FK column.

**This is already provided by the core engine** — no new mechanism needed — via two cooperating
caches in `src/core/compare.ts`:
- `createdMergedJso: Set<JsonNode>` — when the crawl reaches a merged node it has already
  produced (a shared or cyclic instance reached by a second parent), it returns `{ done: true }`
  and reuses the existing merged node *together with its attached diff meta*. So the merged tree
  keeps one node (and one meta record) per shared instance.
- `diffUniquenessCache` — `getOrCreateChildDiff{Add,Remove}` key each diff by footprint
  `[value, declarationPathsId, scope, action, apiCompatibility]`. A normalized node's
  declaration paths are intrinsic to the node (set by api-unifier origins), not a function of the
  traversal route, so every visit resolves to the **same** cached `Diff`.

**Why it works for ddlapi specifically:** api-unifier's ddlapi normalization preserves *object
identity* for shared entities — `indexPart.column` is the same instance as the table column, FK
columns reference table column instances, and the lazy `fk.refTable` edge points at the same
table object. The engine's shared-instance handling then "just works" on that graph.

**Constraints this puts on ddlapi rules (must-follow):**
- **Never clone or structurally replace a shared node in an `adapter`.** An adapter that returns
  a new object for `column.type`/`column`/enum would split one instance into many and break the
  shared-diff contract. This is the decisive reason to use **suppress-diff (§9b) instead of the
  prototype's `columnTypeAdapter`.**
- Suppression of `kind`/`raw` (§9b) operates in place and does not break identity.
- Mapping resolvers must key on identity-stable fields (§8) so a shared instance maps to itself.

**This must be explicitly tested** (see test area 9): assert not just *that* a diff exists but
that it is the **same object reference** in `merged` at every usage site (and appears once in
`diffs`).

## 8B. Public output for the consumer

`apiDiff` already returns `{ diffs, merged }`; the BI consumer is served by **exposing all three
existing views, with no new verdict abstraction** (interview decision):

1. **`diffs: Diff[]`** — the flat list. Each carries `action`, classification `type`,
   `description` (the human-readable string from §10), and `before/afterDeclarationPaths`
   (location into the Realm). This is the migration checklist.
2. **`merged`** — the merged Realm with diff meta attached at each changed node, preserving the
   shared-instance contract (§8A).
3. **`aggregateDiffsWithRollup(merged, DIFF_META_KEY, AGG_KEY)`** — the **existing** core helper
   (re-exported from `src/index.ts`). It walks `merged` and attaches, at every node, a
   `Set<Diff>` of *all* diffs in that node's subtree. So the consumer can ask "all changes under
   schema X / table Y" directly. It is a **structural** index — it collects diff objects, it does
   **not** compute a severity score.

**No worst-case "is this table safe?" verdict helper is added** (interview decision): api-diff
stays a pure classifier. Folding a `Set<Diff>` into a single verdict (and any severity ordering,
including where `unclassified` ranks) is the consumer's policy, not the library's. This keeps the
surface small and avoids baking a BI policy into a general diff tool. (If demand appears, revisit
as a generic core helper, not a ddl-only one.)

**Reporting policy — report everything, suppress nothing beyond `kind`/`raw`** (interview
decision): non-breaking-but-actionless changes (index/FK/check/PK/unique add-remove, default
changes) are still emitted as `nonBreaking`, not dropped. Completeness and auditability win, and
it matches every other spec type's behavior; the consumer filters by classification if it wants a
breaking-only checklist. The suppress-diff rule (§9b) stays narrowly scoped to the technical
`kind` discriminator and the redundant `raw` string.

## 9. New core mechanisms (prerequisites, shared beyond ddlapi)

### 9a. Move `createPropertyMappingResolver` to `src/core/mapping.ts`

Move the function from `src/asyncapi/asyncapi3.mapping.ts` into `src/core/mapping.ts`
(alongside `arrayMappingResolver`/`objectMappingResolver`) and re-export it from `src/core`.
**Do not leave a re-export in `asyncapi3.mapping.ts`** — instead update the import in
`asyncapi3.rules.ts` (and any other consumer) to point at the new core location. ddlapi imports
it from core too. Pure refactor — covered by existing AsyncAPI tests plus a new direct unit
test.

### 9b. Suppress-diff rule key

**Decision: a new core rule-node flag**, not an adapter. The `kind` property is a technical
type discriminator with no domain meaning; an end user must never see "changed kind from X to
Y". Add an opt-in rule on a `CompareRule` node — proposed `IGNORE_DIFFERENCE_RULE`
(`'ignoreDifference'`, boolean) — that instructs the engine to **not emit** add/remove/replace
diffs for that node (and, by a documented policy, not for its subtree).

Implementation site: `useMergeFactory` in `src/core/compare.ts`. **Resolved mechanism (see task
T0.2): suppress at hook entry, not by filtering `addDiff`.** When the node's resolved rule has
`ignoreDifference: true`, assign the merged value (`mergedJso[mergeKey] = afterValue`, or
`beforeValue` on removal) and `return { done: true }` **before** any diff is created and before
descending. This gives **whole-subtree** suppression (O4) in one place with no wasted child
crawl, and keeps the merged document structurally complete. Filtering at `addDiff` was rejected:
it would only hide the node's own diff while still descending and emitting child diffs. Contrast
with the existing `ignoreKeyDifference` flag, which only silences *key-rename* diffs — this is
broader (whole-subtree, all actions). The one boundary: add/remove of a *whole* suppressed node is
decided by the parent mapping (`exitHook`), not intercepted here — fine for `/kind` and
`column.type.raw`, which are always present on both sides (see T0.2).

Wired into ddlapi rules at:
- `'/kind': { ignoreDifference: true }` on **every** node that carries a `kind` discriminant
  (technical, no domain meaning).
- `column.type` → `'/raw': { ignoreDifference: true }` — `raw` is redundant with `type` (§7);
  suppressing it removes double-reporting and the `mergedJsoCache` collision without an adapter.

This **replaces** the prototype's `columnTypeAdapter` entirely (the adapter would also have
violated the shared-instance contract — §8A). Because suppression is in-place, it does not
affect node identity.

Both 9a and 9b are spec-type-agnostic and must be designed/reviewed as core changes (apply the
`api-diff-authoring` skill).

## 10. Human-readable descriptions

Reuse the existing description engine (`src/core/description.ts`): a node's `description` rule
returns a `DiffDescriptionRule` built from `diffDescription(templates)`, and the nearest
`descriptionParamCalculator` up the rule tree supplies the substitution params. Template
selection is by *suitability* (the template whose `{{params}}` are all present wins), so a small
ordered template list naturally degrades (e.g. drop the `in schema <s>` clause for the default
schema by omitting the `schemaName` param).

**Minimise templates** by composing from shared fragments, exactly as the brief sketches:

- `action` — `[Added]`/`[Deleted]`/`[Changed]` via `DIFF_ACTION_TO_ACTION_MAP`.
- `entity` — `column <c>` / `table <t>` / `index <i>` / `enum <type>` …
- `position` — `of table <t>[ in schema <s>]`, schema clause omitted when default schema.
- `from <old> to <new>` — only for `replace` with both values resolvable.

Proposed template families (suitability picks the variant; the `in schema` variant wins only
when a non-default `schemaName` param is supplied):
```text
"{{action}} table {{tableName}}"
"{{action}} table {{tableName}} in schema {{schemaName}}"
"{{action}} column {{columnName}} {{preposition}} table {{tableName}}"
"{{action}} column {{columnName}} {{preposition}} table {{tableName}} in schema {{schemaName}}"
"{{action}} {{facet}} for column {{columnName}} of table {{tableName}}"                                  // facet ∈ {type, nullability, default, description}
"{{action}} {{facet}} for column {{columnName}} of table {{tableName}} in schema {{schemaName}}"
"{{action}} {{facet}} for column {{columnName}} of table {{tableName}} from {{oldValue}} to {{newValue}}"
"{{action}} {{facet}} for column {{columnName}} of table {{tableName}} in schema {{schemaName}} from {{oldValue}} to {{newValue}}"
"{{action}} value {{enumValue}} {{preposition}} enum {{enumTypeName}}"
"{{action}} value {{enumValue}} {{preposition}} enum {{enumTypeName}} in schema {{schemaName}}"
```
Phase-2 description-at-object-level (cases 11s–13s) reuses the `table`/`schema` families above
with `facet=description`. **Phase 3 (tasks T5.1–T5.3) adds three more "`<entity> <name> on table
<t>`" families** (each with an optional `in schema` variant) for index, primary key, foreign key,
and check — e.g. `"{{action}} index {{indexName}} on table {{tableName}}"`. These are introduced
by the phase-3 tasks, not phase-1.
The `facet`+(`from/to`)×(`in schema`) family collapses cases 5,6,7,8,9,10,11,12,13 into four
variants. The **enum** family (cases E1/E2) now carries the optional `in schema {{schemaName}}`
clause, per the requirement. `preposition` comes from the action map (add→`to`, remove→`from`).

**Param extraction via path matcher + origins.** Each entity's `descriptionParamCalculator`
resolves the diff's declaration paths (`resolveAllDeclarationPath(diff)`), then uses the
api-unifier path matcher (`matchPaths` with `PREDICATE_ANY_VALUE`/`PREDICATE_UNCLOSED_END`
predicates over ddlapi property names — `schemas`/`*`/`tables`/`*`/`columns`/`*`/…) to (a) pick
the matching template family and (b) pull `tableName`/`columnName`/`schemaName`/`enumTypeName`
from the resolved nodes, and `oldValue`/`newValue` from `diff.beforeValue`/`afterValue`. This
is the same pattern as `parameterParamsCalculator` in
`src/openapi/openapi3.description.parameter.ts`. The schema clause is emitted only when the
resolved schema is not the default schema (drop `schemaName` param otherwise → shorter template
wins). ddlapi origins added during normalization (`define-ddlapi-origins.ts`) back the
declaration paths.

**Wording standardisation (O5 — decided).** The brief mixes articled and article-less forms
("to the table" vs "of table" vs "of the table"). English allows either *"the table orders"*
(article + apposition) or *"table orders"* (name treated as a label); the inconsistency, not
either form, is the problem. **Decision: drop the article uniformly before an entity noun that
is immediately followed by its name** — it reads as a clean structured-change style and is
internally consistent: `table <t>`, `column <c>`, `enum <type>`. Prepositions come from the
action map (add→`to`, remove→`from`, replace-facet→`for`) and the fixed position phrase is
`of table <t>`. Net: "Added column `c` to table `t`", "Deleted column `c` from table `t`",
"Changed type for column `c` of table `t` from `int` to `bigint`", "Added description for
column `c` of table `t`". The optional schema clause is `in schema <s>`, emitted only for a
non-default schema (§O7).

## 11. Testing plan — areas to agree

A new `test/ddl.diff.test.ts` plus targeted unit tests. Apply the `api-diff-testing` skill for
file conventions and the `ddlapi-using` skill for building fixtures.

**Fixtures are built from raw SQL.** Each case authors a before- and after-SQL string and runs
it through ddlapi `buildFromDdl(...)` to get the `Realm`, then passes those to `apiDiff` (which
normalizes internally). This keeps fixtures readable, exercises the real parser→model→diff
path, and avoids hand-constructing Realm graphs (which is error-prone and risks breaking the
shared-instance identity the contract in §8A depends on). A small helper
`diffSql(beforeSql, afterSql)` wraps build+diff.

**Fixtures are full `CREATE*` snapshots, not `ALTER`s.** The ddlapi parser has only `CREATE*`
(+ `COMMENT ON`) statement handlers — there is **no `ALTER` support** — so a "change" is
expressed as two complete schema scripts (before-script vs after-script), each a set of
`CREATE TABLE` / `CREATE TYPE` / `CREATE INDEX` / `COMMENT ON` statements. The helper must also
ensure the built `Realm` carries the `ddlapi` version discriminator so `resolveSpec` routes it
to `SPEC_TYPE_DDL_API_1` (stamp it in the helper if `buildFromDdl` does not).

**Proposed test areas (for discussion):**

1. **End-to-end diff classification** — one case per phase-1 row (1–7, E1, E2): before/after SQL
   → `buildFromDdl` → `apiDiff`. **In M2 assert `action` + classification only**; the
   **description-string assertions are added in M3 (task T3.1)**, after the description engine
   exists — see Finding-1 fix in §12. Primary suite.
2. **Type-compatibility matrix** — unit tests for `consumptionFamily`/`sameConsumptionFamily`
   over a grid of SQL types (intra-family non-breaking, cross-family breaking, opaque→breaking,
   PG-domain via dialect override). Pure-function tests, no engine.
3. **Mapping resolvers** — reorder a column/table/attr list and assert *no* spurious add+remove;
   add/remove one element and assert exactly one element-level diff. Guards the identity-key
   resolvers and the attr composite key.
4. **Suppress-diff rule (core)** — a focused core test: a node with `ignoreDifference: true`
   whose value changes produces no diff but still merges; subtree policy verified. Plus an
   AsyncAPI/OpenAPI regression run to prove the new flag is inert when unset.
5. **createPropertyMappingResolver extraction** — direct unit test of the moved function +
   green AsyncAPI suite (no behavioural change).
6. **Description templates** — table-driven: default-schema vs named-schema (schema clause
   omitted), `from/to` present vs absent, each `facet`. Asserts template-suitability selection
   and wording consistency.
7. **Dialect direction (enum / PG)** — enum value add/remove classified by the core rule, and a
   stub PG-specific kind routed through `DdlDiffDialect` to prove the seam (mirrors the
   api-unifier dialect test).
8. **Negative / robustness** — identical Realms → zero diffs; `kind`/`raw` change alone
   → zero reported diffs (validates 9b); unknown dialect kind → `unclassified` fallback (O3).
9. **Merged document & shared diff-instance contract (§8A)** — the contract the user called out.
   For a shared entity, assert the diff is the **same object reference** at every usage site in
   `merged`, and appears **once** in `diffs`:
   - an enum used by several columns — before/after differ in the `CREATE TYPE … AS ENUM (…)`
     value list → one shared diff visible at every column typed by that enum;
   - a column that is part of an index and/or a foreign key — before/after differ in that
     column's `CREATE TABLE` type → one shared diff at `table.columns[c]`, `index.parts[].column`,
     and `fk.columns/refColumns`.
   Also assert the **merged document** itself is well-formed (diff meta attached at the right
   nodes, structurally complete despite suppressed `kind`/`raw`).

Phases 2–3 add rows to suite (1) and (6) and new shared-instance shapes to (9); future phase 4
adds dialect rows to (7).

## 12. Implementation task breakdown

Tasks are sized **S** (≲ ½ day), **M** (½–2 days), or **L** (> 2 days — split before starting).
Verification uses the project's real scripts (`package.json`): lint `npm run lint:check`, types
`npx tsc --noEmit`, full suite `npm test`, one file `npx jest test/<file>.test.ts`, one case
`npx jest test/<file>.test.ts -t "<name>"`.

**Definition of done (every task):** its acceptance criteria pass, `npm run lint:check` is clean,
`npx tsc --noEmit` is clean, and a full `npm test` shows **no regressions** in existing suites.

### T-SETUP — ddlapi + ddlapi-enabled api-unifier dependency  ·  S  ·  (Finding 3)

- **Depends:** — · **Files:** `package.json`, `test/ddl.setup.test.ts`
- **Do:** `@netcracker/qubership-apihub-ddlapi` is **currently a manual symlink in `node_modules`
  that is *not* declared in `package.json` and *not* in the `development:link`/`development:unlink`
  scripts** (those link unifier/json-crawl/graphapi/compatibility-suites only). Add it to
  `dependencies` (`"dev"`, matching the others) and to both link/unlink scripts. Ensure the linked
  `api-unifier` is built from the **ddlapi-enabled** source (`/c/git/apihub-ddl/api-unifier`,
  `npm run build` there) so its `dist` exports the ddlapi API. Add a smoke test.
- **Acceptance:**
  - `import { buildFromDdl } from '@netcracker/qubership-apihub-ddlapi'` resolves and is typed.
  - `import { SPEC_TYPE_DDL_API_1, DDL_API_NORMALIZE_OPTIONS, resolveSpec } from '@netcracker/qubership-apihub-api-unifier'`
    resolves (linked unifier exposes the ddlapi exports).
  - `resolveSpec(buildFromDdl('create table t(id int);'))` ⇒ `type === SPEC_TYPE_DDL_API_1`.
- **Verify:** `npx jest test/ddl.setup.test.ts` · `npx tsc --noEmit`

### M0 — core prerequisites (shared-core; no ddl code; independently reviewable)

#### T0.1 — Move `createPropertyMappingResolver` to core  ·  S  ·  (§9a)
- **Depends:** — · **Files:** `src/core/mapping.ts`, `src/core/index.ts`,
  `src/asyncapi/asyncapi3.mapping.ts`, `src/asyncapi/asyncapi3.rules.ts`, `test/core.mapping.test.ts`
- **Do:** move the function into core; **delete** it from `asyncapi3.mapping.ts` (no re-export);
  repoint `asyncapi3.rules.ts` and any other importer to `../core`.
- **Acceptance:** exported from `src/core`; `asyncapi3.mapping.ts` no longer declares/re-exports it
  (grep clean); new direct unit test passes; AsyncAPI behaviour unchanged.
- **Verify:** `npx jest test/asyncapi` · `npx jest test/core.mapping.test.ts`

#### T0.2 — `ignoreDifference` rule: resolve design + implement  ·  M  ·  (§9b; Finding 5)
- **Depends:** — · **Files:** `src/types/rules.ts`, `src/core/compare.ts`, `src/core/index.ts`,
  `test/core.ignoreDifference.test.ts`
- **Resolved design (closes the "skip at hook entry vs filter at `addDiff`" question):** implement
  at **hook entry** in `useMergeFactory`. When the node's resolved rule has
  `ignoreDifference: true`, assign the merged value (`mergedJso[mergeKey] = afterValue`, or
  `beforeValue` on removal) and `return { done: true }` **before** any diff is created and before
  descending → **whole-subtree** suppression in one place, no wasted child crawl. *Rejected:*
  filtering at `addDiff` only hides the node's own diff, still descends, still emits child diffs.
- **Scope boundary (documented):** add/remove of a *whole* suppressed node is decided by the
  **parent** mapping (`exitHook`), which entry-skip does not intercept. Acceptable for the v1
  targets (`/kind`, `column.type.raw`) since those keys are always present on both sides (mapped,
  never added/removed). General "suppress an added/removed subtree" is out of scope.
- **Acceptance:** a mapped node with `ignoreDifference:true` whose value changes ⇒ **0 diffs and 0
  meta** for it and every descendant, but `merged` still holds its after-value; sibling/parent
  diffs unaffected; with the flag absent, behaviour is identical (all suites green).
- **Verify:** `npx jest test/core.ignoreDifference.test.ts` · `npm test`

### M1 — wiring + skeleton

#### T1.1 — Engine registration in `api.ts`  ·  S
- **Depends:** T-SETUP · **Files:** `src/api.ts`, `src/ddl/ddl.compare.ts`, `src/ddl/index.ts`,
  `src/index.ts`
- **Do:** `compareDdlApi(version)` → `compare(...)` binding `DIALECT_DIFF_POSTGRES`; add to
  `COMPARE_ENGINES_MAP`; teach `areSpecTypesCompatible`/`selectEngineSpecType` (ddlapi only-vs-ddlapi).
- **Acceptance:** `apiDiff(realmA, realmA)` ⇒ `diffs: []`; `apiDiff(realm, openapiDoc)` throws the
  spec-mismatch error.
- **Verify:** `npx jest test/ddl.diff.test.ts -t "identical"`

#### T1.2 — Core rule-tree skeleton + dialect seam  ·  M
- **Depends:** T1.1, T0.2 · **Files:** `src/ddl/ddl.rules.ts`, `ddl.dialect.ts`, `ddl.postgres.ts`,
  `ddl.const.ts`
- **Do:** rule tree realm→schema→table→column/columnType/index/fk/attr mirroring api-unifier
  `ddlApiRules` shape; `/kind` + `column.type.raw` → `ignoreDifference:true`; root `/**` →
  `$: allUnclassified`; `DdlDiffDialect` interface + `DIALECT_DIFF_POSTGRES` stub (empty
  `*RulesFor`, PG default-schema name for §O7).
- **Acceptance:** identical Realms ⇒ 0 diffs; artificial `kind`-only or `raw`-only change ⇒ 0
  diffs; unknown kind change ⇒ `unclassified`.
- **Verify:** `npx jest test/ddl.diff.test.ts -t "skeleton"`

### M2 — phase-1 classification + mapping  (**`action` + classification only; descriptions in M3 — Finding-1 fix**)

#### T2.1 — Name-keyed mapping resolvers (schemas, tables, columns)  ·  M
- **Depends:** T0.1, T1.2 · **Files:** `src/ddl/ddl.mapping.ts`, `ddl.rules.ts`
- **Acceptance:** reorder tables/columns ⇒ no spurious add/remove; add/remove one ⇒ exactly one
  element-level diff.
- **Verify:** `npx jest test/ddl.mapping.test.ts`

#### T2.2 — Bespoke resolvers: `attrs[]` composite key + enum `values[]` set  ·  M  ·  (Finding 4)
- **Depends:** T1.2 · **Files:** `ddl.mapping.ts`
- **Do:** `attrsMappingResolver` — composite `kind` for singletons, `kind:name` for named attrs
  (Check, NamedDefault); enum `values[]` via `deepEqualsUniqueItemsArrayMappingResolver` +
  `ignoreKeyDifference`.
- **Acceptance:** Comment text change ⇒ one replace at the attr; add a Check attr ⇒ one add; two
  same-kind different-name attrs map independently; enum value add/remove fire at element
  granularity (no whole-array diff); enum value reorder ⇒ 0 diffs.
- **Verify:** `npx jest test/ddl.mapping.test.ts` (own `describe` block)

#### T2.3 — Table/column add-remove classifiers (cases 1–4)  ·  S
- **Depends:** T2.1 · **Files:** `ddl.classify.ts`, `ddl.rules.ts`
- **Acceptance:** 1 nonBreaking, 2 breaking, 3 nonBreaking, 4 breaking (assert `diffs[].type` +
  `action`; **no** description assertion yet).
- **Verify:** `npx jest test/ddl.diff.test.ts -t "table|column"`

#### T2.4 — SQL type-compatibility fn + columnType classifier (case 5)  ·  M
- **Depends:** T1.2 · **Files:** `ddl.classify.ts`, `ddl.dialect.ts` (`typeFamilyFor`),
  `test/ddl.type-compat.test.ts`
- **Acceptance:** same-family nonBreaking (smallint→int→bigint, varchar(50)→(200), timestamp→date);
  cross-family breaking (int↔text, date→text); opaque/unknown breaking. Full type **matrix** unit
  test (test area 2), pure-function (no engine).
- **Verify:** `npx jest test/ddl.type-compat.test.ts`

#### T2.5 — Nullability + enum-value classifiers (cases 6, 7, E1, E2)  ·  S
- **Depends:** T2.2 · **Files:** `ddl.classify.ts`
- **Acceptance:** nullability both directions nonBreaking; enum value add/remove nonBreaking; each
  still **emits** a diff (report-everything, §8B).
- **Verify:** `npx jest test/ddl.diff.test.ts -t "nullability|enum value"`

#### T2.6 — Shared-instance / merged-document contract (test area 9, §8A)  ·  M
- **Depends:** T2.4, T2.2 · **Files:** `test/ddl.merged.test.ts`
- **Acceptance:** enum used by N columns + value change ⇒ **same `Diff` object reference** at all N
  sites in `merged`, **once** in `diffs`; a column in an index **and** FK whose type changes ⇒ same
  `Diff` at `table.columns[c]`, `index.parts[].column`, `fk.columns/refColumns`; `merged`
  structurally complete despite suppressed `kind`/`raw`.
- **Verify:** `npx jest test/ddl.merged.test.ts`

### M3 — phase-1 descriptions

#### T3.1 — Description engine wiring + templates + param calculators  ·  M  ·  (Finding-1 fix)
- **Depends:** M2 (T2.3–T2.6) · **Files:** `src/ddl/ddl.description.ts`, `ddl.rules.ts`,
  `ddl.const.ts`, `test/ddl.description.test.ts`
- **Do:** templates (§10) + `descriptionParamCalculator`s using `matchPaths` over ddlapi
  property-name predicates + origins; article-less wording; optional `in schema` clause omitted
  for the dialect default schema (§O7).
- **Acceptance:** **each phase-1 case (1–7, E1, E2) emits the exact expected `description`
  string** — this is where the description assertions deferred from M2's test area 1 live;
  default-schema vs named-schema template selection verified (test area 6).
- **Verify:** `npx jest test/ddl.description.test.ts`

### M4 — phase 2: column defaults + descriptions (all schema/table/column levels)

Phase 2 runs after the description engine (M3/T3.1) exists, so classify and describe can live in
the same task. They are split **per facet only where the description logic is substantial enough
to isolate**: the default-`Expr` leaf rollup (case 10) gets its own description task (T4.2) so the
wrinkle is built and reviewed on its own, while object-level descriptions (T4.3) are end-to-end in
one task. Every phase-2 case still ends with `action` + classification + description-string
assertions — just possibly across a classify task and its paired describe task.

#### T4.1 — Default add/remove/change classifiers (cases 8–10)  ·  S
- **Depends:** T1.2, T2.1 · **Files:** `src/ddl/ddl.classify.ts`, `ddl.rules.ts`
- **Do:** `column.default` is an `Expr` (`Literal | RawExpr | NamedDefault`); api-unifier does
  **not** auto-default it, so an added default is a genuine add. Classify add/remove/replace of the
  default node (and its inner value/expr leaves) `nonBreaking`; the Expr `/kind` is already
  globally suppressed (§9b).
- **Acceptance:** case 8 add ⇒ nonBreaking, 9 remove ⇒ nonBreaking, 10 change ⇒ nonBreaking; one
  diff each; an unchanged default ⇒ 0 diffs.
- **Verify:** `npx jest test/ddl.diff.test.ts -t "default"`

#### T4.2 — Default descriptions incl. the Expr-leaf → column-default rollup (case 10)  ·  M
- **Depends:** T4.1, T3.1 · **Files:** `src/ddl/ddl.description.ts`, `ddl.rules.ts`,
  `test/ddl.description.test.ts`
- **Do:** add a `descriptionParamCalculator` branch matching the default path
  (`…/columns/*/default` and its `…/default/value`|`/expr` leaves) via `matchPaths`. **Resolve the
  known case-10 wrinkle** (prototype produced *no* description because a change inside the `Expr`
  surfaces as a *leaf* diff at `default.value`/`default.expr`): the calculator must `PARENT_JUMP`
  up to the column to fill `columnName`/`tableName` and read `before`/`after` Expr values for the
  `from … to …` template (facet=`default`).
- **Acceptance:** cases 8/9/10 emit the exact strings, including `… from <old> to <new>` for case
  10; default-schema clause omitted; named-schema variant selected when non-default.
- **Verify:** `npx jest test/ddl.description.test.ts -t "default"`

#### T4.3 — Descriptions at schema / table / column levels (cases 11–13, 11s–13s)  ·  M
- **Depends:** T2.2 (attrs composite-key resolver), T3.1 · **Files:** `ddl.classify.ts`,
  `ddl.rules.ts`, `ddl.description.ts`, `test/ddl.description.test.ts`
- **Do:** a description is a `Comment` attr (`{ kind:'Comment', text }`) in `attrs[]` at the
  schema, table, and column nodes (all parsed by ddlapi `comment.ts`). Classify Comment
  add/remove/replace `annotation`; the description template's entity word
  (`schema`/`table`/`column`) is chosen by which node-level path matched.
- **Acceptance:** column, table, and schema description add/remove/change ⇒ `annotation` with the
  correct entity word and exact string; reordering unrelated attrs ⇒ 0 diffs (validates the
  composite-key resolver from T2.2 at the Comment level).
- **Verify:** `npx jest test/ddl.description.test.ts -t "description"`

### M5 — phase 3: constraints & access structures (all `nonBreaking` for a reader)

New fixtures live in `test/ddl.constraints.test.ts`. Each task classifies + describes together.

#### T5.1 — Indexes + primary key + unique: mapping, classify, describe  ·  M
- **Depends:** T2.1, T3.1 · **Files:** `ddl.mapping.ts`, `ddl.classify.ts`, `ddl.rules.ts`,
  `ddl.description.ts`, `test/ddl.constraints.test.ts`
- **Do:** `table.indexes[]` name-keyed resolver; `index.parts[]` keyed by **referenced column
  name** so that adding/removing a column is a clean element diff (and the two parts of a swap map
  to themselves). `table.primaryKey` is a **single** `Index` node (present/absent → add/remove);
  `index.unique` is a boolean. Classify index add/remove, PK add/remove, unique flip, part
  add/remove, **and part order (`seqNo`) changes** all `nonBreaking`. New template family:
  `"{{action}} index {{indexName}} on table {{tableName}}"`,
  `"{{action}} primary key on table {{tableName}}"` (+ optional `in schema` clause) — extends §10.
- **Order-change policy (decision):** an order-only change inside a composite index is a real
  change to the access structure, so — consistent with the "report everything" policy (§8B) — it
  is **reported as `nonBreaking`, not suppressed**. With parts keyed by column name, a pure reorder
  surfaces as `nonBreaking` `seqNo` replace diffs on the moved parts (not as add/remove churn).
- **Acceptance:** add/remove index ⇒ one `nonBreaking` diff + description; **reorder index columns
  ⇒ `nonBreaking` `seqNo` diff(s), not 0 and not add/remove**; add a column to a composite index ⇒
  one `nonBreaking` diff; PK add/remove ⇒ `nonBreaking`; `unique` true↔false ⇒ `nonBreaking`.
- **Verify:** `npx jest test/ddl.constraints.test.ts -t "index|primary key|unique"`

#### T5.2 — Foreign keys: mapping, classify, describe (+ refTable shared edge)  ·  M
- **Depends:** T2.1, T3.1, T2.6 · **Files:** `ddl.mapping.ts`, `ddl.classify.ts`, `ddl.rules.ts`,
  `ddl.description.ts`, `test/ddl.constraints.test.ts`
- **Do:** `table.foreignKeys[]` keyed by `symbol`/name; classify fk add/remove and
  `onUpdate`/`onDelete`/`refColumns` changes `nonBreaking`. `fk.refTable` is a **lazy cyclic edge**
  to a shared `Table` instance — reuse the table rule via the lazy `() => tableRules` pattern;
  **never clone it** (shared-instance contract, §8A). Template:
  `"{{action}} foreign key {{fkName}} on table {{tableName}}"`.
- **Acceptance:** add/remove fk ⇒ one `nonBreaking` diff; change `onDelete` ⇒ `nonBreaking`;
  reorder fks ⇒ 0 diffs; a change to a table reached via `fk.refTable` is the **same `Diff`
  instance** as via `schemas[].tables[]` (no duplication) and appears once in `diffs`.
- **Verify:** `npx jest test/ddl.constraints.test.ts -t "foreign key"`

#### T5.3 — Check constraints: classify, describe  ·  S
- **Depends:** T2.2 (attrs/objects composite-key resolver), T3.1 · **Files:** `ddl.classify.ts`,
  `ddl.rules.ts`, `ddl.description.ts`, `test/ddl.constraints.test.ts`
- **Do:** `Check` is **dual-role** — an `Attr` (`AttrKind.Check`) in `attrs[]` **and** a
  `SchemaObject` (`ObjectKind.Check`) in `objects[]`, sharing one `kind` string; a single
  classify+description rule serves both (composite key `kind:name` from T2.2). Classify
  add/remove and `expr` change `nonBreaking`. Template:
  `"{{action}} check {{checkName}} on table {{tableName}}"`.
- **Acceptance:** add/remove check ⇒ one `nonBreaking` diff; change a check `expr` ⇒
  `nonBreaking`; two checks with different names map independently.
- **Verify:** `npx jest test/ddl.constraints.test.ts -t "check"`

Every M4–M5 task carries the same DoD (lint + types + `npm test` green) and adds rows to the
relevant test suites; **no core changes are expected** after M0.

### Future scope (not part of this execution plan)

**Phase 4 — views + PG escape-hatch objects.** Views and PG escape-hatch objects
(`Domain`/`RangeType`/`CompositeType`/`ExcludeConstraint`, identity/partition/trigger attrs) via
`DdlDiffDialect` rule modules, with opaque whole-object classification. This is **not scheduled in
the current execution plan (M0–M5)**; when it is taken on it should be decomposed per dialect kind
(each an S/M task) and would add dialect rows to test suite (7). No core changes anticipated.

## 13. Resolved decisions (formerly open questions)

- **O1 — within-family precision change → `non-breaking`.** `decimal(10,2)→decimal(10,0)`,
  `varchar(200)→varchar(50)` etc. keep every operation type-valid, so the query still runs (§1).
  No `risky`/breaking tier for type changes in v1 (the *value* may change, but that is outside the
  contract — see the result-drift note below).
- **O2 — enum value rename → accept add+remove, both `non-breaking`.** No rename detection; a
  renamed value surfaces as a remove + an add. **Both halves are `non-breaking`** (an enum value
  remove is non-breaking — E2/§6 — so this is consistent: neither half makes a query fail to
  execute). Out of scope to detect the rename as a single change in v1.
- **Result-drift signal (deferred, optional).** Changes that keep every query executing but can
  change *values/categories* — not-null→nullable (NULLs appear), within-family narrowing/precision
  loss, enum value removal — are all `non-breaking` under the contract (§1). If a caller wants
  them surfaced, the right design is a **separate optional axis** (e.g. a `risky` annotation or a
  `dataQuality` flag), *never* a reclassification to `breaking`. Not in v1 scope.
- **O3 — dialect/unknown fallback → `unclassified`** for add/remove/replace, expressed as a
  single root `/**` catch-all (`$: allUnclassified`) rather than per-node fallbacks.
- **O4 — suppress-diff is whole-subtree.** `ignoreDifference: true` suppresses the node and all
  its descendants.
- **O5 — wording → article-less, consistent** (§10): `table <t>`, `column <c>`, `enum <type>`;
  prepositions from the action map; position `of table <t>`; optional `in schema <s>`.
- **O6 — rename detection → out of scope** for v1 (tables, columns, indexes, FKs).
- **O7 — default-schema by naming convention.** The default schema is identified by its name
  (e.g. `public` for PostgreSQL); when a diff's schema equals the dialect's default-schema name,
  the `schemaName` param is omitted so the shorter (schema-less) template wins. The default name
  is supplied by the dialect (`DdlDiffDialect`), keeping the convention dialect-specific.

## 14. Remaining items to confirm during implementation

- **`ignoreDifference` subtree semantics — RESOLVED** (skip at hook entry; see T0.2). No longer open.
- Whether `apiDiff`'s `selectEngineSpecType`/`areSpecTypesCompatible` need any ddlapi-specific
  branch beyond "ddlapi only vs ddlapi" (one version today → likely none). Settled in T1.1.
- Confirm `buildFromDdl` output carries the `ddlapi` version discriminator so `resolveSpec` routes
  it to `SPEC_TYPE_DDL_API_1`; if not, the **T-SETUP** test helper stamps it. (Acceptance lives in
  T-SETUP.)

## 15. Consistency checklist with api-unifier

- [ ] Same `SPEC_TYPE_DDL_API_1` constant, imported from api-unifier (never re-declared).
- [ ] Dialect split via a registry interface + `DIALECT_*_POSTGRES`, injected into
      `ddlRules(version, dialect)` — structurally parallel to `ddlApiRules` ↔ `DdlApiDialect`.
- [ ] Core handles the closed driver-neutral unions; dialect handles escape-hatch kinds; shared
      generic fallback for unknown kinds.
- [ ] Model enums/strings imported from `@netcracker/qubership-apihub-ddlapi`.
- [ ] Comparison runs on **normalized** Realms (api-unifier `DDL_API_NORMALIZE_OPTIONS`), so
      origins and defaulted empty arrays are present for mapping + descriptions.

## 16. Interview decisions log

Refinements captured during the design interview (each already folded into the sections above):

| # | Topic | Decision | Lands in |
| --- | --- | --- | --- |
| D1 | Views scope | **Future scope / phase 4** (after indexes/FKs; not scheduled in the M0–M5 execution plan), despite Superset often reading views. | §6, §12 |
| D2 | Dialect selection | **Hardcode PostgreSQL** now; keep the registry seam but bind `DIALECT_DIFF_POSTGRES` in `compareDdlApi`, mirroring api-unifier's hardcoded `RULES`. | §3, §5 |
| D3 | Type-family granularity | **Coarse families** in v1 (numeric/textual/temporal/…); refine later. Reinforced by the model itself collapsing tz/serial. | §7 |
| D4 | Consumer output | **Expose all three**: `diffs`, `merged`, and the existing `aggregateDiffsWithRollup`. | §8B |
| D5 | False positives | Type-name canonicalization is **already done by the ddlapi parser** (`typeMapper.ts`); guard via a regression test area, compare on `type` not `raw`. | §7, §11 |
| D6 | Enum value remove | **Non-breaking** — no `SELECT` fails to execute (a removed category just stops appearing). Both enum add and remove are non-breaking; a renamed value (= remove+add) is therefore non-breaking on both halves (resolves the earlier E2-vs-O2 contradiction). | §6, §13 |
| D15 | **Classification contract** | Single axis = **"query still runs"** (executional): `breaking` ⇔ a previously-valid query now fails to execute; result-correctness is *out of scope*. Under it, **nullability changes are non-breaking in both directions** and within-family precision/size loss too; result-drift gets an optional future signal, never a `breaking` verdict. | §1, §6, §7, §13 |
| D7 | Schema moves | A table moved between schemas surfaces as **remove + add** (same as rename, O6); no relocation detection. | §6, §13 |
| D8 | Multi-facet column change | **Independent per-facet diffs**; the consumer aggregates (no combined column diff). | §8B |
| D9 | Verdict helper | **None** — api-diff stays a pure classifier; severity/verdict policy is the consumer's. `unclassified` ranking is therefore moot in-library. | §8B |
| D10 | Primary-key / unique changes | **Non-breaking** (write constraint); grain impact is a modeling concern, not a schema-read break. | §6 |
| D11 | Description scope | **Schema, table, and column** descriptions in scope (annotation), all via the `Comment`-attr machinery the parser already produces. | §6, §10 |
| D12 | Reporting policy | **Report everything** as classified (incl. non-breaking); suppress nothing beyond the technical `kind` and redundant `raw`. | §8B, §9b |
| D13 | Test fixtures | Build before/after from **raw SQL via `buildFromDdl`**, as **full `CREATE*` snapshots** (no `ALTER` handlers exist). | §11 |
| D14 | Dialect exemplar | **Keep enum** as the phase-1 dialect-direction exemplar (mapping + seam + shared-instance), even though both enum outcomes are non-breaking. | §6 |

## 17. Design updates during implementation

Deltas discovered while executing **T-SETUP + M0 (T0.1, T0.2)**. Each was forced by
the real environment, not a change of intent; later milestones should assume these.

### 17.1 — ddlapi is consumed from **source** in tests (jest `moduleNameMapper`)

The ddlapi `dist` bundle ships an emscripten (libpg-query) WASM loader whose
`require('fs')` is mangled by the bundler; under Node 24 it aborts with
`P.readFileSync is not a function`, so `buildFromDdl` cannot run from `dist`. ddlapi's
own jest config sidesteps this by mapping the package to its source. api-diff now does
the same in `jest.config.ts`:

- `moduleNameMapper`: `'^@netcracker/qubership-apihub-ddlapi$' → '<rootDir>/../ddlapi/src/index.ts'`.
- ts-jest transform set to `importHelpers: false` (inline TS helpers): compiling ddlapi
  source with api-diff's `importHelpers: true` tsconfig otherwise fails to resolve
  `tslib` from the ddlapi tree (ddlapi neither ships nor needs tslib). Inlining is
  behaviourally identical and affects test compilation only.

This only affects **test-time** `buildFromDdl`; api-unifier (consumed as dist) does not
pull the WASM during normalization, so the rest of the suite is unaffected. **Test
fixtures must `await buildFromDdl(...)`** — it is async (first call initialises the WASM).
*(If the ddlapi `dist` WASM loader is fixed later, this mapping can be dropped.)*

### 17.2 — `COMPARE_ENGINES_MAP` relaxed to `Partial` until T1.1

Building the ddlapi-enabled api-unifier adds `'ddlapi-1.0'` to its `SpecType` union, which
made `COMPARE_ENGINES_MAP: Record<SpecType, CompareEngine>` in `src/api.ts` non-exhaustive
(tsc error TS2741) — the "T-SETUP dependency gap". To keep `tsc --noEmit` clean across M0
without pre-empting the engine work, the map type is now
`Partial<Record<SpecType, CompareEngine>>` and `apiDiff` throws a clear
`No compare engine registered for specification type <t>` when an engine is absent.
**T1.1 registers `compareDdlApi` and this guard then never fires for ddlapi**; T1.1 may keep
the `Partial`+guard (defensive) or restore the exhaustive `Record`.

### 17.3 — `IGNORE_DIFFERENCE_RULE` lives in `src/types/rules.ts`

The plan listed `src/core/index.ts` among T0.2 files, but every other rule-key constant
(`IGNORE_DIFFERENCE_IN_KEYS_RULE`, `START_NEW_COMPARE_SCOPE_RULE`, …) is defined in
`src/types/rules.ts` and imported from `../types`. `IGNORE_DIFFERENCE_RULE = 'ignoreDifference'`
follows that convention; `src/core/index.ts` was left unchanged. ddlapi rules (T1.2+) import
it from `../types`, exactly as `asyncapi3.rules.ts` imports `START_NEW_COMPARE_SCOPE_RULE`.

### 17.4 — T0.1 unit tests moved (not duplicated)

The `createPropertyMappingResolver` unit `describe` previously lived inside
`test/asyncapi.firstReferenceKeyMapping.test.ts`. Rather than duplicate it, the unit block
was **moved** into the new `test/core.mapping.test.ts` (importing from `../src/core`), and
`src/asyncapi/asyncapi3.mapping.ts` was deleted (its `export *` removed from
`src/asyncapi/index.ts`). The AsyncAPI file keeps only its integration tests.

### 17.5 — package.json dependency wiring

T-SETUP added `@netcracker/qubership-apihub-ddlapi` to `dependencies`. Dependency
versions/links were subsequently finalised by the maintainer (api-unifier/json-crawl/
graphapi/compatibility-suites pinned to explicit versions; ddlapi kept as a link). The
T-SETUP intent — ddlapi resolvable & typed, ddlapi-enabled api-unifier — holds.

### 17.6 — Pre-existing lint noise (not introduced by M0)

`npm run lint:check` reports 13 `eol-last` errors in `test/helper/resources/**/*.json`
fixtures that predate this work and were not touched here. All files changed/added by
T-SETUP + M0 lint clean.

### 17.7 — Case-5 type change is reported **per property** (M2/T2.4; revised)

**Superseded design (kept for history):** an earlier iteration collapsed a `SchemaType`
change into exactly one family-classified `replace` via a custom `compare` resolver
(`schemaTypeCompareResolver`) on `column.type.type`.

**Current design (decision: do *not* collapse — report structured changes):** the engine
descends into the `SchemaType` and emits a diff at the **specific property** that changed
(`column.type.type.{type|size|precision|scale}`). Consequences and wiring:

- **No `compare` resolver / no node-level `$`.** `scalarTypeRules`/`enumTypeRules` carry
  per-field rules instead.
- **The breaking signal rides on the `/type` name field** (`createTypeNameClassifier`), whose
  `replace` slot reads the **immediate parent** `SchemaType` on each side
  (`ctx.before/after.parentContext`) and is `breaking` iff `!sameConsumptionFamily`. This works
  because `/kind` stays suppressed (§9b) and a cross-family change *always* changes the
  canonical type name. The tuple is `[nonBreaking, breaking, replace]`: `type` is a **required**
  property, so an `add` can only be a previously-incomplete spec being corrected (non-breaking),
  while a `remove` is a required property going missing (breaking). Both add/remove slots are
  effectively unreachable (the name is always present when the SchemaType is) — only `replace`
  fires in practice.
- **`/size`, `/precision`, `/scale` → `allNonBreaking`** (within-family size/precision change
  keeps every query executing, O1). **`/unsigned` → suppressed** (PG-irrelevant MySQL-ism,
  always `false`).
- **Same-kind changes are a single clean diff** at the moved field (`int→bigint` = one `/type`
  diff; `varchar(50)→(200)` = one `/size` diff). **Cross-kind changes emit several diffs** —
  the `/type` change plus genuine structural deltas (e.g. `numeric(10,2)→int` = `/type` +
  `/precision` remove + `/scale` remove, all non-breaking since numeric→numeric;
  `int→varchar(50)` = breaking `/type` + non-breaking `/size` add). This is the intended
  "report structured changes to specific properties" behaviour, and the breaking verdict still
  lands precisely on the `/type` diff.
- **Descriptions are preserved (Approach B).** The description param-calculator detects a
  SchemaType subfield (two consecutive `type` segments before the leaf) and renders the *whole*
  type from `ctx.before/after.parentContext` on each side, so any subfield change still reads
  "Changed type for column `c` … from `varchar(50)` to `varchar(200)`". (A cross-kind change
  emits one such description per diff.)
- **Shared-instance contract is unaffected** — pure native descent is deduped by the engine's
  `mergedJsoCache`/`diffUniquenessCache` (a shared enum/column still yields one diff per changed
  property). Removing the resolver actually simplifies this.

### 17.8 — Identity-keyed array elements need `ignoreKeyDifference` (M2/T2.1)

A reorder of a name/symbol-keyed array maps an element to a new index, which the engine would
otherwise report as a `[Renamed]` diff. The flag that silences this (`ignoreKeyDifference`)
must sit on the **element** rule (`/*`), not the array node. An `asElement()` helper wraps
every mapped-array element (and the attr/object dispatchers) to set it. Enum `values[]` use the
same flag for set semantics.

### 17.9 — Description params via declaration-path slicing, not context parent-jumps (M3/T3.1)

The param calculator (`createDdlParamsCalculator`) classifies a change by the **tail** of its
declaration path and resolves entity names by **slicing that canonical declaration path against
the diff side's realm root** (`ctx.before/after.root` + `getKeyValue`). Context parent-jumps
were tried first but break for **shared** nodes: an enum reached through a column yielded the
column as its "schema". Declaration paths are origin-intrinsic, so slicing is route-independent
(`schema = slice(0,2)`, `table = slice(0,4)`, `column = slice(0,6)`). The default schema
(`public`) drops the `in schema` clause by omitting `schemaName` — **except** for a
schema-level description, where the schema is the subject and is kept.

**Rendering convention (refinement of §10/§O5):** the action is bracketed
(`[Added]`/`[Deleted]`/`[Changed]`, matching the core default-description style) and entity
names and values are wrapped in apostrophes; `preposition` and `facet` stay unquoted. E.g.
`[Changed] type for column 'id' of table 't' from 'integer' to 'bigint'`,
`[Added] column 'name' to table 't' in schema 's'`. This lives entirely in the ddl templates
(`ddl.description.ts`); the shared core `DIFF_ACTION_TO_ACTION_MAP` is untouched, so other spec
types' descriptions are unaffected.

### 17.10 — Check vs Comment share one attrs/objects branch, keyed on node `kind` (M4/M5)

`attrs[]`/`objects[]` carry both `Comment` (descriptions, T4.3) and `Check` (T5.3). The
calculator resolves the member node and switches on its `kind` (`Check` → check template;
`Comment` → level-based description template). Index/PK/FK changes are matched earlier by their
own path segments (`indexes`/`primaryKey`/`foreignKeys`). `index.parts[]` are keyed by
referenced column name (`indexPartMappingResolver`) so a column-order swap surfaces as `seqNo`
replace diffs.

### 17.11 — ddlapi parser limitations encountered (fixture constraints, not api-diff bugs)

- **`DEFAULT 0` parses to `Literal{ value: '' }`** (non-zero integer/text literals are fine).
  M4 default fixtures use non-zero values to avoid this upstream quirk. Worth reporting to
  ddlapi separately.
- **`COMMENT ON SCHEMA …` is not emitted** into `schema.attrs` by `buildFromDdl` (produces no
  diff). Schema-level descriptions are therefore *code-complete* (the calculator handles the
  schema level) but **not exercisable through SQL fixtures** in this setup; only column- and
  table-level descriptions are tested. Column/table COMMENTs work.

### 17.12 — M1–M5 status

T-SETUP + M0–M5 (T1.1 … T5.3) implemented and verified. Module `src/ddl/`:
`ddl.const/dialect/postgres/rules/mapping/classify/description/compare/index.ts`. Tests:
`ddl.setup`, `ddl.diff`, `ddl.mapping`, `ddl.type-compat`, `ddl.merged`, `ddl.description`,
`ddl.constraints`, plus core `core.mapping`/`core.ignoreDifference`. Final run: 69 suites /
6400 tests green, `tsc --noEmit` clean, all changed/added files lint-clean (the 13 pre-existing
fixture `eol-last` errors in §17.6 remain, untouched).

### 17.13 — Exhaustive description coverage + follow-on fixes

`ddl.description.test.ts` was made exhaustive — every non-`unclassified` rule that emits a
described diff has a description-string test (Added/Deleted/Changed per rule). Two changes fell
out of that audit:

- **Description fix (default-backed replace).** A replace whose *after* value is a normalized
  default resolves its after declaration path to the synthetic `#defaults` origin (e.g. an index
  `unique:true→false` flip), which made the param calculator emit the junk fallback
  `[Changed] '#defaults' in root`. Following the OpenAPI/JSON Schema calculators,
  `createDdlParamsCalculator` now takes its candidate paths from `resolveAllDeclarationPath`
  (before+after merged) and slices them against the change side's root (after for add/replace,
  before for remove); the merged set still contains the real path and the structural predicates
  never match `#defaults`, so the real path wins — the unique flip reads
  `[Changed] index 'u' on table 't'`. Normal replaces are unaffected (their ancestors are
  identical on both sides, so a before-origin path slices correctly against the after realm).
- **Collation / GeneratedExpr promoted from `unclassified`.** These core column `Attr` kinds
  were previously rule-less (→ `unclassified`, default description). They are now classified
  `nonBreaking` (sort/computed-value changes are result-drift, never an execution break) and
  rendered as column facets (`collation` / `generated expression`) via the shared column-facet
  templates. Both are produced by PG DDL (`COLLATE`, `GENERATED ALWAYS AS … STORED`). `Charset`
  is a **MySQL-ism, out of scope** — not emitted by the PG parser — so it is intentionally not
  handled (no rule, no dispatcher case, no facet); a `Charset` attr would fall through to the
  `unclassified` catch-all. `collation`/`generated expression` facet constants live in `ddl.const`.
