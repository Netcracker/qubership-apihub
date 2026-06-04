# `buildFromDdl` Implementation Plan

## Goal

Two changes to `@netcracker/qubership-apihub-ddlapi`:

1. **Minor**: add a `ddlapi` version field to `Realm` — a marker property that identifies objects
   of this type and records the specification format version.

2. **Major**: add `buildFromDdl(ddl, options?)` — an entry point that accepts a PostgreSQL DDL
   string and returns a `Realm` populated from `CREATE` statements. Out-of-scope and unsupported
   content is reported via an `onError` callback. Source ranges can optionally be attached to
   schema entities via a well-known Symbol.

The package is in alpha and has not been released. Breaking changes to existing interfaces are
acceptable without a version bump.

---

## 1. Minor Change: `Realm.ddlapi` Version Field

Add a `ddlapi` property to `Realm`. It carries the specification format version as a semver string
and acts as a discriminator / type marker.

```typescript
export interface Realm {
  readonly ddlapi: string          // "1.0.0"
  readonly schemas: readonly Schema[]
  readonly attrs?: readonly Attr[]
  readonly objects?: readonly SchemaObject[]
}
```

`newRealm` defaults this field to `'1.0.0'`.

---

## 2. Model Changes (Phase A Prerequisite)

These changes to existing source files are prerequisites for `buildFromDdl` and ship alongside it.

### 2.1 `Pos` Attr — Removed from Operational Model

`Pos` and `PosPoint` are removed from the `Attr` discriminated union and from `AttrKind`.
The `filePos` factory is removed from `factories.ts`.

The `Pos` and `PosPoint` interface definitions are **kept in `src/attrs.ts`** with a prominent
comment block:

```typescript
/**
 * Pos and PosPoint are the Atlas Go equivalents for HCL source tracking.
 *
 * DELIBERATE DESIGN DECISION: ddlapi does NOT include Pos in the Attr union.
 * SQL source positions are stored out-of-band via the SOURCE_RANGE symbol
 * (see src/parser/positions.ts). This keeps schema-structural metadata
 * separate from parser bookkeeping and ensures position data is invisible
 * to JSON serialization and attrs iteration.
 *
 * Atlas Go equivalent: schema.Pos / hcl.Pos (sql/schema/schema.go)
 */
export interface Pos { ... }
export interface PosPoint { ... }
```

### 2.2 `ColumnType.null` — Optional

`ColumnType.null` changes from `readonly null: boolean` to `readonly null?: boolean`.

Semantics:

| Value | Meaning |
|-------|---------|
| `false` | Column has an explicit `NOT NULL` constraint |
| `true` | Column has an explicit `NULL` declaration |
| `undefined` | No nullability clause was written; PostgreSQL defaults this column to nullable |

This is a breaking change. Consumers that previously relied on `null: boolean` being always
present must now handle `undefined`.

`newNullableColumn(name)` is **kept** — it produces `null: true`, explicitly marking the column
as having a written `NULL` declaration, which is distinct from an undeclared nullability.

The `columnType(type, opts?)` factory omits the `null` field when `opts.null` is `undefined`:

```typescript
export function columnType(type: SchemaType, opts?: { null?: boolean; raw?: string }): ColumnType {
  return {
    type,
    ...(opts?.null !== undefined ? { null: opts.null } : {}),
    ...(opts?.raw !== undefined ? { raw: opts.raw } : {}),
  }
}
```

### 2.3 `DomainType` — New Dual-Role Type

`DomainType` is added to both the `SchemaType` union and the `SchemaObject` union, following the
same dual-role pattern as `EnumType`. This allows a column's `ColumnType.type` to reference a
`DomainType` directly (referential equality with the object in `Schema.objects`).

**Interface** (in `src/types.ts`):

```typescript
export interface DomainType {
  readonly kind: typeof TypeKind.DomainType
  readonly type: string                    // qualified type name as written (Atlas Go: T string)
  readonly schema?: Schema                 // back-ref — not populated; navigate from Realm
  readonly baseType: SchemaType            // underlying type; can itself be a DomainType
  readonly null?: boolean                  // domain-level NOT NULL constraint
  readonly default?: Expr                  // domain DEFAULT expression
  readonly checks?: readonly Check[]       // domain CHECK constraints
  readonly attrs?: readonly Attr[]
}
```

`baseType` may recursively be a `DomainType` (PostgreSQL allows `CREATE DOMAIN d2 AS d1`).

**Constant** (in `src/constants.ts`):

```typescript
export const TypeKind = {
  // ... existing ...
  DomainType: 'DomainType',
} as const
```

**Factory** (in `src/factories.ts`):

```typescript
export function domainType(
  type: string,
  baseType: SchemaType,
  opts?: { null?: boolean; default?: Expr; checks?: readonly Check[]; attrs?: readonly Attr[] }
): DomainType
```

`DomainType` is re-exported from `src/index.ts` alongside the other type variants.

### 2.4 Summary of Model File Changes

| File | Changes |
|------|---------|
| `src/attrs.ts` | Remove `Pos`/`PosPoint` from `Attr` union; keep interfaces as documentation |
| `src/constants.ts` | Remove `AttrKind.Pos`; add `TypeKind.DomainType` |
| `src/types.ts` | Add `DomainType` interface; add to `SchemaType` union |
| `src/schema.ts` | Add `DomainType` to `SchemaObject` union |
| `src/factories.ts` | Remove `filePos`; update `columnType`; add `domainType` |
| `src/index.ts` | Export `DomainType`, `domainType`, `TypeKind.DomainType` |
| `test/schema.test.ts` | Update for `Realm.ddlapi`, `ColumnType.null` optionality, `Pos` removal |
| `test/types.test.ts` | Update exhaustiveness checks for `DomainType` in `SchemaType` |

---

## 3. Source Range Tracking via Symbol

### 3.1 Location

`src/parser/positions.ts` — private module, but its exports are re-exported from `src/index.ts`.

### 3.2 API

