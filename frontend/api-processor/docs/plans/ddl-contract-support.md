# Implementation Plan: DDL Contract Support in api-processor

Status: **Draft for review** · Author: planning session 2026-06-12 · Branch: `feature/ddl`

## Overview

Add a new contract type — **DDL** (PostgreSQL `.sql` / `.ddl` files) — to api-processor for
both `build` and `changelog` build types. api-processor never parses SQL itself: it delegates to
`@netcracker/qubership-apihub-ddlapi` (`buildFromDdl` → `Realm`), normalizes via
`@netcracker/qubership-apihub-api-unifier` (`DDL_API_NORMALIZE_OPTIONS`), and diffs via
`@netcracker/qubership-apihub-api-diff` (`apiDiff`, which dispatches `SPEC_TYPE_DDL_API_1`).

The **table is the contract unit** (the operation/entity analog). Indexes, foreign keys, comments,
triggers, and types are parts of a table, not separate entities. `view` is reserved for a later
version; v1 ships `table` only. DDL is **additive**: a package/version may mix DDL with
REST/async/graphql/MCP content, and dashboards may aggregate DDL-bearing refs (see AD6, Tasks 11/14).

> Non-obvious design decisions (renames, orphan types, parsing granularity, apiKind source, bwc mode,
> id collisions, export, incremental) are recorded in
> `[ddl-design-decisions.md](./ddl-design-decisions.md)` (D1–D15). **Non-goals for v1:** rename
> detection (D1), orphan-type changelog entries (D2), DDL export (D13), incremental rebuild (D14).

## Architecture Decisions

### AD1 — Table = DDL entity (build) + parallel DDL changelog (chosen)

Two existing patterns were candidates:

- **MCP** (`src/apitypes/mcp`, `src/components/mcp.ts`): a `buildMcpEntities` builder produces
entities into a flat `McpEntityIndex` on `BuildResult`, serialized to `mcp.json` + `mcp/<id>`.
MCP entities **never participate in changelog** — the comparison pipeline only diffs `ApiOperation`s.
- **REST** (`src/apitypes/rest`, `src/components/compare`): operations flow through
`compareVersionsOperations` → `versionOperationsResolver` (reads the previous version's
`operations.json`) → `apiBuilder.compareDocuments`.

DDL needs the MCP-style build artifacts (`ddl.json`, `ddl/`, `ddlEntityId`) **and** REST-style
changelog. The decision: **model the table as a DDL entity for build (no `operations.json`)**, and
add a **parallel, DDL-specific changelog path** that re-derives both sides from the published raw
`.sql` and runs `apiDiff`, emitting `ddlEntityId`-keyed change entries. We do **not** route DDL
through the operation/`compareVersionsOperations` pipeline — but the parallel path **reuses the
comparison primitives** rather than copy-pasting them (see AD7).

Rationale: keeps build artifacts exactly as specified; avoids polluting `operations.json` with
tables; the changelog reads only data we already persist (raw `.sql` + the document list).

### AD2 — Dedicated DDL comparison DTO over a shared, defined-once base

DDL gets its **own** comparison types (internal + DTO), not a reuse of `OperationChanges`. But the
fields that are genuinely identical between operation and DDL comparisons are defined **once** in
shared base interfaces; each variant extends the base and adds its own (consistently renamed) fields.
Extracting a base that the *existing* operation types extend keeps their field names byte-identical,
so REST/async/graphql/MCP output is **unchanged** (non-breaking refactor).

Field mapping (operation → DDL): `operationTypes` array → `contractsChangesSummary` object keyed by
contract type (`'ddl'`; the key replaces the per-entry `apiType`/`contractType` field),
`numberOfImpactedOperations → numberOfImpactedEntities`, `operationId → ddlEntityId`,
`previousOperationId → previousDdlEntityId`. DDL drops `tags` and `apiAudienceTransitions`; its
`metadata`/`previousMetadata` is the shared `DdlChangesMetadata` (= `DdlEntityDescriptor`:
`{ kind, name, schemaName, description }`).

The DDL changelog writes to its **own** sibling files — `ddl-comparisons.json` (index) +
`ddl-comparisons/<comparisonFileId>` (per-pair change data) — leaving the operation
`comparisons.json` / `comparisons/` completely untouched. The **comparison-internal documents**
(`comparison-internal-documents.json` + dir) remain **shared** (the merged Realm lands there
alongside REST merged docs). It does **not** reuse the operation *pipeline*
(`compareVersionsOperations`).

#### Comparison type model (target shapes)

```typescript
// ---- shared, defined once (src/types/internal/compare.ts) ----
interface ComparisonBase {
  comparisonFileId?: string
  packageId: PackageId
  version: VersionId
  revision?: number
  previousVersion: VersionId
  previousVersionPackageId: PackageId
  previousVersionRevision?: number
  fromCache: boolean
  comparisonInternalDocuments: ComparisonInternalDocument[]   // omitted in every *Dto
}

interface ContractTypeBase<T> { changesSummary: ChangeSummary<T> }

interface ChangesBase<T> {
  changeSummary: ChangeSummary<T>
  comparisonInternalDocumentId?: string
  apiKind?: ApihubApiCompatibilityKind
  previousApiKind?: ApihubApiCompatibilityKind
}

// ---- operation variant (existing types, refactored to extend the bases — names unchanged) ----
interface OperationType<T> extends ContractTypeBase<T> {
  apiType: OperationsApiType
  numberOfImpactedOperations: ChangeSummary<T>
  apiAudienceTransitions: ApiAudienceTransition[]
  tags?: string[]
}
interface OperationChanges<T> extends ChangesBase<T> {
  operationId?: string; previousOperationId?: string
  apiType: BuilderType
  impactedSummary: ImpactedOperationSummary   // internal-only
  diffs?: Diff[]                              // internal-only
  metadata?: OperationChangesMetadata & { [k: string]: unknown }
  previousMetadata?: OperationChangesMetadata & { [k: string]: unknown }
}
interface VersionsComparison<T> extends ComparisonBase {
  operationTypes: OperationType<T>[]
  data?: OperationChanges[]
}

// ---- DDL variant (new — src/types/internal/compare.ts + src/types/package/ddl.ts) ----
// DdlChangesMetadata = DdlEntityDescriptor = { kind, name, schemaName, description } (see Interface section)
interface DdlContractChangesSummary<T> {        // value held under each contract-type key
  changesSummary: ChangeSummary<T>
  numberOfImpactedEntities: ChangeSummary<T>
}
type DdlContractsChangesSummary<T> = Partial<Record<'ddl', DdlContractChangesSummary<T>>>
interface DdlChanges<T> extends ChangesBase<T> {
  ddlEntityId?: DdlEntityId; previousDdlEntityId?: DdlEntityId
  impactedSummary: ImpactedOperationSummary   // internal-only (drives numberOfImpactedEntities)
  diffs?: Diff[]                              // internal-only
  metadata?: DdlChangesMetadata
  previousMetadata?: DdlChangesMetadata
}
interface DdlComparison<T> extends ComparisonBase {
  contractsChangesSummary: DdlContractsChangesSummary<T>   // keyed by contract type, not an array
  data?: DdlChanges[]
}

// ---- DTOs (Omit the internal-only fields, add `changes`) ----
interface DdlChangesDto extends Omit<DdlChanges<DiffTypeDto>, 'diffs' | 'impactedSummary'> {
  changes?: ChangeMessage<DiffTypeDto>[]
}
interface DdlComparisonDto extends Omit<DdlComparison<DiffTypeDto>, 'data' | 'comparisonInternalDocuments'> {
  data?: DdlChangesDto[]
}
```

A `toDdlComparisonDto` (sibling of `toVersionsComparisonDto` in `utils/transformToDto.ts`) performs
the `diffs → changes` conversion (`toChangeMessage`) and the `risky → semi-breaking` summary remap,
reusing the existing `toChangeMessage` / `replacePropertyInChangesSummary` helpers verbatim.

### AD3 — Internal document = normalize → denormalize → serialize

The REST internal document is `serializeDocument(denormalize(effectiveNormalizedDoc, options))`
(`createSerializedInternalDocument` in `utils/operations.utils.ts`). DDL follows the **same
pipeline**: build the `Realm` once, `normalize(realm, { ...DDL_API_NORMALIZE_OPTIONS })`,
`denormalize(...)`, then `serializeDocument(...)`, and attach it as the `versionInternalDocument`
(`createVersionInternalDocument(slug)`). Every table entity references it via
`versionInternalDocumentId`. The build document keeps the **original `.sql` verbatim** as its
`source`/dumped data (it is the applicable, correctly ordered SQL).

### AD4 — Per-entity SQL extraction is a stub for now

`ddl/<ddlEntityId>` must contain the minimal valid SQL for one table (its `CREATE TABLE` +
`CREATE INDEX` + `COMMENT ON`). The real extraction belongs in `ddlapi`. For v1, add a single
api-processor helper `extractTableStatements(sourceSql, schema, tableName): string` that returns
stub data (concatenated args) with a `TODO` to move it to `ddlapi`.

### AD5 — New api type surface

