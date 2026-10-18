# ddlapi Normalization — Implementation & Testing Plan

## Goal

Teach **api-unifier** to normalize (and denormalize) **ddlapi** specifications — the
driver-neutral database-schema model produced by
`@netcracker/qubership-apihub-ddlapi` (`buildFromDdl` → `Realm`). After this work, a
ddlapi document flows through the same `normalize` / `denormalize` pipeline as
OpenAPI / AsyncAPI / JSON Schema / GraphAPI, so that:

- semantically-equal DDL compares equal in api-diff (canonical form), and
- de-normalization yields a concise, human-readable document again (round-trip).

### In-scope (from the request)

1. **Empty-collection normalization** — absent object/array properties become an empty
   object / empty array in the api-unifier-standard reversible way.
2. **Primitive defaults** — analyze which primitive properties get a specification
   default (nullability is the headline case) and apply them reversibly.
3. **Origins** — assign origins to every ddlapi node, inferred from its position in the
   schema hierarchy, for downstream change-tracking.
4. **Dialect separation** — a mechanism that cleanly separates *general* DB-schema rules
   (any dialect; ddlapi core unions) from *dialect-specific* rules (PostgreSQL escape-hatch
   kinds), inspired by how JSON Schema dialects/versions are handled.

### Out of scope (this iteration)

- Non-PostgreSQL dialects (the seam is designed in; only PG rules are authored).
- Diffing itself (api-diff lives in another package; we only produce canonical form + hashes).
- **Type-spelling / SQL-expression canonicalization** — comparison is opaque (D8); making
  differently-spelled-but-equivalent types/expressions compare equal is deferred to ddlapi/the
  parser upstream.
- **Set-vs-sequence diff semantics** — api-unifier never reorders; whether reordering a
  collection counts as a change is api-diff's responsibility (D8).

---

## Background — the two systems

### How api-unifier normalizes (recap)

Entry points `normalize` / `denormalize` (`src/normalize.ts`) run flag-gated stages:
resolve-refs → `merge` (allOf) → `mergeTraits` → `liftCombiners` → `validate` → `unify`,
plus `hash`. Each stage traverses the spec with `syncClone`, matching the current path
against a **rules tree** (`NormalizationRules = CrawlRules<NormalizationRule>`) selected by
`SpecType` from the `RULES` map (`src/rules/index.ts`).

A `NormalizationRule` node carries `validate`, `merge`, `unify`/`mandatoryUnify`,
`hashStrategy`, `newDataLayer`, `referenceHandler`, etc. Child paths are keyed `'/name'`,
`'/*'`, `'/**'`. Reusable unify building blocks live in `src/unifies/`
(`valueDefaults`, `valueReplaces`, `TO_EMPTY_ARRAY_MAPPING`, `TO_EMPTY_OBJECT_MAPPING`,
`EMPTY_MARKER`, …); validators in `src/validate/checker.ts` (`checkType`, `checkContains`).

**The closest existing template is GraphAPI** (`src/rules/graphapi.ts`): a bespoke object
hierarchy with no `$ref` / `allOf`, a rules tree mirroring its structure, per-node
`valueDefaults` + `valueReplaces`, and `kind`-discriminated dispatch
(`typeDefinitionRules` switches on `type.kind`). ddlapi rules will follow this shape.

The **dialect/version mechanism** to mirror is JSON Schema:
- `jsonSchemaRules(version)` is a **parameterized core factory** (`src/rules/jsonschema.ts`)
  with `versionSpecific[version]` overlays and per-version default/replace maps
  (`JSON_SCHEMA_DEFAULTS[version]`).
- `openApiJsonSchemaRules(version)` (`src/rules/openapi.jsonschema.ts`) **composes over the
  core**, patching the inherited `unify` array with
  `insertIntoArrayByInstruction(concatArrays(core.unify, extension.unify), replaceValue(...))`.

We reproduce this: a **core `ddlApiRules(dialect)` factory** + a **PostgreSQL overlay** that
composes onto it.

### The ddlapi model (what we normalize)

`Realm` (stamped `ddlapi: "1.0.0"`, the type discriminator — like `openapi`/`graphapi`):

```
Realm{ ddlapi, schemas[], attrs?[], objects?[] }
 └ Schema{ name, tables?[], attrs?[], objects?[] }
    └ Table{ kind:'Table', name, columns?[], indexes?[], primaryKey?:Index,
             foreignKeys?[], attrs?[], objects?[], deps?[] }
       ├ Column{ name, type?:ColumnType, default?:Expr, attrs?[] }
       │   └ ColumnType{ type:SchemaType, raw?, null? }
       ├ Index{ kind:'Index', name?, unique?, attrs?[], parts?[IndexPart] }
       │   └ IndexPart{ seqNo, desc?, x?:Expr, c?:Column, attrs?[] }
       └ ForeignKey{ kind:'ForeignKey', symbol?, columns?[Column], refTable?:Table,
                     refColumns?[Column], onUpdate?, onDelete?, attrs?[] }
```

Four discriminated unions, each switched on a `kind` string with an **open escape hatch**:

| Union | Closed (driver-neutral) members | Escape hatch |
|---|---|---|
| `SchemaType` | Bool/Integer/Decimal/Float/String/Binary/Time/JSON/Spatial/UUID/Enum/Unsupported | `UnknownType{kind,…}` |
| `Attr` | Comment/Charset/Collation/Check/GeneratedExpr | `UnknownAttr{kind,…}` |
| `Expr` | Literal/RawExpr/NamedDefault | `UnknownExpr{kind,…}` |
| `SchemaObject` | Table/View/EnumType/Index/Check/ForeignKey/NamedDefault | `UnknownObject{kind,…}` |

`buildFromDdl` currently emits these **PostgreSQL escape-hatch kinds** (the dialect-specific
surface): `Identity`, `Partition`, `Inherits`, `StorageParams`, `IndexInclude`,
`IndexNullsDistinct`, `IndexType`, `IndexPredicate`, `Concurrently`, `IndexColumnProp`,
`IndexOpClass`, `ExcludeConstraint`, `CompositeType`, `RangeType`, `pg:domain`, `Trigger`.

---

## Key design decisions

### D1. Spec type & detection