```typescript
// src/parser/positions.ts

export declare const SOURCE_RANGE: unique symbol

/**
 * A byte range in the DDL source string, using the same representation as
 * pgsql-parser (libpg_query):
 *
 *   location — zero-based start byte offset (UTF-8)
 *   len      — length in bytes
 *
 * For top-level entities (Table, Index, Type, Domain, Trigger), location and
 * len come directly from pgsql-parser's stmt_location and stmt_len — an exact
 * range for the entire DDL statement.
 *
 * For sub-entities (Column, ForeignKey, Check, IndexPart), location comes from
 * the node's own location field; len is approximated as the distance to the
 * next sibling's location, or the statement end if no following sibling exists.
 */
export interface SourceRange {
  location: number
  len: number
}

/**
 * Reads SOURCE_RANGE from any value. Returns undefined if absent.
 *
 * SOURCE_RANGE is set on: Table, Index, EnumType, DomainType (top-level statement range),
 * Column, ForeignKey, Check (sub-node range, approximated len).
 * It is NOT set on: Schema, Realm, IndexPart, ColumnType, Attr variants, Expr variants.
 */
export function getSourceRange(obj: unknown): SourceRange | undefined
```

### 3.3 Internal Helpers (`src/parser/positionUtils.ts`)

```typescript
function stmtRange(stmtLocation: number, stmtLen: number): SourceRange
function nodeRange(nodeLocation: number, nextNodeLocation?: number, stmtEnd?: number): SourceRange
function attachRange(obj: object, range: SourceRange): void
```

### 3.4 Entity Coverage

| Entity | location | len |
|--------|----------|-----|
| `Table`, `Index`, `EnumType`, `DomainType`, Trigger | `stmt_location` | `stmt_len` (exact) |
| `Column` | `ColumnDef.location` | distance to next `ColumnDef.location` or stmt end |
| `ForeignKey` | `Constraint.location` | distance to next constraint or stmt end |
| `Check` (table-level) | `Constraint.location` | distance to next constraint or stmt end |

---

## 4. Parser Library Selection

### 4.1 Comparison Matrix

| Criterion | **pgsql-parser** | node-sql-parser | @polyglot-sql/sdk | @dbml/core | ANTLR4 PG grammar |
|-----------|-----------------|-----------------|-------------------|------------|-------------------|
| Technology | libpg_query → WASM | PEG (Peggy) | Rust → WASM | PEG (Peggy) | ANTLR4 |
| Browser + Node | ✅ | ✅ | ✅ | ❌ Node only | ⚠️ |
| PostgreSQL accuracy | ✅ 100% | ⚠️ Partial | ⚠️ Multi-dialect | ⚠️ Partial | ⚠️ Grammar gaps |
| CREATE TYPE enum/composite/range | ✅ | ❌ Broken | ⚠️ | ⚠️ | ⚠️ |
| COMMENT ON | ✅ | ❌ | ⚠️ | ❌ | ⚠️ |
| CREATE TRIGGER | ✅ | ⚠️ | ⚠️ | ❌ | ✅ |
| stmt_location + stmt_len | ✅ | ✅ with option | ⚠️ | ❌ | ✅ |
| Bundle (WASM + JS wrapper) | ~2–4 MB + 12 KB | ~150–750 KB | ~1.5–2 MB | ~600 KB | ~58 MB+ |
| npm weekly downloads | ~77 K | ~20 K | ~5 K | ~50 K | ~50 |
| Maintenance | ✅ Active | ✅ Active | ✅ Active | ✅ Active | ⚠️ Low |

### 4.2 Recommendation: `pgsql-parser`

Uses the actual PostgreSQL C parser via WASM — 100% dialect accuracy, all in-scope statements
supported, exact statement-level byte ranges via `stmt_location`/`stmt_len`, browser + Node
without polyfills. 77 K weekly downloads, active maintenance.

Bundle size is mitigated by a dynamic `import()` so the WASM chunk is excluded from consumer
bundles that never call `buildFromDdl`. WASM binary is inlined in the npm package.

`pgsql-parser` is imported only in `src/parser/pgParser.ts`. Nothing from `pgsql-parser` or
`@pgsql/types` appears in the public API — the parser can be swapped by changing one file.

### 4.3 Why Not the Others

- `node-sql-parser`: `CREATE TYPE ... AS ENUM` broken for quoted identifiers; no `COMMENT ON`.
- `@polyglot-sql/sdk`: heavier WASM, unclear DDL coverage.
- `@dbml/core`: Node-only, no trigger support.
- `ANTLR4 PostgreSQL grammar`: 58 MB, ~50 downloads/week, grammar gaps.

---

## 5. SQL Validation Helper for Tests

`pgsql-parser` is used as the SQL syntax validator in tests. A successful parse is an
authoritative syntax certificate — no additional devDependency needed.

```typescript
// test/helpers/assertValidSql.ts
export async function assertValidSql(sql: string, label?: string): Promise<void>
```

Calls `parse()` from pgsql-parser and throws a descriptive error if parsing fails. The specific
library is encapsulated here; replacing it requires changing only this file.

---

## 6. `buildFromDdl` API

### 6.1 Signature

`DdlNonFatalError` is a **discriminated union** — each `kind` carries machine-readable fields
specific to that error category. `message` is human-readable only; callers must not parse it.
`range` carries the same `{ location, len }` representation as entity source ranges.

```typescript
export type DdlNonFatalError =
  | {
      kind: 'out-of-scope-statement'
      /** AST node type name from pgsql-parser, e.g. 'AlterTableStmt', 'DropStmt'. */
      statementType: string
      message: string
      range?: SourceRange
    }
  | {
      kind: 'unresolved-reference'
      /** Qualified name of the object that could not be found, e.g. 'public.customers'. */
      target: string
      message: string
      range?: SourceRange
    }
  | {
      kind: 'duplicate-object'
      /** 'Table', 'Index', 'EnumType', etc. */
      objectKind: string
      /** Fully-qualified name, e.g. 'public.users'. */
      qualifiedName: string
      message: string
      range?: SourceRange
    }
  | {
      kind: 'unresolved-like-source'
      /** Qualified name of the LIKE'd table being created, e.g. 'public.accounts_log'. */
      table: string
      /** Qualified name of the LIKE source that was not found. */
      likeSource: string
      message: string
      range?: SourceRange
    }

export interface BuildFromDdlOptions {
  /** Attach SOURCE_RANGE to each schema entity. @default false */
  trackPositions?: boolean
  /**
   * When true, any non-fatal issue (that would normally call onError) instead throws a
   * DdlBuildError with a `.issues` array after all statements have been processed.
   * onError and strict may coexist: onError fires per-issue, then DdlBuildError is thrown
   * if issues > 0. @default false
   */
  strict?: boolean
  /**
   * Called synchronously for each non-fatal issue during the build.
   * Absence of this callback does NOT imply the returned Realm is complete —
   * use strict: true for pipelines that require completeness.
   * Async callers may buffer calls and flush after buildFromDdl resolves.
   */
  onError?: (error: DdlNonFatalError) => void
}

/**
 * Thrown when buildFromDdl encounters a hard parse failure (invalid PostgreSQL syntax).
 */
export class DdlParseError extends Error {
  readonly code = 'DDL_PARSE_ERROR' as const
  readonly range?: SourceRange
  readonly cause?: unknown
}

/**
 * Thrown when strict: true and one or more non-fatal issues were encountered.
 * All issues are collected before throwing (fail-at-end, not fail-fast).
 */
export class DdlBuildError extends Error {
  readonly code = 'DDL_BUILD_ERROR' as const
  readonly issues: readonly DdlNonFatalError[]
}

/**
 * Builds a Realm from PostgreSQL DDL.
 *
 * Resolves after WASM init (first call only) and full parse.
 * onError is invoked synchronously during the build, before the promise resolves.
 *
 * Absence of onError does NOT imply the returned Realm is complete.
 * Use strict: true for pipelines that require completeness.
 */
export async function buildFromDdl(ddl: string, options?: BuildFromDdlOptions): Promise<Realm>
```