- `DDL_CONTRACT_TYPE = 'ddl'` (in `src/consts.ts`), added to the `BuilderType` union. (Named
`DDL_CONTRACT_TYPE`, not `DDL_API_TYPE`, to align with the `contractsChangesSummary` DTO naming, where it
is the contract-type key.)
- One document type: `DDL_DOCUMENT_TYPE = { DDL: 'ddl' }`; `kind` (`table`) is per entity.
- File format `sql` (and `ddl`); detection by extension in the parser.
- `ApiBuilder` gains two optional members: `buildDdlEntities?: DdlEntitiesBuilder<T>` (mirrors
`buildMcpEntities`) and `compareDdlDocuments?: DdlDocumentsCompare` (the per-pair compare hook —
signature defined in the Interface section, implemented in Task 7, invoked by Task 9).

### AD6 — DDL coexists with other contract types (mixed packages + dashboards)

DDL is additive, never exclusive. A single package/version may contain DDL **and**
REST/async/graphql/MCP content; the `BuildStrategy` already dispatches per file by builder, and the
changelog runs operation and DDL comparison steps side by side (Task 14). A version's outputs are the
union: `operations.json` + `ddl.json`, `comparisons.json` + `ddl-comparisons.json`, with each contract
type summarized independently. **Dashboards** (ref-composed packages) aggregate DDL through
`compareVersionsReferences` exactly as they do operations — the per-ref `DdlComparison` is produced on
cache-miss or read from the cached ref comparison on hit (Task 11).

### AD7 — Maximize comparison-pipeline reuse (shared core, parallel orchestration)

DDL's changelog is *orchestrated* separately (AD1: it does not route through `compareVersionsOperations`),
but it must **not copy-paste** the comparison machinery. The code splits into three buckets.

**(1) Reused as-is — already contract/id-agnostic; DDL imports, does not fork:**

| Helper | Location |
|---|---|
| `calculateChangeSummary`, `calculateImpactedSummary`, `removeObjectDuplicates` | `utils/builder.ts` |
| `calculateDiffId` | `utils/calculateDiffId.ts` |
| `difference`, `intersection` (pairing-key set ops) | `utils/arrays.ts` |
| `dedupeTuples`, `removeRedundantPartialPairs` (doc-pair dedupe, generic over `[A?,B?]`) | `compare.utils.ts` |
| `createComparisonFileId`, `createComparisonInternalDocumentId`, `createComparisonInternalDocuments` | `compare.utils.ts` |
| `calculateTotalChangeSummary`, `calculateTotalImpactedSummary` | `compare.utils.ts` |
| `toChangeMessage`, `replacePropertyInChangesSummary`, `replaceStringDiffType` (DTO conversion) | `utils/transformToDto.ts` |

**(2) Generalized / extracted — small non-breaking refactors; REST is rewired onto the extraction, DDL reuses it:**

1. **Pair-by-key core.** Extract the added/removed/changed-by-key logic from `createPairOperationsMap`
   into a generic `pairByKey<T>(previous, current, keyOf): Record<string, { previous?: T; current?: T }>`
   (built on `difference`/`intersection`). `createPairOperationsMap` becomes a thin wrapper supplying
   the normalized-operation-id + group-prefix `keyOf`; DDL calls `pairByKey` with `keyOf = e => e.ddlEntityId`.
2. **Change-record base.** Extract `createChangeBase(diffs, comparisonInternalDocumentId)` →
   `{ changeSummary, impactedSummary, comparisonInternalDocumentId, diffs }` (the `ChangesBase` fields
   from AD2). `createOperationChange` and the new `createDdlChange` each build on it and add only their
   id + metadata.
3. **Comparison-document wrapper.** Widen `createComparisonDocument` (and the `ApiDocument` type
   `serializeDocument` accepts) to include `Realm`, so the merged DDL Realm serializes through the
   same path — no DDL-specific serializer.
4. **(Optional) Version resolve + builder-version validation.** `compareVersionsOperations` resolves
   both versions and runs `validateApiProcessorVersion` / `getMismatchedBuilderVersion`. Hoist this
   into `compareVersions` (resolve once, pass the resolved `VersionCache` pair to both
   `compareVersionsOperations` and `compareVersionsDdl`) so DDL neither re-resolves nor re-validates.
   Do this **only** if it stays a clean change to the operation path; otherwise DDL resolves
   independently and the hoist is skipped.

**(3) Stays parallel — genuinely divergent, no forced sharing:**

- The per-contract body: REST reads `operations.json` via `versionOperationsResolver` and keys by
  `createNormalizedOperationId`; DDL reads raw `.sql` via `rawDocumentResolver`, `buildFromDdl`s, pairs
  by `ddlEntityId`, and walks the merged `Realm`. The `compareDocuments` vs `compareDdlDocuments` hooks
  take different inputs and produce different results.
- The comparison envelope differs only in variant fields (`operationTypes`/`contractsChangesSummary`, …) — already
  unified at the **type** level by `ComparisonBase` (AD2); no function sharing needed.

**Guard:** every extraction in bucket (2) is covered by the **same regression guard as the type
refactor** — `changes` / `asyncapi-changes` / `graphql-changes` / `comparison-internal-documents` must
stay byte-identical, because REST now calls the extracted helpers. (Plan Task 8.)

### Data flow

**Build** (`BuildStrategy`):

```
.sql file
  → parseDdlFile        (buildFromDdl → Realm; onError → file.errors)         [Task 2]
  → buildDdlDocument    (VersionDocument type 'ddl', source = raw SQL,         [Task 3]
                         versionInternalDocument = serialize(denormalize(normalize(Realm))))
  → processDdlDocument  (buildDdlEntities → DdlEntityIndex on BuildResult)     [Tasks 4–6]
  → package.ts          (ddl.json grouped by kind + ddl/<id> SQL files)        [Task 6]
```

**Changelog** (`compareVersions` → new `compareVersionsDdl`):

```
prev/curr version params
  → versionDocumentsResolver(version, pkg, DDL_CONTRACT_TYPE)  (DDL doc slugs)         [Task 9]
  → rawDocumentResolver(version, pkg, slug)                    (raw .sql per doc)
  → buildFromDdl per doc → ddlEntityId → (sourceFile, table) map, both versions        [Task 9]
  → PAIR by ddlEntityId across files (cross-file moves) → realm/document pairs          [Task 9]
       (pairing happens BEFORE apiDiff so a moved table lines up, not remove+add)
  → per pair: apiDiff(prevRealm, currRealm, DDL opts) → merged Realm + diffs            [Task 7]
  → walk merged Realm tables → per-ddlEntityId diff sets (+indexes/FK/objects)          [Task 7]
  → dedup + summary → DdlComparison(contractsChangesSummary) + shared ComparisonInternalDocument[] [Tasks 9–10]
```

## Interface / Contract Definitions

> The consumer-facing **output package layout** (build-result zip shape) for `build` and `changelog`,
> with a consistency review against REST/MCP, lives in
> `[ddl-build-result-contract.md](./ddl-build-result-contract.md)`. **C3 is resolved**: `ddlEntityIds`
> are **not** serialized to `documents.json` (DDL follows MCP; reverse link is `ddl.json[*].documentId`)
> — see Task 6. **C2** (per-pair wrapper key `entities` vs `operations`) still needs backend confirmation.

New module `src/types/package/ddl.ts`:

```typescript
export const DDL_KIND = { TABLE: 'table' } as const          // VIEW: 'view' later
export type DdlKind = typeof DDL_KIND[keyof typeof DDL_KIND]

export type DdlEntityId = string                              // see "ddlEntityId — canonical algorithm"

export interface DdlEntitySearch { useEntityDataAsSearchText: boolean }

// Shared descriptor — the human-facing identity of a DDL entity. Defined once and reused by
// both the build index row (PackageDdlEntity) and the changelog metadata (DdlChangesMetadata).
export interface DdlEntityDescriptor {
  kind: DdlKind                                               // 'table' (v1)
  name: string                                                // table name
  schemaName: string                                          // entity scope (mcpEndpoint analog)
  description: string                                         // COMMENT ON TABLE, '' if none
}

export interface PackageDdlEntity extends DdlEntityDescriptor {   // the ddl.json index row
  ddlEntityId: DdlEntityId
  search: DdlEntitySearch
  documentId: string
  versionInternalDocumentId: string
}

export interface DdlEntity extends PackageDdlEntity { data: string }   // data = minimal SQL (AD4)

export type DdlEntityIndex = Map<DdlEntityId, DdlEntity>

export interface PackageDdlFile { tables: PackageDdlEntity[] }         // + views later

// changelog metadata == the descriptor (kind, name, schemaName, description), nothing more
export type DdlChangesMetadata = DdlEntityDescriptor
```

New constants in `src/consts.ts`: `DDL_CONTRACT_TYPE = 'ddl'`, `FILE_FORMAT_SQL`/`FILE_FORMAT_DDL`, and
`PACKAGE.DDL_FILE_NAME = 'ddl.json'`, `PACKAGE.DDL_DIR_NAME = 'ddl'`,
`PACKAGE.DDL_COMPARISONS_FILE_NAME = 'ddl-comparisons.json'`,
`PACKAGE.DDL_COMPARISONS_DIR_NAME = 'ddl-comparisons'`. Comparison-internal documents stay shared
(`PACKAGE.COMPARISON_INTERNAL_*`).