- Add to `src/spec-type.ts`:
  - `SPEC_TYPE_DDL_API_TYPE_FAMILY = 'ddlapi'`
  - `SPEC_TYPE_DDL_API_1 = 'ddlapi-1.0'` (version dimension, mirroring `json-schema-07`)
  - extend the `SpecType` and `SpecTypeFamily` unions; add an `isDdlApi` guard and a
    `resolveSpec` branch keyed on the `ddlapi` string stamp (parallel to `isGraphApi`).
- Register in `RULES` (`src/rules/index.ts`): `[SPEC_TYPE_DDL_API_1]: ddlApiRules(SPEC_TYPE_DDL_API_1, DIALECT_POSTGRES)`.

**Detection contract — fail loud, not silent.** `resolveSpec` today *throws* for unknown
OpenAPI/AsyncAPI versions but **falls through to JSON Schema** for everything else. The
`isDdlApi` branch must therefore sit **before** that fallback and **throw** on an unsupported
`ddlapi` version, never letting a `Realm` be misclassified as JSON Schema — a silent,
irreversible Hyrum's-Law trap once `normalize(realm)` ships.

| Input | `resolveSpec` result |
|---|---|
| `isDdlApi`: object with a non-empty string `ddlapi` property | (matched) |
| `ddlapi` matches `1.0.x` | `{ type: SPEC_TYPE_DDL_API_1, version }` |
| `ddlapi` present, unsupported version | **throw** (mirror OpenAPI/AsyncAPI) |

Detection keys on the **stamp only**. An empty realm (`{ ddlapi: '1.0.0', schemas: [] }`) is a
valid ddlapi document; `schemas` is not part of detection. A bare `{ ddlapi: '1.0.0' }`
(missing `schemas`) is rejected by **validation**, not detection.

- **Dialect is not in the stamp today.** ddlapi is "driver-neutral" but only PostgreSQL is
  emitted. For now default the dialect to PostgreSQL at registration. The seam
  (`ddlApiRules(version, dialect)`) lets us key on a future `dialect` field or a second
  `SpecType` without touching call sites — **but normalizing a non-PostgreSQL ddlapi document
  is currently undefined behavior** (see Q3).

### D2. Keep referential identity — containment vs reference edges

After a successful build, the `Realm` is a **cyclic object graph with shared references**
(`src/parser/referenceResolver.ts`):

- `foreignKey.refTable` **is** the actual `Table` instance (→ cycle: table → fk → refTable → …).
- `foreignKey.columns[i]` / `refColumns[i]` and `indexPart.column` **are** the actual `Column`
  instances already contained in `table.columns`.
- An enum-typed column's `type.type` is the **same** `EnumType` instance also held in
  `schema.objects`.

**Decision: keep the pointers.** We do **not** replace cross-references with names and we do
**not** introduce a serialized ddlapi document format — both defeat the point of ddlapi's
referential equality (no duplication). Normalization relies on **object identity**, which
ddlapi guarantees, exactly as the engine already does for other spec types.

The engine already provides both pieces this needs:

- **Identity-based cycle breaking in every pass.** `createCycledJsoHandlerHook`
  (`src/cycle-jso.ts`) is wired into `define-origins`, `validate`, `merge`, `merge-traits`,
  `unify`, `hash`, `remove-oas-extensions`. It memoizes each instance's clone
  (`NOT_YET_COPIED → PARTIALLY_COMPLETED → COMPLETED`) and, on re-encounter, returns the
  existing clone with `done:true`. Works on arbitrary object graphs — so `orders → fk →
  refTable → users` and even a `users ↔ orders` cycle terminate with one shared clone, no
  ddlapi-specific work.
- **Identity-based, first-writer-wins origin interning.** `originCache: Map<instance,
  ChainItem>` + `getOrCustomCreateOrigin` mint exactly one `ChainItem` per instance the first
  time it is seen and reuse it forever after. This *is* "assign while walking; don't replace
  if already defined."

We still classify each edge:

- **Containment (the node's home; mint origin here):** realm→schemas→tables→
  columns / indexes / primaryKey / foreignKeys / attrs / objects; column→type / default / attrs;
  index→parts; type→values / attrs; named types live in `schema.objects`.
- **Reference (reuse the home's interned origin; never mint):** `foreignKey.refTable`,
  `foreignKey.refColumns`, `foreignKey.columns`, `indexPart.column`, and the dual-role enum/domain
  column type.

**The only real gap is first-*encounter* order.** Origins (and the canonical clone) are
pinned to the path an instance is *first* reached by, so a "home" must be visited before any
reference to it. Plain depth-first order does **not** guarantee that:

| Case | Home | Also reached via | DFS order OK? |
|---|---|---|---|
| Shared column | `table.columns[i]` | `pk`/`index.parts[].column`, `fk.columns[]` | ✅ if `columns` precedes indexes/PK/FKs |
| Named type (enum/composite/domain) | `schema.objects[k]` | column `type.type` | ❌ `tables` walked before `objects` |
| Cross-table FK target | `schema.tables[j]` | another table's `fk.refTable` | ❌ forward refs / cycles |

So we must drive the walk in an explicit **definition-first** order rather than rely on
structural DFS or on `buildFromDdl`'s emission order. That walk is D5.

### D3. Empty-collection normalization (scope item 1)

Use the standard reversible `valueDefaults` (marks property `EMPTY_MARKER`) + `valueReplaces`
(`TO_EMPTY_ARRAY_MAPPING` / `TO_EMPTY_OBJECT_MAPPING`) pattern — identical to GraphAPI. ddlapi
collections are **arrays**, so almost all use `TO_EMPTY_ARRAY_MAPPING`.

| Node | Properties defaulted to empty array | Notes |
|---|---|---|
| `Realm` | `attrs`, `objects` | `schemas` is required — present, not defaulted |
| `Schema` | `tables`, `attrs`, `objects` | |
| `Table` | `columns`, `indexes`, `foreignKeys`, `attrs`, `objects`, `deps` | `primaryKey` absent is **meaningful** → no default |
| `Column` | `attrs` | `type`, `default` absent is meaningful |
| `Index` | `attrs`, `parts` | |
| `IndexPart` | `attrs` | |
| `ForeignKey` | `attrs` | `columns`/`refColumns` are reference edges (D2) |
| `EnumType` | `attrs` | `values` required |
| `Check` / `NamedDefault` / type variants with `attrs?` | `attrs` | |

`primaryKey` and `default`/`type` are intentionally **not** defaulted: their absence is a
semantic distinction (no PK / no explicit default), not noise.

### D4. Primitive defaults (scope item 2)

Reversible `valueDefaults` again. Analysis of which primitives carry a specification default:

| Node.property | Default | Reversible? | Placement | Rationale |
|---|---|---|---|---|
| `ColumnType.null` | **tri-state — see below** | yes | **core** | nullability |
| `Index.unique` | `false` | yes | core | unmarked index is non-unique |
| `IndexPart.desc` | `false` | yes | core | ascending is the SQL default |
| `ForeignKey.onUpdate` | `'NO ACTION'` | yes | core | ANSI default referential action |
| `ForeignKey.onDelete` | `'NO ACTION'` | yes | core | ANSI default referential action |
| `IntegerType.unsigned` | `false` | yes | **dialect** | unsigned is a MySQL concept; PG never sets it |
| `DecimalType.unsigned` / `FloatType.unsigned` | `false` | yes | dialect | same |
| `GeneratedExpr.type` | `'STORED'` | yes | dialect (PG) | PG only supports STORED generated columns |

`precision` / `scale` / `size` are **not** defaulted — an absent precision is semantically
distinct from a specific one (Atlas-Go zero-value convention is already represented as
`undefined`; see the ddlapi `StringType`/`BinaryType` size notes).

**Nullability (the headline case).** `ColumnType.null` is tri-state: `false` (NOT NULL
written), `true` (NULL written), `undefined` (no clause). ANSI SQL: a column with no clause
is **nullable**, *except* a column participating in the table's `primaryKey` is implicitly
**NOT NULL**. So the canonical default is **context-aware**:

- column ∈ owning table's `primaryKey` parts → `null = false`
- otherwise → `null = true`

PK membership needs table-scope context a column-level rule lacks
(`UnifyContext.parentValue` is only one level up). **Chosen approach** — keep all nullability
logic in one place; precedent `pathItemsUnification` (`src/unifies/openapi.ts`): a single
**table-level forward/backward unify** `ddlApiNullabilityDefault` attached to the `Table` node.

- *Forward:* identify PK-member columns by **reference identity** against
  `primaryKey.parts[].column` (the same instances as `table.columns`); for each column's `type`
  apply the contextual default `null = false` for PK members, `null = true` otherwise. It
  mutates the shared `ColumnType` **in place** — deep-copying a shared child is forbidden, the
  exact `pathItemsUnification` situation — and replicates `valueDefaults`' bookkeeping: mark
  each touched `null` SYNTHETIC (added) / PURE (present and equal to its default) via
  `defaultsFlag`, and attach origins via `setOrigins` / `createOriginsForDefaults`.
- *Backward:* strip the SYNTHETIC/PURE `null`s and clean their origins.

No `null` default sits on the `ColumnType` rule itself, so this unify is the **sole owner** of
nullability. To avoid hand-writing the SYNTHETIC/PURE marking, the per-column step may delegate
to a `valueDefaults({ [null]: false|true })` helper invoked on each `column.type` — decide when
implementing. **No silent fallback:** correct PK-implicit NOT NULL is required for semantic
equality of PK columns, so it is a **Phase 3 exit gate**, not an optional default. If PK-aware
nullability ever proves infeasible, that is a deliberate, recorded re-decision — never a
quietly-shipped gap (a wrong nullable default would corrupt diffs for every primary key).

### D5. Origins via a dedicated model-aware definition walk (scope item 3)

`defineOriginsAndResolveRef` bundles two jobs: **`$ref` resolution** (inlining, synthetic
`title`/`allOf`, `inlineRefs`, the `referenceHandler` lookup — all JSON-Schema-specific,
irrelevant to ddlapi) and **origin interning** (the only part ddlapi wants). So instead of
routing ddlapi through it, add a dedicated **`defineDdlApiOrigins`** stage and dispatch to it
by spec family.

**Pipeline seam.** Generalize the one line in `src/normalize.ts`:
```js
if (resolveRef || (!originsAlreadyDefined && originsFlag)) { spec = defineOriginsAndResolveRef(spec, opts) }
```
into a per-family strategy — JSON/OpenAPI/AsyncAPI/GraphAPI keep `defineOriginsAndResolveRef`;
ddlapi uses `defineDdlApiOrigins`. The JSON `$ref` path is untouched. `merge`/`mergeTraits`
stay off for ddlapi; `validate`/`unify`/`hash` already carry the cycle hook and consume the
cyclic, origin-decorated clone unchanged. The reverse direction
(`deDefineOriginsAndResolvedRefSymbols`) already strips the symbol with an identity
`cycleGuard` — **no ddlapi-specific denormalize work needed**.

**`defineDdlApiOrigins` — a model-aware walk** (chosen over a rules-flag-driven walk: we are
already writing bespoke code, and walking the typed `Realm` is clearer and type-safe). It:

- recurses **containment in definition order**: realm → `attrs`/`objects` → schemas → schema
  `objects` **before** `tables` → table → `columns` **first**, then indexes / primaryKey /
  foreignKeys / attrs / objects → column → type / default / attrs;
- **interns one `ChainItem` per instance** at its home (reuse `originCache` /
  `getOrCustomCreateOrigin`) and writes each parent's record with `setOrigins` /
  `setOriginsForArray`;
- on a **reference edge** (`refTable`, `refColumns`, `fk.columns`, `indexPart.column`, enum/domain
  column type) **reuses** the cached home `ChainItem` (present because definitions go first)
  — never mints a new one;
- reuses `createCycledJsoHandlerHook` so the emitted clone matches the other passes
  (shared instances stay `===`, cycles preserved). It emits an **identity-preserving clone**
  (the caller's Realm is never mutated), consistent with the other stages.

**Output contract it must reproduce** (read by `validate`/`unify`/`hash`, enforced by
`commonOriginsCheck`):

1. every object/array with ≥1 non-symbol key carries `node[originsFlag]: OriginsMetaRecord =
   Record<childKey, OriginLeafs>`; every own key has an entry; **no extra keys**;
2. `OriginLeafs = ChainItem[]`, `ChainItem = {parent?, value}` = path to root;
3. **ChainItems are interned per instance** — `commonOriginsCheck` asserts the same path
   position is the *same* `ChainItem` object everywhere (`toBe`);
4. a **referenced instance carries its definition-site origin** (e.g. `fk.refColumns[0]`'s
   origin is the `…/columns/0` ChainItem, not `…/refColumns/0`); `commonOriginsCheck`'s
   `source` branch only checks the path *exists* in the source, not that it matches the
   referencing location — so this is legal and is the whole point.

Synthetic defaults (D3/D4) still attach origins via `createOriginsForDefaults`, handled for
free by `valueDefaults`/`valueReplaces` during the later `unify` pass. Validate the whole
tree with `commonOriginsCheck(result, { originsFlag })` over a realm exercising FKs, a
composite index, and an enum-typed column.

### D6. Dialect separation mechanism (scope item 4)

Mirror the JSON-Schema-dialect composition:

```
src/rules/ddlapi.ts            core, driver-neutral factory: ddlApiRules(version, dialect)
src/rules/ddlapi.const.ts      property-name + kind constants (no bare string literals)
src/rules/ddlapi.postgres.ts   PostgreSQL overlay: rules + defaults for escape-hatch kinds
src/rules/ddlapi.dialect.ts    Dialect type + DIALECT_POSTGRES + dialect registry contract
```

- **Core** handles the closed unions (`SchemaType`/`Attr`/`Expr`/`SchemaObject` members) plus
  a generic `Unknown*` passthrough (`validate` the `kind` is a string; descend `/**` loosely).
- Each union is dispatched by a **`kind`-switch context rule** (like graphapi's
  `typeDefinitionRules`). The default branch delegates to a **dialect-provided rule lookup**:
  `dialect.attrRulesFor(kind)` / `objectRulesFor(kind)` / `typeRulesFor(kind)`. Unknown-to-the
  -dialect kinds fall back to the generic passthrough.
- **PostgreSQL overlay** supplies rules + `valueDefaults`/`valueReplaces` for the escape-hatch
  kinds (Identity, Partition, Trigger, ExcludeConstraint, CompositeType, RangeType, pg:domain,
  the Index* attrs, …) and the dialect-specific primitive defaults from D4 (`unsigned`,
  `GeneratedExpr.type`). It composes onto core exactly like `openApiJsonSchemaRules`: spread
  core, and where a core `unify` array needs patching use
  `insertIntoArrayByInstruction` / `replaceValue` / `concatArrays`.
- A `DdlApiDialect` interface (the registry contract) keeps core ignorant of PG specifics;
  adding a future dialect = a new module implementing it, no core edits. Specify the shape now
  so every implementer shares one fallback (`undefined` → generic `Unknown*` passthrough):

  ```typescript
  interface DdlApiDialect {
    readonly id: 'postgres'                                   // dialect discriminant
    attrRulesFor(kind: string): NormalizationRule | undefined
    objectRulesFor(kind: string): NormalizationRule | undefined
    typeRulesFor(kind: string): NormalizationRule | undefined
    readonly primitiveDefaults?: DefaultValueMapping          // e.g. unsigned, GeneratedExpr.type
  }
  ```

### D7. Pipeline options & API surface

ddlapi documents have no `allOf` / traits / `$ref`. The canonical option bundle is **required
for correct behavior**, not advisory — so promote it to an **exported, named constant** rather
than prose that callers copy flag-by-flag:

```typescript
export const DDL_API_NORMALIZE_OPTIONS: Readonly<NormalizeOptions> = {
  validate: true,
  unify: true,
  mergeAllOf: false,
  mergeTraits: false,
  liftCombiners: false,
  resolveRef: false,
}
```

This gives api-diff a stable import (not six flags to keep in sync) and a contract test in
`normalize.options`-style tests. Flags **harmful** if left at defaults: `mergeAllOf` /
`mergeTraits` default `true` and would do wasteful (and on the cyclic graph, meaningless) work;
`resolveRef` defaults `true` and would scan for `$ref` that never exists. The constant pins
them off.

**No new public API entry point.** Callers still use the existing `normalize` / `denormalize`
(spread `DDL_API_NORMALIZE_OPTIONS`) — no `normalizeDdlApi` wrapper (interview decision).

### D8. Hashing & semantic-equality scope

Mirror the JSON Schema hashing model (the implemented analogue — GraphAPI's `hash` is a no-op):

- **Per-entity hash owners.** Mark each independently-comparable entity (`Table`, `Column`,
  `Index`, `ForeignKey`, `EnumType`, named-type objects) `hashOwner: true` with
  `hashStrategy: CURRENT_DATA_LEVEL`, and set `newDataLayer: true` at nested-entity boundaries
  so a parent's hash captures nested entities shallowly (`BEFORE_SECOND_DATA_LEVEL`) while they
  own their own hashes. **No whole-realm hash** — the document root is not a `hashOwner` (as in
  OpenAPI), so the `ddlapi` version stamp is validated (`checkType(TYPE_STRING)`) but never
  hashed.
- **api-unifier never reorders collections.** Whether reordering a set-like collection
  (indexes, FKs, attrs, objects) is a diff is **downstream's (api-diff) responsibility**. The
  unified document preserves array order as given; downstream correlates elements via their
  per-element hashes + origins. (`object-hash` is configured `unorderedArrays`/`unorderedObjects`
  globally — inherited as-is, same as every other spec.)
- **No canonicalization — comparison is opaque.** We do **not** normalize dialect type
  spellings or SQL expressions. Consequence to document: `bigint` ≠ `int8`,
  `varchar(10)` ≠ `character varying(10)`, `now()` ≠ `CURRENT_TIMESTAMP` unless ddlapi/the
  parser canonicalizes upstream. `ColumnType.raw` **is included** in the hash. Comments
  (`Comment` attr) are **semantic — included** in the hash (consistent with `description`/
  `title`). Unknown escape-hatch kinds pass through and **are hashed** (validate only that
  `kind` is a string).
- **Consumer invariant (correlation):** per-entity hashes are order-independent at the
  collection level (global `unorderedArrays`), so api-diff must correlate elements across
  versions by **origins + per-element hash, never by array index**; and changing only
  `realm.ddlapi` changes no entity hash. Downstream relies on **per-element hashes +
  per-element origins** — that defines "done" for this work.

### D9. Validation & error handling

- **Malformed-but-known values** (e.g. `onDelete` not a `ReferenceOption`, a wrong-typed
  sub-field under a known `kind`) → **reported via `onValidateError` and stripped**, the same
  way the engine cleans invalid keys for other specs.
- **Dangling reference edges** from partial builds (`foreignKey.refTable` undefined, unresolved
  columns) → **reported via `onUnifyError`/`onValidateError` and left partial**; never throw.
  This honours ddlapi's partial-realm guarantee.
- **Unknown escape-hatch kinds** → pass through untouched (no defaults), validated only as
  `{ kind: string }`.
- **Error identification (Hyrum's Law):** callbacks carry a string `message` only — someone
  will parse it. Reuse the existing `ErrorMessage` patterns with **stable prefixes**, and for
  the ddlapi-specific cases (dangling `refTable` vs invalid `onDelete`) prefer an optional
  structured `cause` so consumers branch without string-matching. Additive / backward
  compatible; not blocking for v1, but settle the prefixes early.

### D10. Round-trip fidelity

`denormalize(normalize(realm, opts))` satisfies, normatively:

1. **Deep structural equality** on all non-symbol keys, except synthetics marked with
   `defaultsFlag` (added empties/defaults), which are absent.
2. For every pair of nodes that were `===` in the **input**, the corresponding nodes in the
   **output** are `===` (intra-document sharing preserved).
3. **Array order unchanged.**
4. **Input object identity is not preserved** — the output is a clone; no output node is `===`
   to any input node.

This is the unambiguous oracle for `deunify.test.ts`; every reversible default/empty asserts
against it.

---

## Implementation plan (tasks)

Tasks are agent-sized (≤ ~5 files each; no task is XL). **Scope:** **S** ≈ 1–2 focused files;
**M** ≈ 3–5 files. `deps:` lists prerequisite tasks. **Each task authors its own tests** —
tests trail their task (verification command listed), they are not deferred to the end. Paths
are repo-relative; the ddlapi checkout is assumed at `../ddlapi` (adjust to your layout).

### Phase 0 — wiring & dependency

**Task 0a — Link ddlapi & smoke test · S · deps: none**
Files: `package.json`, `test/ddlapi/smoke.test.ts`
- [ ] In `../ddlapi`: `npm run build && npm link`; in this repo: `npm link @netcracker/qubership-apihub-ddlapi`; add it to `package.json` `dependencies`.
- [ ] `buildFromDdl('CREATE TABLE t(id int)')` imported from the package root returns a `Realm`.
- Verify: `npm run build && npm test -- test/ddlapi/smoke.test.ts`

**Task 0b — CI / dependency strategy · S · deps: 0a**
- [ ] CI obtains ddlapi without `npm link` — a workspace entry or a published/packed tarball, documented in CI config.
- [ ] On ddlapi publish, `package.json` pins a caret range with the **minimum version** shipping the `ddlapi` stamp + targeted escape-hatch kinds.
- [ ] api-unifier does **not** re-export ddlapi types (boundary check); consumers import `Realm`/`kind` constants straight from ddlapi.

### Phase 1 — spec type & skeleton rules

**Task 1a — Spec detection · S · deps: 0a**
Files: `src/spec-type.ts`, `test/ddlapi/detect.test.ts`
- [ ] `SPEC_TYPE_DDL_API_TYPE_FAMILY`, `SPEC_TYPE_DDL_API_1='ddlapi-1.0'`; `SpecType`/`SpecTypeFamily` extended.
- [ ] `isDdlApi` + `resolveSpec` branch placed **before** the JSON-Schema fallthrough.
- [ ] `resolveSpec` throws on an unsupported `ddlapi` version (`'2.0.0'`), mirroring OpenAPI/AsyncAPI.
- [ ] `{ ddlapi:'1.0.0', schemas:[] }` → `SPEC_TYPE_DDL_API_1`; a `Realm`-shaped object is **never** classified as JSON Schema.
- Verify: `npm test -- test/ddlapi/detect.test.ts`

**Task 1b — Constants, dialect contract, options, registration · M · deps: 1a**
Files: `src/rules/ddlapi.const.ts`, `src/rules/ddlapi.dialect.ts`, `src/rules/ddlapi.ts` (stub), `src/rules/index.ts`, `src/index.ts`
- [ ] Property-name + kind constants (no bare literals).
- [ ] `DdlApiDialect` interface (D6 signature) + `DIALECT_POSTGRES` stub.
- [ ] `export const DDL_API_NORMALIZE_OPTIONS` (D7) defined and re-exported from `src/index.ts` (its contract test lands in Task 3a, once unify makes flags observable).
- [ ] `RULES[SPEC_TYPE_DDL_API_1] = ddlApiRules(SPEC_TYPE_DDL_API_1, DIALECT_POSTGRES)`; new public symbols re-exported from `src/index.ts`.
- Verify: `npm run build`

**Task 1c — Containment validate tree + test helper · M · deps: 1b**
Files: `src/rules/ddlapi.ts`, `src/rules/ddlapi.const.ts`, `test/helpers/ddlapi.ts`, `test/ddlapi/validate.test.ts`
- [ ] `ddlApiRules` covers Realm→Schema→Table→Column/Index/PK/FK→type/parts/attrs with `checkType`/`checkContains` (on `kind`, `ReferenceOption`); union `kind`-dispatchers route to per-kind rules; `Unknown*` is a validate-only `{kind:string}` passthrough (no PG specifics — those are Phase 4).
- [ ] `test/helpers/ddlapi.ts` exports `buildRealmAndAssertValid(ddl)` (async, `{strict:true}`, asserts no issues).
- [ ] `normalize(realm, {validate:true, unify:false, mergeAllOf:false, mergeTraits:false})` returns the structure unchanged and clean for a representative realm.
- [ ] Malformed-but-known value (`onDelete:'BOGUS'`) reported via `onValidateError` and stripped (D9).
- Verify: `npm test -- test/ddlapi/validate.test.ts`

### Phase 2 — origins (definition walk)

**Task 2 — `defineDdlApiOrigins` + pipeline dispatch · M · deps: 1c**
Files: `src/define-ddlapi-origins.ts`, `src/normalize.ts`, `test/ddlapi/origins.test.ts`, `test/ddlapi/references.test.ts`, `test/ddlapi/partial-realm.test.ts`
- [ ] Definition-first walk over the typed `Realm` (D5 order); interns one `ChainItem` per instance; reference edges reuse home origins; reuses `createCycledJsoHandlerHook`; emits an identity-preserving clone.
- [ ] `normalize.ts` dispatches the origins stage by spec family (JSON `$ref` path untouched).
- [ ] FK (incl. forward/cyclic) + enum-typed column + composite index: no infinite recursion; shared instances stay `===`; reference-edge origins point at the definition site; `commonOriginsCheck(result)` passes.
- [ ] Partial realm (dangling `refTable`/unresolved column): reported via callback, output partial, **no throw**, origins valid for the rest (D9).
- Verify: `npm test -- test/ddlapi/origins.test.ts test/ddlapi/references.test.ts test/ddlapi/partial-realm.test.ts`

### Phase 3 — empties & primitive defaults

**Task 3a — Empty collections (D3) + options contract test · M · deps: 2**
Files: `src/rules/ddlapi.ts`, `src/rules/ddlapi.const.ts`, `test/ddlapi/empties.test.ts`, `test/ddlapi/deunify.test.ts`, `test/ddlapi/normalize.options.test.ts`
- [ ] `valueDefaults`/`valueReplaces` per the D3 table (`TO_EMPTY_ARRAY_MAPPING`); `primaryKey`/`type`/`default` **not** defaulted.
- [ ] `empties.test.ts` green; round-trip for empties in `deunify.test.ts`.
- [ ] `DDL_API_NORMALIZE_OPTIONS` contract test (pattern: `test/oas/normalize.options.test.ts`).
- Verify: `npm test -- test/ddlapi/empties.test.ts test/ddlapi/deunify.test.ts test/ddlapi/normalize.options.test.ts`

**Task 3b — Simple primitive defaults (D4 core) · S · deps: 3a**
Files: `src/rules/ddlapi.ts`, `test/ddlapi/defaults.test.ts`
- [ ] `Index.unique:false`, `IndexPart.desc:false`, FK `onUpdate`/`onDelete` `'NO ACTION'` — all reversible.
- [ ] `defaults.test.ts` (non-nullability) green incl. round-trip.
- Verify: `npm test -- test/ddlapi/defaults.test.ts`

**Task 3c — PK-aware nullability (hard gate) · M · deps: 3b**
Files: `src/unifies/ddlapi.ts`, `src/rules/ddlapi.ts`, `test/ddlapi/defaults.test.ts`, `test/ddlapi/deunify.test.ts`
- [ ] `ddlApiNullabilityDefault` table-level forward/backward unify; PK members by reference identity → `null:false`, others → `null:true`; in-place shared `ColumnType` mutation with SYNTHETIC/PURE marking + origins.
- [ ] **Documented exception:** in-place child mutation is the sanctioned `pathItemsUnification` pattern — leave a comment on the unify and in the ddlapi rules notes: *"documented exception to the immutable-forward-pass rule; do not generalize."*
- [ ] **Hard gate:** PK column with no clause → `null:false`; non-PK → `null:true`; full round-trip.
- Verify: `npm test -- test/ddlapi/defaults.test.ts test/ddlapi/deunify.test.ts`

### Phase 4 — PostgreSQL overlay

**Task 4a — PG object/attr kinds · M · deps: 3c**
Files: `src/rules/ddlapi.postgres.ts`, `src/rules/ddlapi.const.ts`, `test/ddlapi/postgres.test.ts`
- [ ] Rules + defaults/replaces for Identity, Partition, Inherits, StorageParams, ExcludeConstraint, CompositeType, RangeType, `pg:domain`, Trigger; composed onto core via the dialect registry.
- [ ] Each normalizes, round-trips, and carries origins.
- Verify: `npm test -- test/ddlapi/postgres.test.ts`

**Task 4b — PG index attrs + dialect primitives · M · deps: 4a**
Files: `src/rules/ddlapi.postgres.ts`, `test/ddlapi/postgres.test.ts`
- [ ] IndexInclude, IndexNullsDistinct, IndexType, IndexPredicate, Concurrently, IndexColumnProp, IndexOpClass; dialect primitive defaults `unsigned` and `GeneratedExpr.type:'STORED'`.
- [ ] normalize + round-trip + origins for each.
- Verify: `npm test -- test/ddlapi/postgres.test.ts`

### Phase 5 — hashing & e2e

**Task 5 — Hashing + e2e · M · deps: 4b**
Files: `src/rules/ddlapi.ts`, `test/ddlapi/hash.test.ts`, `test/ddlapi/e2e.test.ts`
- [ ] `hashOwner:true` / `hashStrategy:CURRENT_DATA_LEVEL` / `newDataLayer` on entity nodes (JSON-Schema analogue); no whole-realm hash; `ddlapi` stamp not hashed.
- [ ] equal-modulo-defaults realms hash equal; a semantic change (incl. `raw`/comment) differs; **deterministic re-hash of a cyclic FK graph** (Q4).
- [ ] `e2e.test.ts`: full normalize on a realistic multi-table DDL — `toMatchObject` + origins + per-element hashes.
- Verify: `npm test -- test/ddlapi/hash.test.ts test/ddlapi/e2e.test.ts`, then full `npm test -- test/ddlapi`

### Checkpoints

- [x] **After Phase 1** — `npm test -- test/ddlapi/detect.test.ts test/ddlapi/validate.test.ts` + `npm run build` green; review that `resolveSpec` never falls through for a `Realm`-shaped object.
- [x] **After Phase 2** — origins/references/partial-realm tests green; `commonOriginsCheck` on the FK-cycle + enum-column fixture;
- [x] **After Phase 3** — `deunify.test.ts` green **including PK nullability**.
- [x] **Complete** — full `test/ddlapi/` suite green (61 tests, 13 files); hash + e2e gates pass; `DDL_API_NORMALIZE_OPTIONS` contract test passes; whole repo suite green (no regressions).

### Implementation updates (deltas applied during build — design unchanged in intent)

These refine, not reverse, the decisions above. Marked **[UPDATE]** for traceability.

- **[UPDATE D6] Dialect registry returns `NormalizationRules`, not `NormalizationRule`.** A dialect
  kind can carry nested child-path rules (e.g. `Partition.parts`), so `attrRulesFor` /
  `objectRulesFor` / `typeRulesFor` return `NormalizationRules | undefined`. `DIALECT_POSTGRES`
  lives in `src/rules/ddlapi.postgres.ts` (not `ddlapi.dialect.ts`, which keeps only the
  interface + id) to avoid a cycle; `RULES` imports it from there.
- **[UPDATE D9] Optional scalar validators tolerate `undefined`.** `buildFromDdl` assigns some
  optional fields (e.g. an anonymous `ExcludeConstraint`'s `name`) the value `undefined` rather
  than omitting them. `checkType(TYPE_STRING, TYPE_UNDEFINED)` (and boolean/number variants)
  accepts that — semantically absent — avoiding spurious `onValidateError`s and keeping
  round-trip faithful (jest `toEqual` ignores `undefined`-valued keys). `TYPE_UNDEFINED` is now
  exported from `src/validate/checker.ts`.
- **[UPDATE D2/D5] `schema` and `ColumnType.type` are explicit reference edges in
  `defineDdlApiOrigins`.** Any `schema` property is a back-reference to the owning `Schema`
  (EnumType / CompositeType / RangeType / pg:domain), never a containment home. **`ColumnType.type`**
  (a `kind`-carrying SchemaType) is also treated as a reference edge: a *named* type
  (enum / pg:domain) is the same instance as in `schema.objects`, so it is homed at its
  definition site **regardless of walk order, including cross-schema** — removing the earlier
  reliance on `objects`-before-`tables` ordering (which is now only a stable-ordering nicety).
  An *inline* type has no other home, so pass B homes it at the column type (cache miss) — also
  correct. (Composite/Range carry a schema-*name* string, harmlessly skipped as a non-object.)
- **[UPDATE D1] The origins stage is dispatched on the `ddlapi` stamp (`isDdlApi`), not on a
  successful `resolveSpec`.** A stamped-but-unsupported version (e.g. `2.0.0`) therefore still
  takes the ddlapi origins walk rather than silently falling onto the JSON-Schema `$ref` path;
  version rejection remains the job of the version-keyed stages (validate/unify/hash). Covered by
  `detect.test.ts`.
- **[UPDATE D9] Dangling FK edges are reported (string message), not just left partial.** A
  forward-only `reportDanglingForeignKey` unify on the `ForeignKey` node emits
  `onUnifyError` with the stable prefix `'ddlapi: dangling foreign key'` when an FK has source
  columns but no resolved `refTable`, leaving the realm partial and never throwing
  (`partial-realm.test.ts`). The structured `cause` remains the deferred additive follow-up below.
- **[UPDATE D8] Hash granularity made explicit.** A rule **without** `hashStrategy` is *excluded*
  from the hash, so every content key carries `hashStrategy: CURRENT_DATA_LEVEL`; only nested
  *entities* get a `newDataLayer` + `BEFORE_SECOND_DATA_LEVEL` boundary. Consequences, consistent
  with D8's per-entity model: (a) a table/index/FK hash captures nested **entities** (its
  columns/indexes/FKs) only *structurally* — a column-content change perturbs the **column's**
  hash, not its table's (downstream correlates by per-element hash + origins, never array index);
  (b) `IndexPart`s and FK `columns`/`refColumns` are **content** (included in the index/FK hash so
  an index over `a` differs from one over `b`); (c) only `fk.refTable` is boundaried — its shallow
  capture is what cuts the table↔FK cycle for `object-hash`.
- **[UPDATE Task 0a/0b] Test wiring for ddlapi's browser-targeted dist.** ddlapi's published dist
  externalizes Node's `fs`, breaking the libpg-query WASM parser under Node/Jest. Jest maps the
  package specifier to ddlapi's TS source (`jest.config.ts` `moduleNameMapper`), and a test-only
  `tsconfig.test.json` disables `importHelpers` so transforming that source needs no `tslib`.
  Production stays unaffected (ddlapi external via `vite.config.ts`). Documented in
  `docs/ddlapi-dependency.md`.

### Risks & mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Silent JSON-Schema misclassification of a `Realm` | High | Task 1a: `isDdlApi` before fallthrough; throw on bad version; detection tests |
| `defineDdlApiOrigins` walk order wrong (enum/forward-FK first-encounter) | High | D5 definition-first order; Task 2 gate with FK cycle + enum column + `commonOriginsCheck` |
| PK nullability in-place mutation corrupts shared refs / round-trip | High | `pathItemsUnification` precedent; isolated Task 3c; SYNTHETIC/PURE marking; round-trip gate |
| Cyclic-graph hash non-determinism | Med | Task 5 / Q4 gate: deterministic re-hash of a cyclic FK graph |
| ddlapi unpublished → CI breaks | Med | Task 0b: workspace/tarball; pin min version at publish |
| Phase 1 scope creep (full union dispatch before unify) | Med | Task 1c is validate-only with `Unknown*` passthrough; PG overlay deferred to Phase 4 |

### Deferred follow-ups (not v1 tasks)

- **Structured `cause` on error callbacks (D9):** v1 ships string messages with stable
  prefixes (the dangling-FK reporter emits `'ddlapi: dangling foreign key …'`; invalid values are
  reported by `validate`); a structured `cause` for ddlapi-specific cases (dangling `refTable` vs
  invalid `onDelete`) is a separate additive follow-up. Also extend the dangling-edge reporter to
  unresolved FK `columns`/`refColumns` if a producer surfaces that partial shape.
- **Upstream type/expression canonicalization** — see the final section.

---

## Testing plan

Tests use Jest under `test/`, grouped by family. Add `test/ddlapi/` with `*.test.ts` files.
Import the engine from the package root (`from '../../src'`). Build fixtures with
`buildFromDdl(ddl)` from `@netcracker/qubership-apihub-ddlapi` (the ddlapi analogue of the
` graphapi`...` ` template tag) — this guarantees fixtures are *real* ddlapi documents.

Each file below is authored **within the task that introduces its behavior** (see the
verification commands in the task list) — the matrix is the catalogue, not a final-phase batch.

Add a ddlapi test helper (`test/helpers/ddlapi.ts`, **authored in Task 1c** — every downstream
test depends on it): an async `buildRealmAndAssertValid(ddl)` that calls `buildFromDdl` with
`{ strict: true }`, asserts no non-fatal issues, and returns the realm — mirroring
`parseAsyncApiAndAssertValid`. Reuse the existing
`TEST_ORIGINS_FLAG` / `TEST_HASH_FLAG` / `TEST_DEFAULTS_FLAG` symbols and the
`commonOriginsCheck` / `checkHashesEqualByPath` / `resolveValueByPath` helpers.

`baseOptions` bundle for the suite:
```typescript
const baseOptions = {
  validate: true,
  unify: true,
  mergeAllOf: false,
  mergeTraits: false,
  liftCombiners: false,
  resolveRef: false,
  originsFlag: TEST_ORIGINS_FLAG,
  hashFlag: TEST_HASH_FLAG,
  defaultsFlag: TEST_DEFAULTS_FLAG,
  createOriginsForDefaults: () => TEST_ORIGINS_FOR_DEFAULTS,
}
```
Enable only the stages a given test asserts on.

| Test file | Covers | Key assertions |
|---|---|---|
| `ddlapi/validate.test.ts` | D9 structural + value validation | invalid `kind` rejected; **malformed-but-known values** (e.g. `onDelete:'BOGUS'`, wrong-typed sub-field) reported via `onValidateError` **and stripped**; unknown escape-hatch kinds pass through |
| `ddlapi/partial-realm.test.ts` | D9 dangling edges | `foreignKey.refTable` undefined / unresolved column: reported via the error callback, output stays partial, **no throw**, origins still valid for the rest |
| `ddlapi/empties.test.ts` | D3 empty-collection defaults | absent `attrs`/`columns`/… become `[]`; `primaryKey`/`type` absence preserved; `toMatchObject` |
| `ddlapi/defaults.test.ts` | D4 primitive defaults | `unique:false`, `desc:false`, FK `NO ACTION`; nullability tri-state incl. PK-implicit NOT NULL via `ddlApiNullabilityDefault` |
| `ddlapi/origins.test.ts` | D5 origins from hierarchy | `commonOriginsCheck(result)`; spot-check a synthetic default's origin |
| `ddlapi/references.test.ts` | D2/D5 reference edges | FK (incl. cyclic) / enum-typed column / composite index: no infinite recursion, shared instances stay `===`, reference origins point at the definition site, origins valid |
| `ddlapi/postgres.test.ts` | D6 PG overlay | Identity/Partition/Trigger/ExcludeConstraint/pg:domain/Index* normalize + round-trip |
| `ddlapi/deunify.test.ts` | D10 reversibility | `denormalize(normalize(realm))` is **structurally equal to source minus synthetics**; intra-doc shared refs preserved (`===`); every default/empty round-trips |
| `ddlapi/hash.test.ts` | D8 hashing | per-entity hashes present (`hashOwner`); equal-modulo-defaults realms hash equal; a semantic change differs; **`raw` and comments affect the hash**; **deterministic on a cyclic FK graph** (Q4 gate); no whole-realm hash / version stamp not hashed |
| `ddlapi/e2e.test.ts` | realistic multi-table DDL | full normalize, snapshot-style `toMatchObject` + origins + per-element hashes |

**Reversibility is the highest-risk area** (per the testing skill) — every reversible default
gets an explicit round-trip assertion. Every fixture must be a valid ddlapi document
(`{ strict: true }` build with no issues) unless a test specifically exercises error handling,
in which case note it with a comment.

---

## Open questions / decisions needed

**Resolved:**
- **Q1 — origins stage output:** `defineDdlApiOrigins` emits an **identity-preserving clone**;
  the caller's Realm is never mutated.
- **Q3 — dialect discriminator:** keep a **single `SpecType` with PostgreSQL hardcoded**;
  design the `ddlApiRules(version, dialect)` seam for a future stamp. **Documented limitation:**
  normalizing a non-PostgreSQL ddlapi document is **undefined behavior** until a dialect is
  stamped (preferred future: `{ ddlapi, dialect? }` defaulting to `postgres`).
- **Q5 — `deps` / `View`:** **minimal defensive rules** only; no investment until a producer
  emits them.
- **Q4 — (reclassified as a test gate, not a decision):** because the graph is cyclic, Phase 5
  must verify `hash` is deterministic on a cyclic FK graph and that equal-modulo-defaults
  realms hash equal. The cycle hook + deferred-hash should handle it; cyclic hashing just needs
  the explicit gate.

- **Q2 — PK-aware nullability:** a **single table-level forward/backward unify**
  (`ddlApiNullabilityDefault`, `pathItemsUnification`-style in-place mutation of shared column
  types) keeps all nullability logic in one place. It is a **Phase 3 exit gate** — **no
  `null:true` fallback** (a wrong PK default would silently corrupt semantic equality).

**Residual:** none — the design is settled; open items are implementation gates inside the phases.

---

## Upstream follow-up (ddlapi) — type/expression canonicalization

Because api-unifier compares types and SQL expressions **opaquely** (D8, by interview
decision), the *quality* of ddlapi diffs depends entirely on how consistently `buildFromDdl`
fills the `type` / `raw` / `expr` strings. Equivalent inputs spelled differently will read as
real diffs:

- type spellings — `bigint` vs `int8`, `varchar(10)` vs `character varying(10)`, `numeric` vs
  `decimal`;
- default / check / generated / index-predicate expressions — `now()` vs `CURRENT_TIMESTAMP`,
  whitespace, identifier/keyword casing, redundant casts (`0` vs `0::integer`).

**This is deliberately not solved in api-unifier.** If false diffs from spelling variance
become a problem, the correct fix is **canonicalization upstream in ddlapi / the parser** (it
owns dialect knowledge and the Atlas-Go type model), so every consumer benefits and
api-unifier stays dialect-agnostic. Track this as a ddlapi enhancement; revisit the opaque
decision (D8) only if upstream canonicalization proves infeasible.