### 6.2 Return Value

- `Realm.ddlapi = '1.0.0'`.
- One `Schema` per distinct schema namespace. Unqualified names normalise to `'public'` (§7.1).
- Tables, indexes, types, domains, and triggers are populated from the DDL.
- A resolution pass runs after all statements are parsed (§7).

### 6.3 Error Contract

| Situation | Kind | Realm outcome |
|-----------|------|---------------|
| Syntactically invalid PostgreSQL | — | Throws `DdlParseError`; no Realm |
| `ALTER TABLE`, `DROP`, DML, `CREATE SEQUENCE`, `CREATE VIEW`, `CREATE SCHEMA`, `CREATE EXTENSION`, `CREATE FUNCTION`, `CREATE TABLE … PARTITION OF` | `out-of-scope-statement` | Statement absent from Realm |
| `COMMENT ON` references unknown object | `unresolved-reference` | Comment discarded; target object unchanged |
| `CREATE INDEX` on unknown table (after pass 2) | `unresolved-reference` | Index present in `Schema.objects`, not attached to any table |
| Unresolvable FK `refTable` or `refColumns` (after pass 2) | `unresolved-reference` | Table present; `ForeignKey.refTable` / `refColumns` are `undefined` |
| Duplicate object (same qualified name) | `duplicate-object` | Second statement absent; first retained |
| `LIKE other_table` — source not in same DDL | `unresolved-like-source` | Entire table absent from Realm |
| `INSTEAD OF` trigger on unknown view | `unresolved-reference` | Trigger discarded |
| Forward-ref `CREATE INDEX` resolved in pass 2 | *(none — silent)* | Index moved to `Table.indexes`; intentionally no error |
| Empty input | — | `Realm { ddlapi: '1.0.0', schemas: [] }` |

### 6.4 Partial-Realm Guarantee

The following invariants hold on the returned `Realm` regardless of which errors occurred:

- Objects reported with `duplicate-object` or `unresolved-like-source` are **absent** from the
  Realm entirely.
- Objects reported with `unresolved-reference` **may be present** with incomplete fields
  (`ForeignKey.refTable` / `refColumns` undefined; orphan indexes in `Schema.objects`).
- A forward-reference `CREATE INDEX` that is successfully resolved in pass 2 produces **no
  error** and appears in `Table.indexes` as if it had been declared after the table.
- `strict: true` throws `DdlBuildError` when any `onError`-category issue occurs, but the
  Realm is fully built before the throw — callers may inspect `DdlBuildError.issues` after
  catching.

### 6.4 Module Layout

```
src/
  parser/
    positions.ts                  ← SOURCE_RANGE, SourceRange, getSourceRange (public exports)
    buildFromDdl.ts               ← public entry point
    pgParser.ts                   ← lazy pgsql-parser wrapper (private)
    positionUtils.ts              ← stmtRange, nodeRange, attachRange (private)
    schemaAccumulator.ts          ← mutable registries and builder state
    referenceResolver.ts          ← pass-2 referential equality and forward-ref resolution
    stmtHandlers/
      createTable.ts
      createIndex.ts
      createType.ts
      createDomain.ts
      createTrigger.ts
      comment.ts
```

`src/index.ts` re-exports only: `SOURCE_RANGE`, `SourceRange`, `getSourceRange`,
`buildFromDdl`, `DdlParseError`, `DdlBuildError`, `DdlNonFatalError`, `BuildFromDdlOptions`.

---

## 7. Identifier Normalisation

PostgreSQL folds unquoted identifiers to lowercase. `buildFromDdl` mirrors this:

- **Unquoted** identifiers (table names, schema names, column names, type names) are lowercased.
- **Quoted** identifiers (`"MyTable"`) have their surrounding double-quotes stripped and their
  inner case preserved.
- Registry keys always use the normalised name.
- `Table.name`, `Schema.name`, `Column.name`, etc. store the normalised form.

This means `CREATE TABLE Users` and `CREATE TABLE users` map to the same registry key
`public.users`. The second produces a `duplicate-object` error.

---

## 8. Referential Equality and Resolution

### 8.1 Pass-1 Registries (built during statement handling)

```
tableRegistry:  Map<string, Table>      key: "schemaName.tableName" (normalised)
columnRegistry: Map<string, Column>     key: "schemaName.tableName.columnName"
typeRegistry:   Map<string, SchemaType> key: "schemaName.typeName"
                                        — holds EnumType and DomainType instances
```

`DomainType` objects are placed in both `Schema.objects` **and** `typeRegistry` so that column
type references to a domain name resolve to the same instance that lives in `Schema.objects`.

### 8.2 Pass-2 Resolution (referenceResolver.ts)

Runs after all statements are parsed. Order within pass 2:

1. **LIKE expansion**: for each table with a pending `UnknownAttr { kind: 'Like', source }`,
   look up the source table in `tableRegistry`. If found, create **fresh copies** of its
   `Column` objects (all attrs included — collation, check, generated, default, etc.) and
   prepend them to the new table's column list. If not found → `unresolved-like-source` error,
   table discarded.