### `ddlEntityId` — canonical algorithm

One algorithm, used everywhere the id appears (the `ddl/` filename, cross-file changelog pairing, and
the changelog change identity). The id is **opaque** — produced once, never parsed back into parts.

```ts
// in src/apitypes/ddl/ddl.entities.ts — the single source of truth
import { slugify, SLUG_OPTIONS_OPERATION_ID } from '../../utils'   // same options REST/MCP use

export function calculateDdlEntityId(schemaName: string, kind: DdlKind, name: string): DdlEntityId {
  return `${slugify(schemaName, SLUG_OPTIONS_OPERATION_ID)}-${kind}-${slugify(name, SLUG_OPTIONS_OPERATION_ID)}`
}
```

- `**schemaName**` — the schema resolved by ddlapi (qualified schema, else `public`). Slugified.
- `**kind**` — a literal `DdlKind` value (`'table'`); a controlled vocabulary, **not** slugified.
- `**name`** — the table name resolved by ddlapi. Slugified.
- Segments are slugified **independently**, then joined with `-` (mirrors `calculateMcpEntityId`).
- Two distinct tables that produce the **same** id collide → `duplicate-object` Error, publish breaks
(D10). Because the id is opaque, the structural `-` separators need not be recoverable.

This supersedes the looser `${schemaName}-${kind}-${name}` shorthand used elsewhere in earlier drafts;
Task 4 and the contract doc reference this definition.

New `src/apitypes/ddl/` module mirroring `src/apitypes/mcp/`:
`index.ts`, `ddl.consts.ts`, `ddl.types.ts` (`ParsedDdlData = { realm: Realm; originalSql: string }`),
`ddl.parser.ts`, `ddl.document.ts`, `ddl.entities.ts`, `ddl.changes.ts`, `ddl.utils.ts`,
`ddl.validation.ts`.

`ApiBuilder` additions (`src/types/internal/apiBuilder.ts`):

```typescript
export type DdlEntitiesBuilder<T> = (document: VersionDocument<T>, file: BuildConfigFile) => DdlEntity[]

// Per-document-pair compare hook. `compareVersionsDdl` (Task 9) owns resolution + ddlEntityId pairing
// (incl. cross-file moves) and calls this once per resolved Realm pair. A one-sided pair (whole .sql
// added/removed) passes `undefined` on the missing side; the hook builds the empty counterpart
// internally (analog of REST's createCopyWithEmptyPathItems). The hook runs apiDiff, walks the merged
// Realm, and fans shared-type diffs out to every referencing table (D2).
export interface DdlComparePairContext {
  previousVersion: VersionId
  currentVersion: VersionId
  previousPackageId: PackageId
  currentPackageId: PackageId
  notifications: NotificationMessage[]
  normalizedSpecFragmentsHashCache: ObjectHashCache
  // (apiKind removed — D4 reverted: no apiKind-driven bwc-mode reclassification for DDL)
}

export interface DdlDiffResult {
  changesByEntityId: Map<DdlEntityId, Diff[]>     // a shared-type diff appears under each referencing id (D2)
  mergedRealm: Realm                              // serialized to the comparison-internal doc, REST merged form (D5)
}

export type DdlDocumentsCompare = (
  prevRealm: Realm | undefined,
  currRealm: Realm | undefined,
  ctx: DdlComparePairContext,
) => DdlDiffResult

// added to ApiBuilder<T>:
//   buildDdlEntities?: DdlEntitiesBuilder<T>
//   compareDdlDocuments?: DdlDocumentsCompare
```

`compareVersionsDdl` selects the builder via `ctx.apiBuilders.find(b => b.apiType === DDL_CONTRACT_TYPE)`
and invokes `compareDdlDocuments` per pair — the same registry indirection
`compareCurrentApiType` uses for `compareDocuments`, so DDL stays a registered builder rather than a
hard-wired import. (Tags are omitted from `DdlDiffResult` — N/A for DDL.)

Publish config (no per-file metadata; schema comes from the SQL):

```json
{ "files": [ { "fileId": "ddl/shop.sql" } ] }
```

---

## Task List

### Phase 0 — Foundation & wiring

#### Task 1: Add ddlapi dependency, consts, and package types

**Description:** Add `@netcracker/qubership-apihub-ddlapi` as an npm dependency and introduce the
DDL constants, the `BuilderType` union member, and `src/types/package/ddl.ts`. No behavior yet.

**Acceptance criteria:**

- [x] **Done (2026-06-12):** `@netcracker/qubership-apihub-ddlapi`, `api-diff`, `api-unifier` are
      installed at their `feature-ddl` versions with DDL support present (Risk R1 resolved). Remaining
      Task-1 work below is the `package.json` dep entries already added + the consts/types.
- [x] **Done (2026-06-12):** `DDL_CONTRACT_TYPE`, `FILE_FORMAT_SQL`/`FILE_FORMAT_DDL`,
  ```
  `PACKAGE.DDL_FILE_NAME`, `PACKAGE.DDL_DIR_NAME`, `PACKAGE.DDL_COMPARISONS_FILE_NAME`,
  `PACKAGE.DDL_COMPARISONS_DIR_NAME` added; `BuilderType` union includes `'ddl'`.
  ```
- [x] **Done (2026-06-12):** `src/types/package/ddl.ts` types compile and are exported from `src/types/package/index.ts`.
- [x] **Done (2026-06-12) — Contract-first:** `ApiBuilder` gains optional `buildDdlEntities?: DdlEntitiesBuilder<T>` and
  ```
  `compareDdlDocuments?: DdlDocumentsCompare`, with `DdlEntitiesBuilder`, `DdlDocumentsCompare`,
  `DdlComparePairContext`, `DdlDiffResult` defined (Interface section) — so Tasks 4/7/9 build
  against a fixed signature, not a TBD.
  ```

**Verification:** `npm run build` (tsc) succeeds.
**Dependencies:** None.
**Files:** `package.json`, `src/consts.ts`, `src/types/internal/apiBuilder.ts`,
`src/types/package/ddl.ts`, `src/types/package/index.ts`.
**Scope:** M

---

### Phase 1 — Build: parse & document

#### Task 2: DDL parser (`parseDdlFile`)

**Description:** Detect `.sql`/`.ddl`, call `buildFromDdl`, capture the `Realm` and original SQL into
`ParsedDdlData`, and map non-fatal `onError` issues to `TextFile.errors`. `DdlParseError` (invalid
SQL) propagates and breaks the publish.

**Acceptance criteria:**

- [x] **Done (2026-06-12):** Non-`.sql`/`.ddl` files return `undefined` (let the next builder claim them).
- [x] **Done (2026-06-12):** Valid SQL yields `{ realm, originalSql }`; `source` keeps the original bytes verbatim.
- [x] **Done (2026-06-12):** `onError` issues collected onto `TextFile.errors`; `DdlParseError` rejects (no swallowing).

**Verification:** `npm test -- ddl-unit` (parser cases: valid, invalid syntax, out-of-scope statement).
**Dependencies:** Task 1.
**Files:** `src/apitypes/ddl/ddl.parser.ts`, `src/apitypes/ddl/ddl.types.ts`, `src/apitypes/ddl/ddl.consts.ts`.
**Scope:** M

#### Task 3: `buildDdlDocument` + `dumpDdlDocument` + internal document

**Description:** Produce a `VersionDocument` (type `ddl`, format `sql`, `source` = raw SQL,
`operationIds: []` — DDL has no operations; **no** `ddlEntityIds` field, per C3/D14 it is neither
serialized nor needed). Build the internal document the same way REST does (AD3):
`normalize(realm, DDL_API_NORMALIZE_OPTIONS)` → `denormalize(...)` → `serializeDocument(...)`, attached
via `createVersionInternalDocument(slug)` (reuse `createSerializedInternalDocument`). `dumpDdlDocument`
returns the original SQL. Set `document.apiKind` from the file's passthrough metadata (D9 — the one
place per-file metadata is read; entity *scope* still comes only from the SQL).

**Acceptance criteria:**