2. **Column type upgrade**: for each column whose type is `UnsupportedType(name)`, look up
   `normalise(name)` in `typeRegistry` (same schema first, then other schemas). If found, replace
   the column type with the registered `SchemaType` instance (mutation in-place is acceptable
   since the Realm has not yet been returned).

3. **Index re-attachment**: for each `Index` in `Schema.objects` (orphans from forward-reference
   scenarios), look up its target table in `tableRegistry`. If found, move the index into
   `Table.indexes`. No `onError` — forward-reference is valid DDL ordering.

4. **ForeignKey resolution**: resolve `ForeignKey.refTable` and `ForeignKey.refColumns` using
   `tableRegistry` and `columnRegistry`. Unresolvable → `unresolved-reference` error; field left
   undefined.

5. **Index part columns**: resolve `Index.parts[].column` (column-name parts) using `columnRegistry`.

6. **Primary key and unique index parts**: same column resolution for
   `Table.primaryKey.parts[].column` and inline-unique index parts.

### 8.3 Cases NOT Requiring Referential Equality

| Case | Reason |
|------|--------|
| `CompositeType` field `Column` objects | Structurally independent; distinct from any table's columns |
| `DomainType.baseType` | Resolved to a `SchemaType` instance if the base type name is in the registry; otherwise `UnsupportedType` |
| Inheritance parent names (`INHERITS`) | Stored as `UnknownAttr { kind: 'Inherits', parents: string[] }`; names only |
| Partition key columns | Stored in `UnknownAttr`; names only |

### 8.4 Unqualified Type Name Resolution

Unqualified type names are resolved **within the same schema as the owning table only**:

1. Search `typeRegistry` for `"<tableschema>.<typename>"`.
2. If not found, leave as `UnsupportedType(name)`.

Cross-schema type references require a fully-qualified type name in the DDL
(e.g. `col analytics.status`). An unqualified name that only matches a type in a different schema
remains `UnsupportedType` silently — no error is emitted, because from ddlapi's perspective the
column's type is simply unknown within its own schema. This rule eliminates cross-schema
ambiguity: if two schemas both define `status`, each table's column resolves against its own
schema, and nothing depends on Realm-level schema ordering.

---

## 9. In-Scope DDL Statements

### 9.1 Statement Scope

| Statement | In Scope | Notes |
|-----------|----------|-------|
| `CREATE TABLE` | ✅ | |
| `CREATE INDEX` / `CREATE UNIQUE INDEX` | ✅ | |
| `CREATE TYPE` | ✅ | Enum, composite, range |
| `CREATE DOMAIN` | ✅ | `DomainType` (dual-role) |
| `CREATE TRIGGER` | ✅ | |
| `COMMENT ON` | ✅ | TABLE, COLUMN, INDEX, TYPE, CONSTRAINT |
| `CREATE VIEW` | ❌ `out-of-scope-statement` | |
| `ALTER TABLE` | ❌ `out-of-scope-statement` | |
| `DROP …` | ❌ `out-of-scope-statement` | |
| `CREATE SEQUENCE` | ❌ `out-of-scope-statement` | |
| `CREATE SCHEMA` | ❌ `out-of-scope-statement` | Namespace inferred from qualified names |
| `CREATE EXTENSION / FUNCTION` | ❌ `out-of-scope-statement` | |
| DML | ❌ `out-of-scope-statement` | |
| `CREATE TABLE … PARTITION OF …` | ❌ `out-of-scope-statement` | See §14 |

### 9.2 CREATE TABLE Handling

**Column type mapping** (PostgreSQL type name → ddlapi factory):

| PostgreSQL type(s) | ddlapi factory |
|--------------------|---------------|
| `boolean`, `bool` | `boolType('boolean')` |
| `smallint`, `int2` | `integerType('smallint')` |
| `integer`, `int`, `int4` | `integerType('integer')` |
| `bigint`, `int8` | `integerType('bigint')` |
| `smallserial`, `serial2` | `integerType('smallserial')` |
| `serial`, `serial4` | `integerType('serial')` |
| `bigserial`, `serial8` | `integerType('bigserial')` |
| `real`, `float4` | `floatType('real')` |
| `double precision`, `float8` | `floatType('double precision')` |
| `numeric(p,s)`, `decimal(p,s)` | `decimalType('numeric', { precision, scale })` |
| `character varying(n)`, `varchar(n)` | `stringType('character varying', { size: n })` |
| `character(n)`, `char(n)` | `stringType('character', { size: n })` |
| `text` | `stringType('text')` |
| `bytea` | `binaryType('bytea')` |
| `date` | `timeType('date')` |
| `time [(p)] [with/without time zone]` | `timeType('time', { precision })` |
| `timestamp [(p)] [with/without time zone]` | `timeType('timestamp', { precision })` |
| `json` | `jsonType('json')` |
| `jsonb` | `jsonType('jsonb')` |
| `uuid` | `uuidType('uuid')` |
| `point`, `line`, `lseg`, `box`, `path`, `polygon`, `circle` | `spatialType(t)` |
| `interval`, `xml`, `money`, `bit(n)`, `bit varying(n)` | `unsupportedType(t)` |
| `inet`, `cidr`, `macaddr`, `macaddr8` | `unsupportedType(t)` |
| `tsvector`, `tsquery` | `unsupportedType(t)` |
| Range types (`int4range`, etc.) | `unsupportedType(t)` |
| Array types (`int[]`, `text[][]`) | `unsupportedType(t)` |
| User-defined name | `unsupportedType(name)` initially; upgraded in pass 2 if registered |

**Column constraints** (nullability: `null` field omitted when no clause is written):

| Constraint | Mapping |
|------------|---------|
| `NOT NULL` | `ColumnType.null = false` |
| `NULL` | `ColumnType.null = true` |
| (absent) | `ColumnType.null` omitted (`undefined`) |
| `DEFAULT expr` | `Column.default = literal(v)` or `rawExpr(x)` |
| `GENERATED ALWAYS AS (expr) STORED` | `GeneratedExpr` attr |
| `GENERATED ALWAYS AS IDENTITY [(seq)]` | `UnknownAttr { kind: 'Identity', generation: 'ALWAYS', ... }` |
| `GENERATED BY DEFAULT AS IDENTITY` | `UnknownAttr { kind: 'Identity', generation: 'BY DEFAULT', ... }` |
| `PRIMARY KEY` (inline) | Column added to table-level primary key |
| `UNIQUE` (inline) | Unique `Index` in `Table.indexes` |
| `CHECK (expr)` (inline) | `Check` attr on `Column.attrs` |
| `REFERENCES tbl (col)` | `ForeignKey` in `Table.foreignKeys` |
| `COLLATE collation` | `Collation` attr on `Column.attrs` |

**Table constraints:**

| Constraint | Mapping |
|------------|---------|
| `PRIMARY KEY (cols)` | `Table.primaryKey = newPrimaryKey([...cols])` |
| `UNIQUE (cols)` | Unique `Index` in `Table.indexes` |
| `UNIQUE (cols) INCLUDE (cols)` | Unique `Index` with `UnknownAttr { kind: 'IndexInclude' }` |
| `UNIQUE NULLS NOT DISTINCT (cols)` | Unique `Index` with `UnknownAttr { kind: 'IndexNullsDistinct', V: false }` |
| `CHECK (expr)` | `Check` in `Table.attrs` |
| `FOREIGN KEY (cols) REFERENCES tbl (cols)` | `ForeignKey` in `Table.foreignKeys` |
| `EXCLUDE USING method (…)` | `UnknownObject { kind: 'ExcludeConstraint', … }` in `Table.objects` |

**LIKE clause:**

| Scenario | Behaviour |
|----------|-----------|
| `LIKE src [INCLUDING …]` and `src` is in same DDL | Pass-2 LIKE expansion copies all attrs from source columns (fresh `Column` objects, same type references via referential equality) |
| `LIKE src` and `src` is not in same DDL | `unresolved-like-source` error; table skipped entirely |

**Table-level PG attrs:**

| Clause | Mapping |
|--------|---------|
| `PARTITION BY RANGE/LIST/HASH (…)` | `UnknownAttr { kind: 'Partition', T, parts }` |
| `INHERITS (parent, …)` | `UnknownAttr { kind: 'Inherits', parents: string[] }` |
| `WITH (fillfactor = …)` | `UnknownAttr { kind: 'StorageParams', params: Record<string, string> }` |

### 9.3 CREATE INDEX Handling

| Clause | Mapping |
|--------|---------|
| `[UNIQUE]` | `Index.unique = true` |
| `USING method` | `UnknownAttr { kind: 'IndexType', T }` |
| `ASC`/`DESC` | `IndexPart.desc` |
| `NULLS FIRST`/`LAST` | `UnknownAttr { kind: 'IndexColumnProp', nullsFirst, nullsLast }` on part |
| `op_class` | `UnknownAttr { kind: 'IndexOpClass', name }` on part |
| `INCLUDE (cols)` | `UnknownAttr { kind: 'IndexInclude', columns }` |
| `WHERE predicate` | `UnknownAttr { kind: 'IndexPredicate', P }` |
| `CONCURRENTLY` | `UnknownAttr { kind: 'Concurrently' }` |
| `NULLS [NOT] DISTINCT` | `UnknownAttr { kind: 'IndexNullsDistinct', V: bool }` |
| `WITH (params)` | `UnknownAttr { kind: 'StorageParams', params }` |

If the target table is not defined in the same DDL, the index is stored in `Schema.objects` and
resolved in pass 2 if the table appears later; otherwise `unresolved-reference` error.

### 9.4 CREATE TYPE Handling

| Form | Mapping |
|------|---------|
| `CREATE TYPE name AS ENUM (...)` | `enumType(values)` → `Schema.objects` + `typeRegistry` |
| `CREATE TYPE name AS (field type, ...)` | `UnknownObject { kind: 'CompositeType', name, fields: Column[] }` |
| `CREATE TYPE name AS RANGE (...)` | `UnknownObject { kind: 'RangeType', name, subtype, ... }` |

### 9.5 CREATE DOMAIN Handling

`CREATE DOMAIN name [AS] base_type [DEFAULT expr] [NOT NULL] [CHECK (expr) …]`

Mapped to `DomainType` (§2.3). Added to both `Schema.objects` and `typeRegistry`.

### 9.6 CREATE TRIGGER Handling

Triggers are attached to their owning table as `UnknownAttr { kind: 'Trigger', … }`. The exact
shape of the attr body is deferred to implementation once the pgsql-parser AST for
`CreateTrigStmt` is examined.

Special cases:
- `INSTEAD OF` trigger where the target view is not defined in the same DDL →
  `unresolved-reference` error; trigger discarded.

### 9.7 COMMENT ON Handling

| Statement | Action |
|-----------|--------|
| `COMMENT ON TABLE t IS 'text'` | Appends/replaces `Comment` attr on `Table` |
| `COMMENT ON COLUMN t.c IS 'text'` | Appends/replaces `Comment` attr on `Column` |
| `COMMENT ON INDEX i IS 'text'` | Appends/replaces `Comment` attr on `Index` |
| `COMMENT ON TYPE t IS 'text'` | Appends/replaces `Comment` attr on type object |
| `COMMENT ON CONSTRAINT c ON t IS 'text'` | Appends/replaces `Comment` attr on `Check`/`ForeignKey` |
| `COMMENT ON … IS NULL` | Removes existing `Comment` attr via `removeAttr`; no-op if absent |
| Reference to unknown object | `unresolved-reference` error; comment discarded |

---

## 10. PostgreSQL-Specific Entity Mapping

Based on Atlas Go driver (`atlas/sql/postgres/inspect.go`).

| Atlas Go struct | ddlapi representation |
|----------------|----------------------|
| `Identity` | `UnknownAttr { kind: 'Identity', generation, seqStart?, seqIncrement? }` |
| `Partition` | `UnknownAttr { kind: 'Partition', T: 'RANGE'\|'LIST'\|'HASH', parts }` |
| `Inherits` | `UnknownAttr { kind: 'Inherits', parents: string[] }` |
| `IndexType` | `UnknownAttr { kind: 'IndexType', T }` |
| `IndexPredicate` | `UnknownAttr { kind: 'IndexPredicate', P }` |
| `IndexInclude` | `UnknownAttr { kind: 'IndexInclude', columns }` |
| `IndexOpClass` | `UnknownAttr { kind: 'IndexOpClass', name }` |
| `IndexNullsDistinct` | `UnknownAttr { kind: 'IndexNullsDistinct', V: bool }` |
| `IndexColumnProperty` | `UnknownAttr { kind: 'IndexColumnProp', nullsFirst, nullsLast }` |
| `Concurrently` | `UnknownAttr { kind: 'Concurrently' }` |
| `CompositeType` | `UnknownObject { kind: 'CompositeType', … }` |
| `RangeType` | `UnknownObject { kind: 'RangeType', … }` |
| `DomainType` | `DomainType` (first-class, §2.3) |
| `ExcludeConstraint` | `UnknownObject { kind: 'ExcludeConstraint', … }` |
| `StorageParams` (WITH clause) | `UnknownAttr { kind: 'StorageParams', params }` |