- [x] **Done (2026-06-12):** Document carries the verbatim SQL and a non-empty serialized internal document (normalize →
  ```
  denormalize → serialize round-trip).
  ```
- [x] **Done (2026-06-12):** Serialization handles unifier symbols/origins the way REST does (`serializeDocument` +
  ```
  `SERIALIZE_SYMBOL_STRING_MAPPING`); `ORIGINS_SYMBOL`/synthetic flags don't corrupt output.
  ```

**Verification:** `npm test -- ddl-build` (document + `version-internal-documents/` assertions).
**Dependencies:** Task 2.
**Files:** `src/apitypes/ddl/ddl.document.ts`, `src/apitypes/ddl/ddl.utils.ts`.
**Scope:** M

#### Checkpoint A — after Tasks 1–3

- [x] **Done (2026-06-12):** `npm run build` clean; `ddl-unit` green for parse + document slices
      (parser cases + `buildDdlDocument` internal-document round-trip). The document slice is covered
      in `ddl-unit.test.ts`; the dedicated `ddl-build.test.ts` (full publish path) lands with Tasks 4–6.
- [ ] A single `.sql` publishes to a `documents.json` entry + a version-internal document — **deferred
      to Task 6/13**: requires `ddlBuilder` registration + the `BuildStrategy` branch, which are not
      wired yet. Proven at the unit level (`buildDdlDocument`), not yet through the full publish.

---

### Phase 2 — Build: entities (`ddl.json` + `ddl/`)

#### Task 4: `ddlEntityId` + `buildDdlEntities`

**Description:** Walk the **raw** Realm (from `buildFromDdl`, per OQ3)
`schemas[] → tables[]`, computing the id with `calculateDdlEntityId` (the canonical algorithm — see
[ddlEntityId — canonical algorithm](#ddlentityid--canonical-algorithm); schema resolved by ddlapi,
defaulting to `public`). Emit `DdlEntity` rows
populating the shared `DdlEntityDescriptor` fields (`kind: 'table'`, `name` = table name,
`schemaName`, `description` = `COMMENT ON TABLE` or `''`) plus `search.useEntityDataAsSearchText: true`,
`documentId`, `versionInternalDocumentId`, `data` = extracted SQL. Detect **intra-document** duplicate
ids only (this builder sees one document); a within-document `duplicate-object` is an **Error** that
breaks the publish. Cross-document collisions are Task 6's job (mirrors MCP: `buildMcpEntities` dedups
within a doc, `processMcpDocument` across docs).

**Acceptance criteria:**

- [x] **Done (2026-06-12):** Ids are produced by `calculateDdlEntityId` only (one code path); qualified table → its schema,
  ```
  unqualified → `public`; segments slugified with `SLUG_OPTIONS_OPERATION_ID`, `kind` literal.
  ```
- [x] **Done (2026-06-12):** `name`, `schemaName`, `description` populated; `description` from the table's `Comment` attr (via `findAttr`, `''` when absent).
- [x] **Done (2026-06-12):** Two tables colliding on `ddlEntityId` **within the same document** (incl. post-slugify) throw (D10);
      cross-document collisions are **not** this task's concern (Task 6). *(Note: slugify preserves case —
      see deviation; the test uses a space-vs-hyphen collision, not the D10 `Users`/`users` example.)*

**Verification:** `npm test -- ddl-build` (id calc, schema defaulting, description, duplicates).
**Dependencies:** Task 3.
**Files:** `src/apitypes/ddl/ddl.entities.ts`, `src/apitypes/ddl/ddl.consts.ts`.
**Scope:** M

#### Task 5: `extractTableStatements` stub

**Description:** Add `extractTableStatements(sourceSql, schema, tableName): string` returning stub
output (concatenated args) with a `TODO` to move extraction into `ddlapi`. `buildDdlEntities`
populates `DdlEntity.data` from it.

**Acceptance criteria:**

- [x] **Done (2026-06-12):** Helper is pure, documented, and `TODO`-marked; wired into entity `data`
      (`extractTableStatements` in `ddl.utils.ts`, returns a deterministic `schema\nname\nsourceSql` stub).

**Verification:** covered by Task 4 tests (assert `ddl/<id>` content equals the stub).
**Dependencies:** Task 4.
**Files:** `src/apitypes/ddl/ddl.utils.ts`.
**Scope:** S

#### Task 6: Wire entities into BuildResult, strategy, and packaging

**Description:** Add `ddlEntities: DdlEntityIndex` to `BuildResult`; add `processDdlDocument`
(component analog of `processMcpDocument`) that merges a document's entities into
`BuildResult.ddlEntities` via `setReportingDuplicate` with a `createDuplicateDdlEntityHandler` — this
is where **cross-document** `ddlEntityId` collisions are detected (Error, breaks publish; mirrors
`createDuplicateMcpEntityHandler`, ignoring a same-`documentId` re-process). Branch DDL in
`BuildStrategy.execute` next to the MCP branch; serialize `ddl.json` (grouped: `{ tables: [...] }`,
payload stripped) + `ddl/<ddlEntityId>` files in `package.ts`. Per **C3 (resolved)**, do **not** add
`ddlEntityIds` to `PackageDocument` / `toPackageDocument` — the reverse link is
`ddl.json[*].documentId`, matching MCP. Per **D14**, incremental rebuild is out of scope, so there is
**no** need to track `document.ddlEntityIds` for granular drop.

**Acceptance criteria:**

- [x] **Done (2026-06-12):** `ddl.json` matches the spec shape (array fields by kind; index rows without `data`).
- [x] **Done (2026-06-12):** `ddl/<ddlEntityId>` files (no extension) contain the per-entity SQL.
- [x] **Done (2026-06-12):** A `ddlEntityId` collision **across documents** throws (Error, breaks publish); a same-document
      re-process does not (`createDuplicateDdlEntityHandler`).
- [x] **Done (2026-06-12):** `documents.json` is unchanged (no `ddlEntityIds`); reverse link is `ddl.json[*].documentId`.

**Verification:** `npm test -- ddl-build` (full zip layout: `ddl.json`, `ddl/` files, `documentId` back-link).
**Dependencies:** Tasks 4–5.
**Files:** `src/types/internal/builder.ts`, `src/components/ddl.ts` (new), `src/strategies/build.strategy.ts`,
`src/components/package.ts`.
**Scope:** M

#### Checkpoint B — after Tasks 4–6

- [x] **Done (2026-06-12):** `npm test -- ddl-build` green (4 cases); a multi-table `.sql` yields a
  ```
  correct `ddl.json` + `ddl/` set, each entity referencing the internal document
  (versionInternalDocumentId). Full suite green (61 suites, 1154 tests). Review with human before changelog work.
  ```

---

### Phase 3 — Changelog (parallel DDL path)

#### Task 7: Collect diffs per table from a paired Realm

**Description:** Implement `compareDdlDocuments: DdlDocumentsCompare` (the `ApiBuilder` hook — signature
in the Interface section) in `ddl.changes.ts`: given **one already-paired** `(prevRealm, currRealm)`
(pairing is the caller's job — Task 9 — so cross-file moves are resolved before this runs; a one-sided
pair gets an empty counterpart built here), call
`apiDiff(prevRealm, currRealm, { ...DDL_API_NORMALIZE_OPTIONS, metaKey, originsFlag, ... })`
(api-diff auto-dispatches `SPEC_TYPE_DDL_API_1`). Walk the merged Realm `schemas → tables` (the
DDL analog of REST walking `merged.paths`), aggregating each table's own diffs **plus** the diffs of
its related parts (columns, `indexes`, `primaryKey`, `foreignKeys`, table-scoped `objects`, table
`attrs` incl. triggers). Per **D2**, a change to a **shared schema-level type** (enum/domain/
composite/range) is fanned out to **every table that references it** (follow ddlapi's shared type
instance via referential equality); a type referenced by no table yields no entry. Return
a `DdlDiffResult` (`changesByEntityId: Map<DdlEntityId, Diff[]>` + `mergedRealm`); the merged Realm is
serialized later per **D5** (`normalizedResult:false` + before/after-normalized annotations, REST convention).

**Acceptance criteria:**

- [x] **Done (2026-06-12):** Diffs are attributed to the owning table's `ddlEntityId`, including index/FK/comment changes.
- [x] **Done (2026-06-12):** A shared-type change appears on all referencing tables; an unreferenced-type change yields nothing (D2).
- [x] **Done (2026-06-12):** Added / removed / changed tables are each represented; empty-diff tables are skipped.
- [x] **Done (2026-06-12):** Uses `aggregateDiffsWithRollup` consistently with REST (the rolled-up value is a `Set<Diff>`).

**Verification:** `npm test -- ddl-changelog` (unit: per-table attribution incl. related parts).
**Dependencies:** Task 3 (Realm building/normalize), Task 4 (`ddlEntityId`).
**Files:** `src/apitypes/ddl/ddl.changes.ts`, `src/apitypes/ddl/ddl.utils.ts`.
**Scope:** L — if it exceeds one session, split into 7a (apiDiff + merged-walk) and 7b
(related-part aggregation per table).

#### Task 8: Extract shared comparison core (types **and** helpers)

**Description:** Carve out the contract-agnostic comparison core so the DDL path composes it instead
of copy-pasting (AD2 types + AD7 helpers), all as **non-breaking** refactors of the operation path.

*Types (AD2):* refactor `OperationChanges`/`OperationType`/`VersionsComparison` to extend the
defined-once bases (`ChangesBase`, `ContractTypeBase`, `ComparisonBase`) **without renaming any
existing field**; add DDL variants `DdlChanges`/`DdlContractType`/`DdlComparison` + DTOs
`DdlChangesDto`/`DdlComparisonDto` + `DdlChangesMetadata`. Add `toDdlComparisonDto` to
`transformToDto.ts` reusing `toChangeMessage` / `replacePropertyInChangesSummary`.

*Helpers (AD7 bucket 2):* extract `pairByKey<T>(previous, current, keyOf)` out of
`createPairOperationsMap` (which becomes a thin wrapper); extract `createChangeBase(diffs,
comparisonInternalDocumentId)` that `createOperationChange` (and later `createDdlChange`) build on;
widen `createComparisonDocument` / `serializeDocument`'s `ApiDocument` to accept `Realm`. Optionally
hoist version-resolve + builder-version validation into `compareVersions` (AD7 bucket 2.4) **only** if
it stays a clean change to the operation path. (Bucket-1 helpers need no change — DDL imports them.)

**Acceptance criteria:**

- [x] **Done (2026-06-12):** Operation comparison types **and** the extracted helpers leave REST/async/graphql/MCP output
      **byte-identical** (regression suites green: `changes`, `graphql-changes`, `asyncapi-changes`, `compare.utils`, `mcp-build`, risky/declarative).
- [x] **Done (2026-06-12):** `createPairOperationsMap` is re-expressed via `pairByKey`; `createOperationChange` via `createChangeBase`.
- [x] **Done (2026-06-12):** DDL variant types compile with the AD2 field names (`contractType`, `ddlEntityId`,
      `numberOfImpactedEntities`, `contractTypes`, metadata `{ kind, name, schemaName, description }`); DTOs + `toDdlComparisonDto`/`toDdlChangesDto`/`convertDtoFieldContractTypes` added.
- [x] **Done (2026-06-12):** `createComparisonDocument`/`serializeDocument` accept a `Realm` (the `ApiDocument` widening landed in Task 3) without a DDL-specific serializer.

**Verification:** `npm run build`; `npm test -- changes asyncapi-changes graphql-changes compare.utils comparison-internal-documents` (regression for both the type and helper extractions).
**Dependencies:** Task 1.
**Files:** `src/types/internal/compare.ts`, `src/types/external/comparison.ts`,
`src/types/package/comparisons.ts`, `src/types/package/ddl.ts`, `src/utils/transformToDto.ts`,
`src/components/compare/compare.utils.ts`, `src/utils/document.ts` (widen `ApiDocument`).
**Scope:** M → L (split into 8a *types* / 8b *helpers* if it exceeds one session).

#### Task 9: `compareVersionsDdl` orchestration

**Description:** New comparison step: resolve each version's DDL documents
(`versionDocumentsResolver(version, pkg, DDL_CONTRACT_TYPE)`) and their raw SQL
(`rawDocumentResolver`), `buildFromDdl` each. Build a `ddlEntityId → (sourceFile, table)` map per
version and, **before any `apiDiff` call**, pair by `ddlEntityId` (file-independent) to resolve
**cross-file table moves** using the extracted `pairByKey` (`keyOf = e => e.ddlEntityId`, AD7) and
derive the document/realm pairs via the reused `dedupeTuples` / `removeRedundantPartialPairs`.
Then run Task 7 per pair and emit `DdlChanges` via `createChangeBase` + DDL id/metadata (AD7)
(`ddlEntityId`,
`metadata` = `DdlChangesMetadata` `{ kind, name, schemaName, description }`, `changeSummary`,
`impactedSummary`, `comparisonInternalDocumentId`) collected into a `DdlComparison`
(`contractsChangesSummary: { ddl: { changesSummary, numberOfImpactedEntities } }`). Build
`comparisonInternalDocumentId` via
`createComparisonInternalDocumentId(prevVer, prevPkg, prevSlug, currVer, currPkg, currSlug)` and wrap
the merged Realm as a `ComparisonInternalDocument` (D5 form). (No DDL compatibility-scope / `mode` is
passed into `apiDiff` — D4 reverted: DDL changes are classified with default severity.) Apply diff
**dedup** (`removeObjectDuplicates` +
`calculateDiffId`) and compute `changesSummary`/`numberOfImpactedEntities` mirroring
`compareCurrentApiType` (per-contract only — D12). Compose the **shared core** (AD7) —
`pairByKey`, `dedupeTuples`/`removeRedundantPartialPairs`, `createChangeBase`, the `createComparison*`
id helpers, `removeObjectDuplicates`+`calculateDiffId`, `calculateChangeSummary`/
`calculateImpactedSummary` — rather than reimplementing it.

**Acceptance criteria:**

- [x] **Done (2026-06-12):** Added/removed/changed tables produce correct `DdlChanges` keyed by `ddlEntityId`.
- [x] **Done (2026-06-12):** Reuses the AD7 shared helpers (`pairByKey`, `dedupeTuples`/`removeRedundantPartialPairs`, `createChangeBase`, `createComparison*`, `removeObjectDuplicates`+`calculateDiffId`, summaries).
- [x] **Done (2026-06-12):** Pairing by `ddlEntityId` happens **before** `apiDiff`; a table moved between `.sql` files
  ```
  across versions is a change, not remove+add (covered by per-entity `belongsToPair` attribution).
  ```
- [x] **Done (2026-06-12):** `metadata`/`previousMetadata` carry the full descriptor (`kind`, `name`, `schemaName`, `description`) via `collectTableDescriptors`.
- [x] **Done (2026-06-12):** Version summary dedup matches REST semantics (no double-counting across document pairs).
- [x] **Done (2026-06-12):** One merged comparison-internal document per document pair, referenced back by each change.

**Verification:** `npm test -- ddl-changelog` (added/removed/changed, cross-file move, dedup, internal docs).
**Dependencies:** Tasks 7, 8.
**Files:** `src/components/compare/compare.ddl.ts` (new), `src/components/compare/index.ts`,
`src/apitypes/ddl/ddl.changes.ts`.
**Scope:** L

#### Task 10: Integrate DDL comparison into `compareVersions` + packaging

**Description:** Call `compareVersionsDdl` from `compareVersions` alongside
`compareVersionsOperations`; collect DDL comparisons into a `ddlComparisons: DdlComparison[]`
field on `BuildResult` (separate from `comparisons`). Ensure both `BuildStrategy` (when
`previousVersion` is set) and `ChangelogStrategy` surface them. Serialize via `toDdlComparisonDto`
into the **sibling** files `ddl-comparisons.json` (index) + `ddl-comparisons/<comparisonFileId>`
(per-pair change data) — operation `comparisons.json`/`comparisons/` untouched. The merged Realm
comparison-internal documents go into the **shared** `comparison-internal-documents` index/dir.

**Acceptance criteria:**

- [x] **Done (2026-06-12):** `build` with a `previousVersion` and `changelog` both emit DDL comparisons into the sibling files (wired in both strategies).
- [x] **Done (2026-06-12):** DDL change entries reference their `comparisonInternalDocumentId` in the shared internal-docs set.
- [x] **Done (2026-06-12):** REST/async/graphql/MCP comparison output (`comparisons.json`/`comparisons/`) is byte-unchanged (full regression green).

**Verification:** `npm test -- ddl-changelog changes compare.utils comparison-internal-documents`.
**Dependencies:** Task 9.
**Files:** `src/components/compare/compare.ts`, `src/types/internal/builder.ts`,
`src/types/package/ddl.ts` (DDL package-comparison index/data types), `src/strategies/changelog.strategy.ts`,
`src/strategies/build.strategy.ts`, `src/components/package.ts`.
**Scope:** M

#### Task 11: Dashboard / references DDL support

**Description:** Dashboards are ref-composed packages; their changelog flows through
`compareVersionsReferences` (`compare.ts`), which produces one comparison per ref — from the cached
`versionComparisonResolver` result or, on miss, a fresh `compareVersionsOperations`. Wire DDL into
that path so a dashboard whose refs contain DDL content aggregates DDL changes: per ref pair, also run
`compareVersionsDdl` (on miss) and surface the ref's cached `DdlComparison` (on hit). Confirm the
cached ref comparison carries DDL data (the ref package's own build wrote `ddl-comparisons.json`), and
that `versionComparisonResolver` exposes it. A dashboard `build` aggregates referenced DDL entities/
comparisons the same way it does operations.

**Acceptance criteria:**

- [x] **Done (2026-06-12):** A dashboard `changelog` over refs containing DDL produces DDL comparisons per ref on the
  ```
  cache-**miss** path (fresh `compareVersionsDdl` in `compareVersionsReferences`); cache-hit relies on host invalidation (D15).
  ```
- [x] **Done (2026-06-12):** A dashboard `build` with DDL-bearing refs surfaces their DDL content/comparisons — each
      ref package's own build writes its `ddl.json`/`ddl-comparisons.json` (Tasks 6/10); the dashboard does not
      re-aggregate ref entities into its own `ddl.json` (matching how it does not re-emit ref `operations.json`).
- [x] **Done (2026-06-12):** Resolvers are not called for empty versions (existing resolver-guard test still passes; `compareVersionsDdl` guards `null` params).
- [x] **Done (2026-06-12):** Pure-REST dashboards are unaffected (existing dashboard tests green).

**Verification:** `npm test -- dashboards ddl-changelog`.
**Dependencies:** Task 10.
**Files:** `src/components/compare/compare.ts`, `src/types/external/comparison.ts` (if the ref
comparison cache shape needs a DDL field), `src/components/package.ts`.
**Scope:** M

#### Checkpoint C — after Tasks 7–11

- [x] **Done (2026-06-12):** `ddl-changelog` + `dashboards` green; two-version scenario (add/remove/change)
  ```
  and a DDL-bearing dashboard produce correct comparisons + shared internal documents. Full suite green
  (62 suites, 1164 tests). NOTE: a dedicated cross-file-move end-to-end fixture is deferred to Task 15
  (the mechanism — pairByKey + belongsToPair — is implemented and unit-reasoned, not yet e2e-tested).
  ```

---

### Phase 4 — Validation, registration & polish

#### Task 12: Validation wiring

**Description:** Map `buildFromDdl` outcomes to notification severity / publish behavior, emitting the
existing `NotificationMessage` shape (`severity`, `message`, `fileId`): `DdlParseError` → break
publish; `duplicate-object` / post-slugify id collision → **Error** (break, like MCP duplicate id);
`out-of-scope-statement` → **Warning, one per statement** (D7); `unresolved-reference` /
`unresolved-like-source` → **Warning** (build what was parsed). Dialect is validated by the parser —
api-processor does **not** re-validate it. No `metadata.dialect`/`metadata.ddlSchema`. Machine-readable
notification codes are **deferred** (see Deferred below) — for v1 the code lives only in `message` text.

**Acceptance criteria:**

- [x] **Done (2026-06-13):** Severity / break mapping matches the spec; warnings don't abort, parse errors / duplicates do (`ddl.validation.ts`).
- [x] **Done (2026-06-13):** `out-of-scope-statement` emits one Warning per statement (D7); notifications carry `fileId`.
- [x] **Done (2026-06-13):** `NotificationMessage` is unchanged (no new fields).

**Verification:** `npm test -- ddl-validation` (each issue kind → expected severity / outcome).
**Dependencies:** Tasks 2, 6.
**Files:** `src/apitypes/ddl/ddl.validation.ts`, `src/apitypes/ddl/ddl.parser.ts`, `src/strategies/build.strategy.ts`.
**Scope:** M

#### Task 13: Register `ddlBuilder` and export the module

**Description:** Assemble `ddlBuilder: ApiBuilder<ParsedDdlData>` in `src/apitypes/ddl/index.ts`
(`apiType: DDL_CONTRACT_TYPE`, `types: ['ddl']`, parser, buildDocument, dumpDocument, buildDdlEntities,
DDL compare hook), export from `src/apitypes/index.ts`, and push it into `apiBuilders` in
`builder.ts`. Per **D13**, omit `createExportDocument` — DDL export is out of scope for v1.

**Acceptance criteria:**

- [x] **Done (2026-06-12):** `ddlBuilder` registered (pulled forward to Task 6); `.sql`/`.ddl` files route to it end-to-end; `compareDdlDocuments` attached in Task 7; no `createExportDocument` (D13).

**Verification:** `npm test -- ddl-build ddl-changelog` (end-to-end through the real registry).
**Dependencies:** Tasks 3, 6, 9.
**Files:** `src/apitypes/ddl/index.ts`, `src/apitypes/index.ts`, `src/builder.ts`.
**Scope:** S

#### Task 14: Mixed-content (REST + DDL) support & tests

**Description:** Verify and lock in that a **single package/version can hold both** REST/async/graphql
and DDL content. The `BuildStrategy` per-file builder branch and the dual comparison steps
(`compareVersionsOperations` + `compareVersionsDdl`) already coexist by design; this task proves it
end-to-end and fixes any cross-talk. A mixed build must emit `operations.json` **and** `ddl.json`; a
mixed changelog must emit `comparisons.json` **and** `ddl-comparisons.json`, with version summaries
counting each contract type independently.

**Acceptance criteria:**

- [x] **Done (2026-06-13):** A package with `.yaml` + `.sql` files builds both `operations.json`/`operations/` and
  ```
  `ddl.json`/`ddl/` with no interference.
  ```
- [x] **Done (2026-06-13):** A mixed changelog emits both operation and DDL comparison artifacts; summaries are independent.
- [x] **Done (2026-06-13):** Removing all DDL files (or all REST files) from one version is handled cleanly in changelog.

**Verification:** `npm test -- ddl-mixed` (new mixed-content suite).
**Dependencies:** Tasks 6, 10.
**Files:** `src/strategies/build.strategy.ts`, `src/components/compare/compare.ts`,
`test/ddl-mixed.test.ts`, `test/projects/ddl-mixed/`**.
**Scope:** M

#### Task 15: Test fixtures + documentation

**Description:** Round out the fixtures and suites per the **[Test Plan](#test-plan)** (authoritative
list of suites, fixtures, and decision coverage): fixtures under `test/projects/ddl-build`,
`ddl-changelog`, `ddl-mixed`, and `ddl-dashboard`, plus the
`ddl-unit`/`ddl-build`/`ddl-changelog`/`ddl-validation`/`ddl-mixed` test files and the
`dashboards.test.ts` DDL cases. Document the DDL contract type in the README/relevant docs.

**Acceptance criteria:**

- [x] **Done (2026-06-13):** Coverage spans schema defaulting, comments, indexes, duplicates, out-of-scope statements,
  ```
  unresolved refs, added/removed/changed tables, cross-file move, rename, shared-type fan-out, mixed REST+DDL, and a DDL dashboard.
  ```
- [x] **Done (2026-06-13):** Tests assert the full layout (`ddl.json`, `ddl/`, `ddl-comparisons.json`,
  ```
  `ddl-comparisons/`, shared comparison-internal docs) and dashboard aggregation. README documents the DDL contract type.
  ```

**Verification:** `npm test` (whole suite green, incl. `test:disk`).
**Dependencies:** Tasks 1–14.
**Files:** `test/ddl-*.test.ts`, `test/projects/ddl-build/`**, `test/projects/ddl-changelog/**`,
`test/projects/ddl-mixed/**`, `test/projects/ddl-dashboard/**`, `README.md`.
**Scope:** M

#### Checkpoint Complete

- [x] **Done (2026-06-13):** All acceptance criteria met; full `npm test` green (64 suites, 1175 tests;
  ```
  +disk-mode for DDL suites) and `tsc`/`npm run build` clean; plan + deviations recorded. Ready for review/PR.
  Pre-merge follow-ups: pin the `feature-ddl` prerelease deps to released versions (Risk R1); confirm C2
  (per-pair wrapper key `entities`) with the backend consumer.
  ```

---

## Test Plan

**Approach.** Tests land **with** their implementation task (the per-task *Verification* lines), not
deferred to the end; Task 15 only adds the cross-cutting suites (mixed, dashboard), rounds out
fixtures, and writes docs. Tests follow the existing conventions: `test/<suite>.test.ts` driving a
build through the `Editor` / `LocalRegistry` helpers, fixtures under `test/projects/<package>/`, and
assertions on **both** the in-memory `BuildResult` (e.g. `result.ddlEntities`, `result.comparisons`)
**and** the serialized package files (`loadFileAsStringFromRegistry` / zip entries). Every suite runs
under both FS modes (`npm test` and `npm run test:disk`).

### Suites


| Suite (file)                  | Build type                      | Tasks    | What it asserts                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Decisions exercised     |
| ----------------------------- | ------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| `ddl-unit.test.ts`            | — (parser units)                | 2        | `.sql`/`.ddl` detected, others → `undefined`; `buildFromDdl` → `{ realm, originalSql }`; `DdlParseError` rejects; non-fatal `onError` issues collected onto `file.errors`.                                                                                                                                                                                                                                                                                                                                                                                                          | D6                      |
| `ddl-build.test.ts`           | `build`                         | 3–6      | `documents.json` entry (`type:'ddl'`, `format:'sql'`, `operationIds:[]`, **no** `ddlEntityIds`); `documents/<slug>.sql` verbatim; `version-internal-documents` present (normalize→denormalize→serialize); `ddl.json` = `{ tables:[…] }` index rows **without** `data`; `ddl/<id>` = per-table SQL (no ext); id = `{schemaName}-table-{name}`; schema defaults to `public`; `description` from `COMMENT ON`; `search` block; `versionInternalDocumentId` link; `apiKind` from metadata.                                                                                              | D9, D10, D11            |
| `ddl-changelog.test.ts`       | `changelog` + `build`-with-prev | 7, 9, 10 | added/removed/changed tables → `DdlChanges` keyed by `ddlEntityId`; pairing by `ddlEntityId` happens **before** `apiDiff`; cross-file move = change (not remove+add); rename = remove+add; shared-type change fans out to all referencing tables, orphan-type change yields nothing; `ddl-comparisons.json` (`contractTypes`, `numberOfImpactedEntities`) + `ddl-comparisons/<id>` (`{ entities:[…] }`); shared `comparison-internal-documents` in REST merged form; metadata `{ kind, name, schemaName, description }`; per-contract dedup; bwc relaxation; ddlapi-skew tolerated. | D1, D2, D3, D4, D5, D12 |
| `ddl-validation.test.ts`      | `build`                         | 12       | severity mapping: `DdlParseError` → publish breaks; `duplicate-object` → **Error** (breaks); `out-of-scope-statement` → **Warning, one per statement**; `unresolved-reference`/`unresolved-like-source` → **Warning**, entity still built, no `incomplete` flag; slugify collision → duplicate Error.                                                                                                                                                                                                                                                                               | D7, D8, D10             |
| `ddl-mixed.test.ts`           | `build` + `changelog`           | 14       | a package with `.yaml` + `.sql` emits `operations.json` **and** `ddl.json` on build, `comparisons.json` **and** `ddl-comparisons.json` on changelog; summaries independent; REST artifacts byte-unchanged; dropping all DDL (or all REST) from one version handled.                                                                                                                                                                                                                                                                                                                 | D12                     |
| `dashboards.test.ts` (extend) | `build` + `changelog`           | 11       | a DDL-bearing dashboard aggregates DDL per ref on the cache-**miss** path; existing resolver-guard test still holds; pure-REST dashboards unaffected.                                                                                                                                                                                                                                                                                                                                                                                                                               | D15                     |


Regression guard (Task 8 — shared base **types and** extracted **helpers**, AD2 + AD7): existing
`changes` / `asyncapi-changes` / `graphql-changes` / `mcp-build` / `compare.utils` /
`comparison-internal-documents` suites must stay green and produce byte-identical output for non-DDL
content (REST now calls `pairByKey` / `createChangeBase` / the widened `createComparisonDocument`).

### Fixtures (`test/projects/`)

- `**ddl-build/`** — `shop.sql` (multiple tables; qualified + unqualified schema; indexes, FKs,
`COMMENT ON`; an enum/domain used by a table), `out-of-scope.sql` (ALTER/DROP/VIEW),
`duplicate.sql` (two tables that collide after slugify), `invalid.sql` (bad syntax),
`unresolved-fk.sql`.
- `**ddl-changelog/**` — `v1` and `v2` schemas covering: add table, remove table, column type/null/
default change, add/drop index, add/drop FK, `COMMENT ON` change, **cross-file move** (a table
relocated to a different `.sql`), **shared enum** change (used by ≥2 tables), **orphan enum**
change (used by none), and a table **rename**.
- `**ddl-mixed/`** — one package with a REST `.yaml` + a DDL `.sql`, across two versions.
- `**ddl-dashboard/**` — a dashboard package referencing two DDL-bearing packages.

### Coverage by checkpoint

- **Checkpoint A** → `ddl-unit`, `ddl-build` (parse + document slices).
- **Checkpoint B** → `ddl-build` (entities / `ddl.json` / `ddl/`).
- **Checkpoint C** → `ddl-changelog`, `dashboards`.
- **Checkpoint Complete** → `ddl-validation`, `ddl-mixed`, full `npm test` + `test:disk`.

---

## Risks and Mitigations


| Risk                                                                                                                                                                                                       | Impact | Mitigation                                                                                                                                                                                                                                                                                                                     |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **R1** ~~api-processor consumes published `api-unifier@2.8.0`/`api-diff@3.3.0` lacking DDL support.~~ **RESOLVED 2026-06-12** — installed `ddlapi@0.1.0-feature-ddl`, `api-diff@3.3.1-feature-ddl`, `api-unifier@2.8.1-feature-ddl`, all carrying the DDL builds (`buildFromDdl`, `compareDdlApi`/`SPEC_TYPE_DDL_API_1`, `DDL_API_NORMALIZE_OPTIONS`).                                | Low    | **Residual:** these are `feature-ddl` **prerelease** versions pinned via a `feature-ddl` tag — pin to proper released versions before merging to `develop`.                                                                                                   |
| **R2** `apiDiff` expects `Realm` objects (it routes on the `ddlapi` field), unlike REST's JSON docs — DDL changelog cannot reuse `rest.changes.ts`.                                                        | Med    | Parallel path (AD1): build Realms from raw `.sql` inside `compareVersionsDdl`/`ddl.changes.ts`.                                                                                                                                                                                                                                |
| **R3** Host `versionDocumentsResolver`/`rawDocumentResolver` must recognize the `'ddl'` apiType ↔ `'ddl'` document type.                                                                                   | Med    | Confirm host mapping (OQ1); document the integration requirement; fail loudly if no DDL docs resolve.                                                                                                                                                                                                                          |
| **R4** `extractTableStatements` is a stub — `ddl/<id>` content is not real SQL yet.                                                                                                                        | Low    | Explicit `TODO`; isolate behind one helper so the real ddlapi implementation is a drop-in.                                                                                                                                                                                                                                     |
| **R5** Rebuilding Realms per comparison (no cached normalized Realm resolver) may be costly for large schemas.                                                                                             | Med    | Reuse `normalizedSpecFragmentsHashCache`; consider caching `buildFromDdl` per (version, slug) within a comparison run.                                                                                                                                                                                                         |
| **R6** Serializing the normalized Realm (symbols/origins from the unifier) could corrupt internal/comparison documents.                                                                                    | Med    | Reuse REST's `serializeDocument` + `SERIALIZE_SYMBOL_STRING_MAPPING`; assert serialization round-trip in tests.                                                                                                                                                                                                                |
| **R7** Dashboard changelog reuses cached ref comparisons via `versionComparisonResolver`; a cached ref comparison must surface its `DdlComparison`, or dashboard DDL changes silently vanish on cache hit. | Med    | **D15:** rely on host cache invalidation (the backend rebuilds ref comparisons when DDL support lands); api-processor does **not** recompute on a hit lacking DDL. Document the host requirement; cover the cache-**miss** path in the dashboard test (Task 11). Accept under-reporting over stale ref caches until refreshed. |


## Resolved Questions (2026-06-12)

- **OQ1 — resolved: yes.** The host's `versionDocumentsResolver` returns DDL documents for
`apiType: 'ddl'` and `rawDocumentResolver` serves the raw `.sql`. No new host resolver needed.
- **OQ2 — resolved: dedicated DTO.** DDL gets its own comparison DTO (`DdlComparisonDto` /
`DdlChangesDto`) with consistently renamed fields, over a defined-once shared base. See **AD2**.
- **OQ3 — resolved: raw Realm.** `buildDdlEntities` walks the **raw** `Realm` from `buildFromDdl`
(ddlapi reports it does not matter for id/description purposes). Revisit only if a discrepancy
with the normalized internal document surfaces.
- **OQ4 — resolved: tables only.** v1 ships `table` only; `ddl.json` has a single `tables` array
(adding `views` later is additive/back-compatible). `DDL_KIND` has only `TABLE`.
- **OQ5 — resolved: out of scope.** No DDL deprecation handling in v1; skip the
`calculateHistoryForDeprecatedItems` analog.
- **OQ6 — resolved: separate file.** DDL comparisons get their own `ddl-comparisons.json` +
`ddl-comparisons/<comparisonFileId>`; operation `comparisons.json`/`comparisons/` is left
untouched. Comparison-internal documents remain shared. See **AD2** / Task 10.

## Open Questions

None outstanding.

## Deferred

- **Machine-readable notification codes.** A review raised making DDL boundary errors machine-readable
via stable codes, which would require adding optional `code`/`details` fields to the shared
`NotificationMessage`. **Decided not to do this now** — `NotificationMessage` is left unchanged and
DDL notifications use only `severity` + `message` + `fileId` (the code, if any, lives in `message`
text). Revisit if a consumer needs to branch on codes without parsing message strings.

## Implementation Deviations

> Tracks where the implementation departed from the plan as written. One entry per deviation.

- **DDL documents resolved via a new `contractType` query param (not `apiType: 'ddl'`).** The host's
  "get version documents" endpoint gains a `contractType` query parameter; `VersionDocumentsResolver`
  (external type) and the builder's wrapper now take an optional `contractType?: ContractType` (new type
  in `consts.ts`, `= 'ddl'` for now), and `compareVersionsDdl` calls
  `versionDocumentsResolver(version, pkg, undefined, DDL_CONTRACT_TYPE)` — removing the earlier
  `apiType: 'ddl' as never` hack (this resolves Risk R3 / the OQ1 mapping more cleanly). The empty-result
  warning is suppressed for any `contractType` query (additive contracts), not just by inspecting apiType.
  The client-side `type === 'ddl'` post-filter is **kept as a precaution** (with a TODO) in case the
  backend hasn't shipped the server-side filter yet; the test registry simulates the implemented backend
  by honoring the param.

- **Post-impl contract change — per-pair `DdlChangesDto` drops `contractType` and groups each side into
  `ddlEntityData`/`previousDdlEntityData`.** By request, the `ddl-comparisons/<comparisonFileId>` change
  entry no longer carries `"contractType": "ddl"` (redundant — the whole file is DDL). Each side is a
  self-contained object — `ddlEntityData` (current) / `previousDdlEntityData` (previous) — carrying that
  side's `ddlEntityId`, optional `apiKind`, and descriptor (`kind`/`name`/`schemaName`/`description`).
  `ddlEntityData` is omitted for a pure remove, `previousDdlEntityData` for a pure add. Top-level the entry
  keeps `changeSummary`, `comparisonInternalDocumentId`, and `changes`. This supersedes both the original
  AD2 grouped-`metadata` shape and the interim flattened shape. Internally, `DdlChanges` is unchanged (flat
  `ddlEntityId`/`apiKind`/`metadata` + `previous*`); `toDdlChangesDto` does the regrouping, and the new
  `DdlEntityChangeData` type (`= DdlEntityDescriptor + ddlEntityId + apiKind?`) describes a side. The
  summary-level `DdlContractType.contractType` in `ddl-comparisons.json` is unaffected.

- **Task 1/2 — `FILE_FORMAT_SQL`/`FILE_FORMAT_DDL` ARE added to the `FILE_FORMAT` map (required, not
  optional).** Initially (Task 1) they were defined as standalone consts only, to avoid the `unknown`
  parser's format-fallback claiming `.sql`. Task 2 review found this is **mandatory**: `Builder.parseFile`
  ([builder.ts:714](../../src/builder.ts)) only dispatches a file to *any* parser when its extension is
  in `SUPPORTED_FILE_FORMATS` (= `Object.values(FILE_FORMAT)`), and `VersionDocument.format`'s type
  `FileFormat = FILE_FORMAT[keyof typeof FILE_FORMAT]` is derived from the same map. So `'sql'`/`'ddl'`
  **must** be in `FILE_FORMAT` for `.sql` files to be parsed at all and for `format: 'sql'` to typecheck.
  The unknown-parser concern is moot: the DDL builder is registered before `unknownApiBuilder` (Task 13),
  so it claims `.sql`/`.ddl` first.

- **Task 3 — `ApiDocument` widened to include `Realm` (pulled forward from Task 8).** Task 8 lists
  widening `serializeDocument`/`createComparisonDocument`'s `ApiDocument` to accept `Realm`. Task 3
  reuses `createSerializedInternalDocument` (which takes `ApiDocument`) to serialize the
  normalize→denormalize Realm into the version-internal document, so the `ApiDocument` union in
  `src/types/internal/operation.ts` was widened to include `Realm` now. Task 8's remaining widening
  (`createComparisonDocument`) is unaffected.

- **Task 3 — DDL normalize options use `originsFlag` only (no `hashFlag`/`syntheticTitleFlag`).** The
  plan's AC mentioned mirroring REST's symbol flags; in review the user confirmed `hashFlag` and
  `syntheticTitleFlag` are JSON-Schema concerns the unifier's DDL rules don't consult, so
  `DDL_EFFECTIVE_NORMALIZE_OPTIONS` spreads `DDL_API_NORMALIZE_OPTIONS` + `originsFlag` only.

- **Task 6 — `ddlBuilder` registration pulled forward from Task 13.** Checkpoint B requires an
  end-to-end `.sql` → `ddl.json` build, which can't run unless `ddlBuilder` is registered and routes
  `.sql`. So a **build-capable** `ddlBuilder` (parser + document + `buildDdlEntities`, no compare hook,
  no export per D13) is assembled in `src/apitypes/ddl/index.ts`, exported from `src/apitypes/index.ts`,
  and pushed into `apiBuilders` (before `textApiBuilder`/`unknownApiBuilder`) in `builder.ts` now.
  Task 13 is reduced to **adding `compareDdlDocuments`** to this already-registered builder (once Task 9
  exists) and confirming the export omission.

- **Task 6 — test registry helpers needed a `saveDdlEntities`.** The test `LocalRegistry`/`ApihubClient`
  `publishPackage` is a hand-rolled serializer (not the production `package.ts`) and had no DDL branch,
  so a `.sql` build published no `ddl.json`. Added `saveDdlEntities` to `test/helpers/registry/utils.ts`
  and wired it into both registries' `publishPackage`, mirroring `saveMcpEntities`.

- **Task 7 — D2 shared-type fan-out is automatic; no manual referential-equality walk.** Empirically
  verified that api-diff's `aggregateDiffsWithRollup` already rolls a shared schema-level type change
  (enum/domain) onto the `DIFFS_AGGREGATED_META_KEY` **Set** of *every* table whose column references it
  (via the column→type reference the unifier preserves). An orphan type (referenced by no table) never
  reaches a table node, so it yields no entry for free. The plan's "follow ddlapi's shared type instance
  via referential equality" is satisfied by the rollup — `compareDdlDocuments` just reads each table's
  aggregated Set. (The rolled-up value is a `Set<Diff>`, not the `Diff[]` the `WithAggregatedDiffs` type
  suggests; spread handles both.)

- **Task 7 — added/removed whole tables: diff is on the parent `tables[]` array meta, not the table
  node.** A changed table's diffs live in its own aggregated Set; an added/removed table's single diff is
  at `tables[DIFF_META_KEY][index]`. `compareDdlDocuments` combines both. The empty counterpart for a
  one-sided pair mirrors the present Realm's **schemas with empty `tables`** (analog of REST's
  `createCopyWithEmptyPathItems`) so each table is a clean per-table add/remove rather than one
  whole-schema diff.

- **Task 7 — DDL bwc scope (`createDdlApiCompatibilityScopeFunction`) — REMOVED.** Originally a root-only
  scope marked the realm NOT_BACKWARD_COMPATIBLE for a `no-bwc`/`experimental` document, softening
  `breaking → risky`. D4 was later reverted: the scope function and its `apiDiff` wiring were removed, so
  DDL changes are now classified with default severity regardless of apiKind.

- **Task 7 — `compareDdlDocuments` wired onto `ddlBuilder` now** (the builder was already registered in
  Task 6). Task 9 consumes it via the registry rather than adding it.

- **Task 12 — parser issues moved off `TextFile.errors` onto `ParsedDdlData.issues`.** The generic
  `Builder.parseFile` loop turns any `TextFile.errors` into **Error**-severity "Invalid … file"
  notifications — wrong for DDL, where out-of-scope/unresolved must be Warnings and duplicate-object must
  break. So `parseDdlFile` now carries the non-fatal issues on `ParsedDdlData.issues` (not `file.errors`),
  bypassing the generic path, and `validateDdlDocument` (`ddl.validation.ts`, called from the BuildStrategy
  DDL branch) maps each issue to its severity (one Warning per statement — D7) and throws on
  `duplicate-object` to break the publish. `NotificationMessage` is unchanged (machine-readable codes
  stay deferred). The `ddl-unit` parser test was updated to assert `data.issues` instead of `file.errors`.

- **Task 9 — cross-file-move dedupe via per-entity `belongsToPair`, not an in-hook operations-map.**
  REST suppresses move-induced remove+add by passing the global `operationsMap` into `compareDocuments`,
  which checks `potentiallyChanged` per operation. The DDL `compareDdlDocuments` hook (Task 7) has no such
  map — it attributes every table in the merged Realm. `compareVersionsDdl` instead keeps REST's doc
  pairing (`dedupeTuples`/`removeRedundantPartialPairs`, so the common case is one `apiDiff`) and then
  attributes each `ddlEntityId` only to its "home" doc pair via `belongsToPair` (both-sides → exact pair;
  one-side add/remove → the surviving pair carrying its defined side). Same correctness, hook stays simple.

- **Task 9 — "No documents … (apiType=ddl)" warning suppressed.** The builder's `versionDocumentsResolver`
  wrapper warns on an empty result; REST never hits it because it only resolves apiTypes present in the
  version. `compareVersionsDdl` resolves DDL speculatively, so the wrapper now skips the warning for the
  DDL apiType (DDL is additive — AD6 — so absence is normal). `src/builder.ts`.

- **Task 9/10 — `compareVersionsDdl` processes only the package's OWN docs (skips `packageRef` docs).**
  The test registry returns ref documents unfiltered for a dashboard (no own docs); resolving their raw
  SQL at the dashboard package id fails. The root DDL step filters `!packageRef && type==='ddl'`; ref DDL
  is Task 11's job.

- **Task 10 — DDL comparisons serialized from the DTO types directly; no new package-comparison types.**
  The plan lists "DDL package-comparison index/data types" in `package/ddl.ts`. `DdlComparisonDto` /
  `DdlChangesDto` already describe the exact serialized shapes, so `package.ts` (and the test registry's
  new `saveDdlComparisons`) write from those — `ddl-comparisons.json` (index, `data` stripped) +
  `ddl-comparisons/<id>` with the `entities` wrapper (C2). The shared comparison-internal-documents block
  was lifted out of the operation-only `if` so a pure-DDL changelog still writes merged Realms. The test
  registry also gained a `'ddl'` case in `getDocApiTypeGuard`.

- **Task 8 — AD2 base-interface extraction skipped; DDL types defined standalone.** The plan's AD2 wants
  `ComparisonBase`/`ContractTypeBase`/`ChangesBase` defined once with the operation types refactored to
  extend them. That refactor crosses the internal/external type-layer boundary (`OperationType` lives in
  `types/external`, the bases would live in `types/internal`) and is purely cosmetic — it changes no
  runtime output. To minimize regression risk on the shared REST/async/graphql surface, the DDL
  comparison types (`DdlChanges`/`DdlContractType`/`DdlComparison` + DTOs in `types/internal/compare.ts`)
  are defined **standalone**, duplicating the handful of genuinely-shared envelope fields rather than
  extending shared bases. The operation types are left byte-identical (trivially preserving REST output).
  The substantive AD7 **helper** reuse (`pairByKey`, `createChangeBase`) was done as specified, since
  that's the actual copy-paste avoidance Task 9 depends on. If the base interfaces are wanted later, they
  can be introduced as a follow-up without touching behavior.

- **Task 4 — D10's `Users`/`users` collision example is inaccurate for this codebase.** `slugify` with
  `SLUG_OPTIONS_OPERATION_ID` **preserves case**, so `users` → `public-table-users` and `"Users"` →
  `public-table-Users` do **not** collide. Post-slugify collisions still occur via character mapping
  (e.g. `"user name"` and `"user-name"` both → `public-table-user-name`); the duplicate test uses that
  instead. Detection logic is unchanged — only the illustrative example in D10 is off.