---

## 11. Test Structure

### 11.1 File Organisation

```
test/
  helpers/
    assertValidSql.ts             ← wraps pgsql-parser; throws on invalid SQL
    loadSql.ts                    ← loadSql('create-table/nullability.sql')
  resources/
    create-table/                 ← one .sql file per test case
    create-index/
    create-type/
    create-domain/
    create-trigger/
    comment-on/
    mixed/
  statements/
    createTable.test.ts           ← reads resources/create-table/; one test per file
    createIndex.test.ts
    createType.test.ts            ← create-type/ + create-domain/
    createTrigger.test.ts
    commentOn.test.ts
  schema.test.ts                  ← existing; updated per §2.4
  types.test.ts                   ← existing; updated for DomainType and Pos removal
  sqlSamples.test.ts              ← discovers all *.sql in resources/, calls assertValidSql on each
  buildFromDdl.test.ts            ← inline SQL: positions, referential equality, onError,
                                     identifier normalisation, duplicate objects, multi-schema,
                                     empty input, invalid SQL → DdlParseError
```

`statements/createTable.test.ts` also covers LIKE resolution tests (multi-statement SQL inline,
since LIKE resolution involves two CREATE TABLE statements forming one test scenario).

### 11.2 Resource File Convention

Each `.sql` file contains **one self-contained test case** named to describe its content.

```typescript
// test/helpers/loadSql.ts
import { readFileSync } from 'fs'
import { join } from 'path'

export function loadSql(relativePath: string): string {
  return readFileSync(join(__dirname, '..', 'resources', relativePath), 'utf-8')
}
```

`sqlSamples.test.ts` uses `fs.readdirSync` (recursively) to discover all `.sql` files and calls
`assertValidSql` on each one. Statement test files live one level deeper (`test/statements/`);
`__dirname` navigates up two levels to reach `test/resources/`.

### 11.3 Test File Responsibilities

| File | What it tests |
|------|--------------|
| `statements/createTable.test.ts` | CREATE TABLE variants; also LIKE resolution (inline) |
| `statements/createIndex.test.ts` | Index structure and PG-specific attrs |
| `statements/createType.test.ts` | Enum, composite, range, domain types |
| `statements/createTrigger.test.ts` | Trigger timing, events, per-row, WHEN, function name |
| `statements/commentOn.test.ts` | Comment attach/remove/discard |
| `sqlSamples.test.ts` | `assertValidSql` on every resource file only |
| `buildFromDdl.test.ts` | `SOURCE_RANGE`, referential equality, `onError` (all kinds), identifier normalisation, duplicate objects, multi-schema, empty input, `DdlParseError` |

---

## 12. SQL Resource File Inventory

All valid PostgreSQL. Source: https://www.postgresql.org/docs/current/sql-commands.html

### 12.1 `create-table/`

| File | SQL content |
|------|-------------|
| `column-types-numeric.sql` | `smallint`, `integer`, `bigint`, `real`, `double precision`, `numeric(10,2)`, `decimal(6,3)` |
| `column-types-character.sql` | `varchar(255)`, `varchar(100)`, `char(10)`, `char(5)`, `text` |
| `column-types-temporal.sql` | `date`, `time`, `time(3)`, `time with time zone`, `timestamp`, `timestamp(6)`, `timestamptz`, `interval`, `interval year to month`, `interval hour to second(4)` |
| `column-types-other.sql` | `bytea`, `boolean`, `json`, `jsonb`, `uuid`, `xml`, `money`, `bit(8)`, `bit varying(16)` |
| `nullability.sql` | `NOT NULL`, `NULL`, `DEFAULT 'active'`, `DEFAULT 0.0`, `DEFAULT now()`, `DEFAULT '{}'::jsonb` |
| `primary-key-inline.sql` | Single-column `bigint PRIMARY KEY` |
| `primary-key-composite.sql` | Table-level `PRIMARY KEY (tenant_id, user_id)` |
| `primary-key-named.sql` | `CONSTRAINT pk_named PRIMARY KEY (id)` |
| `unique-inline.sql` | Inline `UNIQUE` on a column |
| `unique-table-level.sql` | Table-level `UNIQUE (phone)` |
| `unique-named.sql` | `CONSTRAINT uq_code UNIQUE (code)` |
| `unique-nulls-not-distinct.sql` | `UNIQUE NULLS NOT DISTINCT (email, phone)` (PG 15+) |
| `check-inline-anonymous.sql` | `age integer CHECK (age >= 0)` |
| `check-inline-named.sql` | `CONSTRAINT positive_price CHECK (price > 0)` |
| `check-table-level.sql` | `CONSTRAINT valid_code CHECK (code ~ '^[A-Z]{3}$')` |
| `foreign-key-inline.sql` | `REFERENCES customers (id) ON DELETE RESTRICT` |
| `foreign-key-composite.sql` | `FOREIGN KEY (a, b) REFERENCES t (x, y) DEFERRABLE INITIALLY DEFERRED` |
| `foreign-key-set-actions.sql` | `ON UPDATE SET DEFAULT`, `ON DELETE SET NULL (b)` |
| `generated-columns-stored.sql` | `GENERATED ALWAYS AS (expr) STORED` |
| `identity-always.sql` | `GENERATED ALWAYS AS IDENTITY PRIMARY KEY` |
| `identity-by-default.sql` | `GENERATED BY DEFAULT AS IDENTITY (START WITH 100 INCREMENT BY 10)` |
| `serial.sql` | `serial`, `smallserial`, `bigserial` |
| `inheritance.sql` | `CREATE TABLE cities (…); CREATE TABLE capitals (…) INHERITS (cities)` |
| `partition-range.sql` | `PARTITION BY RANGE (logdate)` |
| `partition-list.sql` | `PARTITION BY LIST (region)` |
| `partition-hash.sql` | `PARTITION BY HASH (order_id)` |
| `partition-multi-column.sql` | `PARTITION BY RANGE (ts, kind)` |
| `partition-expression.sql` | `PARTITION BY RANGE (date_trunc('hour', ts))` |
| `collation.sql` | `COLLATE "en-US-x-icu"`, `COLLATE "C"` |
| `like-including-all.sql` | `CREATE TABLE accounts_log (LIKE accounts INCLUDING ALL)` |
| `like-including-specific.sql` | `LIKE orders INCLUDING DEFAULTS INCLUDING CONSTRAINTS` |
| `exclude-constraint.sql` | `EXCLUDE USING gist (during WITH &&)` |
| `storage-params.sql` | `WITH (fillfactor = 70, autovacuum_enabled = false)` |
| `network-types.sql` | `inet`, `cidr`, `macaddr`, `macaddr8` |
| `geometric-types.sql` | `point`, `line`, `lseg`, `box`, `path`, `polygon`, `circle` |
| `fts-types.sql` | `tsvector`, `tsquery` |

### 12.2 `create-index/`

| File | SQL content |
|------|-------------|
| `basic-btree.sql` | `CREATE INDEX idx ON users (email)` |
| `unique.sql` | `CREATE UNIQUE INDEX idx ON accounts (code)` |
| `multi-column.sql` | `(customer_id, created_at DESC)` |
| `expression.sql` | `(lower(email))` |
| `partial.sql` | `WHERE status = 'active'` |
| `covering-include.sql` | `INCLUDE (customer_id, total_amount)` |
| `operator-class.sql` | `(content text_pattern_ops)` |
| `nulls-first.sql` | `(x ASC NULLS FIRST)` |
| `nulls-not-distinct.sql` | `NULLS NOT DISTINCT` (PG 15+) |
| `gin.sql` | `USING gin (payload jsonb_path_ops)` |
| `gist.sql` | `USING gist (position)` |
| `brin.sql` | `USING brin (recorded_at)` |
| `hash.sql` | `USING hash (key)` |
| `spgist.sql` | `USING spgist (location)` |
| `partial-gin.sql` | GIN with WHERE clause |
| `storage-params.sql` | `WITH (deduplicate_items = false)` |
| `concurrently.sql` | `CREATE INDEX CONCURRENTLY` |

### 12.3 `create-type/`

| File | SQL content |
|------|-------------|
| `enum-basic.sql` | `CREATE TYPE mood AS ENUM ('happy', 'sad', 'neutral')` |
| `enum-schema-qualified.sql` | `CREATE TYPE public.status AS ENUM (…)` |
| `enum-many-values.sql` | 7-value HTTP method enum |
| `composite-simple.sql` | `AS (real_part float8, imag_part float8)` |
| `composite-with-array.sql` | Composite with a `text[]` field |
| `range-basic.sql` | `AS RANGE (subtype = float8)` |
| `range-with-options.sql` | Range with `subtype_diff` |

### 12.4 `create-domain/`

| File | SQL content |
|------|-------------|
| `simple.sql` | `AS integer CHECK (VALUE > 0)` |
| `with-not-null-default.sql` | `NOT NULL DEFAULT '…' CHECK (…)` |
| `with-named-constraint.sql` | `CONSTRAINT valid_zip CHECK (VALUE ~ '…')` |

### 12.5 `create-trigger/`

| File | SQL content |
|------|-------------|
| `after-insert-row.sql` | `AFTER INSERT … FOR EACH ROW EXECUTE FUNCTION` |
| `before-update-when.sql` | `BEFORE UPDATE … WHEN (OLD.* IS DISTINCT FROM NEW.*)` |
| `statement-level.sql` | `AFTER INSERT OR UPDATE OR DELETE … FOR EACH STATEMENT` |
| `instead-of-view.sql` | `INSTEAD OF INSERT … FOR EACH ROW` on a view |
| `constraint-trigger.sql` | `CREATE CONSTRAINT TRIGGER … DEFERRABLE INITIALLY DEFERRED` |
| `transition-tables.sql` | `REFERENCING NEW TABLE AS new_rows … FOR EACH STATEMENT` |

### 12.6 `comment-on/`

| File | SQL content |
|------|-------------|
| `table.sql` | `COMMENT ON TABLE users IS '…'` |
| `column.sql` | `COMMENT ON COLUMN users.email IS '…'` |
| `index.sql` | `COMMENT ON INDEX idx_users_email IS '…'` |
| `type.sql` | `COMMENT ON TYPE mood IS '…'` |
| `constraint.sql` | `COMMENT ON CONSTRAINT positive_price ON products IS '…'` |
| `remove-comment.sql` | `COMMENT ON TABLE users IS NULL` |

### 12.7 `mixed/`

| File | SQL content |
|------|-------------|
| `multi-schema.sql` | `public.users` and `audit.log_entries` in one input |
| `comments-on-local-objects.sql` | Table + index defined, then `COMMENT ON` each |
| `out-of-scope-stmts.sql` | `CREATE TABLE kept (…)` surrounded by ALTER/DROP/CREATE SEQUENCE |

---

## 13. Implementation Tasks

### Phase A — Model Prerequisites

| # | Task | Files |
|---|------|-------|
| A1 | Add `ddlapi: string` to `Realm`; update `newRealm` | `src/schema.ts`, `src/factories.ts` |
| A2 | Remove `Pos` from `Attr` union and `AttrKind`; add documentary comment; remove `filePos` | `src/attrs.ts`, `src/constants.ts`, `src/factories.ts` |
| A3 | Make `ColumnType.null` optional; update `columnType` factory | `src/schema.ts`, `src/factories.ts` |
| A4 | Add `DomainType` interface, `TypeKind.DomainType`, `domainType` factory; add to `SchemaType` and `SchemaObject` unions | `src/types.ts`, `src/constants.ts`, `src/schema.ts`, `src/factories.ts`, `src/index.ts` |
| A5 | Update existing tests | `test/schema.test.ts`, `test/types.test.ts` |

### Phase B — Parser Infrastructure

| # | Task | Files |
|---|------|-------|
| B1 | Create `src/parser/positions.ts` | new |
| B2 | Re-export positions and entry-point types from `src/index.ts` | `src/index.ts` |
| B3 | Add `pgsql-parser` and `@pgsql/types` to `dependencies` | `package.json` |
| B4 | Create `src/parser/pgParser.ts` (module-level WASM singleton, `parseStatements(ddl)`) | new |
| B5 | Create `src/parser/positionUtils.ts` | new |

### Phase C — Test Infrastructure

| # | Task | Files |
|---|------|-------|
| C1 | `test/helpers/assertValidSql.ts` | new |
| C2 | `test/helpers/loadSql.ts` | new |
| C3 | All resource `.sql` files under `test/resources/` (~60 files, §12) | new |
| C4 | `test/sqlSamples.test.ts` | new |

### Phase D — Core Builder

| # | Task | Files |
|---|------|-------|
| D1 | `src/parser/schemaAccumulator.ts` — registries + mutable builder | new |
| D2 | `src/parser/stmtHandlers/createTable.ts` | new |
| D3 | `src/parser/stmtHandlers/createIndex.ts` | new |
| D4 | `src/parser/stmtHandlers/createType.ts` | new |
| D5 | `src/parser/stmtHandlers/createDomain.ts` | new |
| D6 | `src/parser/stmtHandlers/createTrigger.ts` | new |
| D7 | `src/parser/stmtHandlers/comment.ts` | new |
| D8 | `src/parser/referenceResolver.ts` (pass-2 in order: LIKE → type upgrade → index reattach → FK → index parts) | new |
| D9 | `src/parser/buildFromDdl.ts` | new |

### Phase E — Statement Tests

| # | Task | File |
|---|------|------|
| E1 | `test/statements/createTable.test.ts` (includes LIKE resolution inline tests) | new |
| E2 | `test/statements/createIndex.test.ts` | new |
| E3 | `test/statements/createType.test.ts` | new |
| E4 | `test/statements/createTrigger.test.ts` | new |
| E5 | `test/statements/commentOn.test.ts` | new |

### Phase F — Functionality Tests

| # | Task | File |
|---|------|------|
| F1 | `test/buildFromDdl.test.ts` | new |

### Phase G — Build

| # | Task | |
|---|------|--|
| G1 | Lazy `import()` for pgsql-parser in `pgParser.ts` | |
| G2 | Dual CJS + ESM output verified with async entry point | `vite.config.ts` |
| G3 | `npm run typecheck && npm run build` | |

---

## 14. Out of Scope

### `CREATE VIEW`

Encountering a `CREATE VIEW` calls `onError { kind: 'out-of-scope-statement' }` and is skipped.
The `View` type already exists in the ddlapi model and can be populated in a future extension.

### `CREATE TABLE … PARTITION OF …` (Sub-tables)

Atlas handles partitions exclusively through **live database inspection** — querying
`pg_partitioned_table` and `pg_inherits`. There is no DDL parsing path for partition sub-tables
in Atlas code. Individual partition sub-tables appear as regular `Table` objects discovered through
`pg_class`/`pg_inherits` queries; their parent relationship is encoded in the catalogue, not in
any DDL field.

For ddlapi's DDL parser, sub-partition tables are deferred because:

1. **Model change required** — `Table` has no `partitionOf` field.
2. **Complex `FOR VALUES` syntax** — RANGE (`FROM … TO …`), LIST (`IN (…)`), HASH
   (`WITH (MODULUS m, REMAINDER r)`) each need their own typed representation.
3. **Ordering dependency** — a sub-table references its parent, which may appear later in the
   file, requiring a third resolution pass.
4. **Sub-partitioning** — sub-tables can themselves be partitioned, requiring recursive handling.
5. **Low practical value** — hand-authored DDL scripts rarely include sub-partition tables.

`CREATE TABLE … PARTITION OF …` calls `onError { kind: 'out-of-scope-statement' }` and is
skipped. The parent partitioned table (`CREATE TABLE … PARTITION BY …`) is captured normally.

### Other

- ALTER TABLE, migration diffing — no ALTER support by design.
- CREATE SEQUENCE — not a ddlapi entity.
- Non-PostgreSQL dialects.
- Round-trip / toDdl — read-only in this phase.
- HCL/JSON serialisation — separate future phase.

---

## 15. Dependency Summary

| Package | Type | Purpose |
|---------|------|---------|
| `pgsql-parser` | `dependencies` | PostgreSQL DDL parsing via libpg_query WASM |
| `@pgsql/types` | `dependencies` | TypeScript AST node types for pgsql-parser |

No new devDependencies required.

---

## 16. Design Decisions (Interview Summary)

| Decision | Resolution |
|----------|-----------|
| `ColumnType.null` when not declared | `undefined` (absent from object) |
| `newNullableColumn` | Kept; produces `null: true` (explicit declaration) |
| Mutation in resolution pass | Acceptable; Realm not yet returned to caller |
| Duplicate qualified table name | `duplicate-object` error; second statement skipped |
| `DomainType` modelling | Dual-role (SchemaType + SchemaObject), like EnumType |
| DomainType `baseType` | Allows recursive `DomainType` (domain on domain) |
| DomainType instance sharing | Same object in `Schema.objects` and column `ColumnType.type` |
| WASM init | Module-level singleton; concurrent `buildFromDdl` calls await the same promise |
| Identifier case | Unquoted → lowercase; quoted → strip quotes, preserve inner case |
| Unqualified type resolution | Same schema only; cross-schema requires qualified name |
| Forward-ref CREATE INDEX | Resolved silently in pass 2; no `onError` (intentional asymmetry with FK) |
| LIKE source not in DDL | `unresolved-like-source` error; table skipped entirely |
| LIKE column copy | Fresh `Column` objects; all attrs copied |
| INSTEAD OF trigger on unknown view | `unresolved-reference` error; trigger discarded |
| `DdlNonFatalError.kind` | Machine-readable union: `out-of-scope-statement` \| `unresolved-reference` \| `duplicate-object` \| `unresolved-like-source` |
| `onError` message content | Statement type name only; no SQL text |
| `onError` async | Synchronous; async callers buffer and flush after `buildFromDdl` resolves |
| Trigger attr shape | Deferred to implementation (examine pgsql-parser AST first) |
| LIKE resolution tests location | `statements/createTable.test.ts` (inline multi-statement SQL) |
| Version strategy | Alpha; no version bump required |
