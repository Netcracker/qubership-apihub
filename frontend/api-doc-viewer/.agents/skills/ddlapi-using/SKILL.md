---
name: ddlapi-using
description: Use when consuming the ddlapi library from another TypeScript project — parsing DDL with buildFromDdl, walking the Realm/Schema/Table model, reading PostgreSQL-specific details off the escape hatch, or building schema objects with the factories.
---

# Using ddlapi

ddlapi turns PostgreSQL DDL into a structured, driver-neutral schema model (a
`Realm`), and provides factories to build that model by hand. The notes below cover
the contracts that the type signatures alone do not make obvious.

## Import only from the package root

```typescript
import { buildFromDdl, TypeKind, ObjectKind, PgAttrKind, PgObjectKind, PgTypeKind } from '@netcracker/qubership-apihub-ddlapi'
```

Everything is reexported from the package entry (`index.ts`); internal module
paths are unstable and must not be imported directly. The package ships dual
ESM/CJS builds with type declarations.

## The model is navigated top-down

There are no back-references. You walk **downward** and keep the parent in
scope if you need it:

```
Realm
 ├─ ddlapi: string            // spec-version stamp (DDLAPI_VERSION)
 ├─ schemas: Schema[]
 │   ├─ tables?: Table[]
 │   │   ├─ columns?, indexes?, primaryKey?, foreignKeys?
 │   │   ├─ attrs?: Attr[]
 │   │   └─ objects?: SchemaObject[]   // table-scoped (e.g. exclusion constraints)
 │   └─ objects?: SchemaObject[]       // schema-scoped (types, domains, triggers, …)
 └─ objects?: SchemaObject[]           // realm-scoped
```

A `Table` has no `.schema`; a `Column` has no `.table`. If you need the owning
table while iterating columns, track it in your own loop variable.

## Discriminate on `kind` with the exported constants

Every node in a union carries a `kind` string. Switch on it using the constant
groups — `TypeKind`, `AttrKind`, `ExprKind`, `ObjectKind` for core nodes,
`PgAttrKind`, `PgObjectKind`, `PgTypeKind` for PostgreSQL escape-hatch nodes —
not bare literals, and always handle the open default:

```typescript
switch (col.type!.type.kind) {
  case TypeKind.IntegerType: /* type: 'smallint' | 'integer' | 'bigint' | ... */ break
  case TypeKind.StringType:  /* type, size? */ break
  case TypeKind.EnumType:    /* values: string[] */ break
  default:                   /* UnknownType / dialect escape hatch — see below */ break
}
```

## Core (driver-neutral) vs PostgreSQL extensions — the key model

The core unions are **closed and driver-neutral**:

- `SchemaType`: `BoolType`, `IntegerType`, `DecimalType`, `FloatType`,
  `StringType`, `BinaryType`, `TimeType`, `JSONType`, `SpatialType`, `UUIDType`,
  `EnumType`, plus `UnsupportedType`. Each carries `type` — the dialect spelling of
  the type (e.g. `'character varying'`, `'bigint'`).
- `Attr`: `Comment`, `Charset`, `Collation`, `Check`, `GeneratedExpr`.
- `Expr`: `Literal`, `RawExpr`, `NamedDefault`.

Anything PostgreSQL-specific that has no generic representation is carried
through the **escape hatch**: an object shaped `{ kind: string; ... }` that
TypeScript sees as the union's `Unknown*` member. You recognise it by its
`kind` string and cast to read the extra fields. `buildFromDdl` currently emits
these escape-hatch kinds:

| `kind` | Where it appears | Carries |
|--------|------------------|---------|
| `'Identity'` | column `attrs` | `generation`, `seqStart?`, `seqIncrement?` |
| `'Partition'` | table `attrs` | `type` (RANGE/LIST/HASH), `parts` |
| `'Inherits'` | table `attrs` | `parents: string[]` |
| `'StorageParams'` | table / index `attrs` | `params: Record<string,string>` |
| `'IndexInclude'` | index / unique-constraint `attrs` | `columns: string[]` |
| `'IndexNullsDistinct'` | index `attrs` | `value: boolean` |
| `'IndexType'` | index `attrs` | `type` (access method, non-btree only) |
| `'IndexPredicate'` | index `attrs` | `predicate` (partial-index WHERE text) |
| `'Concurrently'` | index `attrs` | — |
| `'IndexColumnProp'` | index-part `attrs` | `nullsFirst`, `nullsLast` |
| `'IndexOpClass'` | index-part `attrs` | `name` |
| `'ExcludeConstraint'` | table `objects` | `name`, `method`, `exclusions` |
| `'CompositeType'` | schema `objects` | `name`, `schema`, `fields` |
| `'RangeType'` | schema `objects` | `name`, `schema`, `subtype?`, `params?` |
| `'pg:domain'` | schema `objects` **and** column type | `type`, `baseType`, `null?`, `default?`, `checks?` |
| `'Trigger'` | **table** `attrs` (on the target table) | `name`, `timing`, `events`, `forEachRow`, `funcName`, `when?`, `isConstraint?`, `deferrable?`, `initDeferred?` |

These kinds are available as named constants (`PgAttrKind`, `PgObjectKind`,
`PgTypeKind`) — use them instead of bare string literals. Treat the default
branch of a `switch` as "PostgreSQL detail" and narrow by `kind`:

```typescript
const identity = col.attrs?.find(a => a.kind === PgAttrKind.Identity) as
  | { generation: 'ALWAYS' | 'BY DEFAULT'; seqStart?: number } | undefined
```

`UnsupportedType` is different — it is a **core** member, not the escape hatch.
It represents a SQL column type with no generic mapping (`interval`, `xml`,
`money`, `bit`, `inet`/`cidr`, `tsvector`, array types, range types, or a
user-defined type that was never resolved). Its `type` holds the raw type name.

A column's domain type (`'pg:domain'`) is dual-role: the same object instance
appears in the schema's `objects` and as the column's `type.type`.

## Nullability tri-state

`ColumnType.null` distinguishes three source-level states:

- `false` — `NOT NULL` was written.
- `true` — `NULL` was written explicitly.
- `undefined` — no nullability clause in the DDL.

Do not collapse `undefined` to "nullable" without deciding what an absent
clause means for your use case.

## Reading values: canonical `type`, optional `raw`, Expr text

- **Compare on `column.type.type` (the `SchemaType`), not `raw`.** `SchemaType.type`
  is canonicalized (`int`/`integer`/`int4` → `'integer'`; `timetz`/`timestamptz`
  collapse the timezone), so semantically-equal DDL compares equal. `ColumnType.raw`
  is the original spelling and is **frequently absent** on a parsed column — never
  rely on it for equality or classification.
- **Expr values are raw SQL text strings.** `Literal.value` keeps the verbatim token
  — a string literal includes its quotes (`"'x'"`), a numeric literal is the digits
  as a string. `RawExpr.expr` is the expression source (e.g. `'now()'`). `Collation`
  / `GeneratedExpr` live in `column.attrs[]`; their `value` / `expr` is a scalar leaf.
- **A normalized realm can be typed as `Realm`.** api-unifier normalization keep the `Realm` structural shape (extra metadata is
  attached under symbol keys, which do not affect the structural type) — navigate
  them as `Realm` rather than `any`.

## Calling `buildFromDdl`

```typescript
const issues: DdlNonFatalError[] = []
const realm = await buildFromDdl(ddl, { onError: e => issues.push(e) })
```

- It is `async`; the first call initialises the parser WASM.
- **Only these statements are parsed:** `CREATE TABLE`, `CREATE [UNIQUE] INDEX`,
  `CREATE TYPE` (enum/composite/range), `CREATE DOMAIN`, `CREATE TRIGGER`, and
  `COMMENT ON`. Everything else — `ALTER`, `DROP`, `CREATE VIEW`/`SEQUENCE`/
  `EXTENSION`/`FUNCTION`, DML, `CREATE TABLE … PARTITION OF …` — is reported as
  an `out-of-scope-statement` issue and skipped.
- Two error channels:
  - **Hard failure** (invalid SQL syntax) → the promise rejects with
    `DdlParseError`.
  - **Non-fatal issues** → reported through `onError` and/or, with
    `{ strict: true }`, collected and thrown as `DdlBuildError` after the build.
    `DdlNonFatalError.kind` is one of `out-of-scope-statement`,
    `unresolved-reference`, `duplicate-object`, `unresolved-like-source`.
- **Partial-realm guarantee:** non-fatal issues never abort the build —
  unresolved references are left `undefined` and a (partial) Realm is still
  returned. `DdlBuildError.realm` exposes that partial Realm; `.issues` the
  list. **Absence of `onError` does not mean the Realm is complete** — use
  `{ strict: true }` for pipelines that require completeness.
- **Known output gaps to design fixtures around:**
  - Per-column `CHARACTER SET` is MySQL syntax and is a **hard `DdlParseError`** in
    the PostgreSQL parser; no `Charset` attr is ever produced from real DDL (even
    though `Charset` exists as a core `AttrKind`). `COLLATE` and `GENERATED ALWAYS
    AS (…) STORED` *are* produced (as `Collation` / `GeneratedExpr` column attrs).

```typescript
try {
  const realm = await buildFromDdl(ddl, { strict: true })
} catch (err) {
  if (err instanceof DdlParseError) { /* invalid SQL */ }
  else if (err instanceof DdlBuildError) { err.issues; err.realm /* partial */ }
}
```

## Extracting per-table DDL subsets

`prepareDdlExtractor(ddl)` is a separate entry point for slicing a multi-table DDL
into a verbatim subset per table — distinct from `buildFromDdl`, which builds the
`Realm` model. Use it when you need the *original SQL text* relevant to one table,
not a structured model.

```typescript
import { prepareDdlExtractor } from '@netcracker/qubership-apihub-ddlapi'

const extractor = await prepareDdlExtractor(ddl)   // heavy work once
for (const ref of extractor.tables()) {            // { schema, name }, source order
  const slice = extractor.extractTable(ref)!       // cheap, synchronous, repeatable
  slice.sql        // verbatim subset: the CREATE TABLE + its indexes, triggers,
                   // comments, the types it uses (transitively), and any LIKE source
  slice.warnings   // structured notes (see below)
}
```

Contract details that the signatures do not make obvious:

- **Two-phase by design.** `prepareDdlExtractor` parses once (async, WASM); each
  `extractTable` is synchronous and meant to be called once per table.
- **Pass a `TableRef`, already normalized.** `extractTable({ schema, name })` does a
  direct key lookup — identifiers must be in model-normalized form (unquoted →
  lowercase, quoted → preserved, exactly as `tables()` / a `Realm` returns them). It
  never re-folds or SQL-parses caller strings. Use `'public'` for unqualified tables.
- **`undefined` is a lookup miss, not a failure.** Only invalid SQL throws
  (`DdlParseError`, in `prepareDdlExtractor`); every non-fatal note is a `warning`.
- **Scope matches `buildFromDdl`.** Only statement types `buildFromDdl` supports are
  ever emitted; `ALTER TABLE`, sequences, functions, etc. are dropped.
- **FK targets are excluded on purpose.** A foreign key's *clause* is kept (it lives
  in the table's own `CREATE TABLE`), but the referenced table is not pulled in — you
  get an `OmittedForeignKeyTarget` warning instead. LIKE sources, by contrast, *are*
  pulled in (the table is unbuildable without them).
- **`warnings`** is a discriminated union on `kind`, with the values exported as the
  `DdlExtractorWarningKind` constant group (switch on those, not bare strings):
  `OmittedForeignKeyTarget` (`refTable`, `symbol?`), `OutOfScopeStatementDropped`
  (`statementType`, `range`), `UnresolvedTypeReference` (`typeName`), `DuplicateTable`
  (`table`).

  ```typescript
  import { DdlExtractorWarningKind } from '@netcracker/qubership-apihub-ddlapi'

  for (const w of slice.warnings) {
    if (w.kind === DdlExtractorWarningKind.OmittedForeignKeyTarget) {
      w.refTable // { schema, name } of the omitted FK target
    }
  }
  ```

  Output preserves source order, so a runnable input yields a runnable subset except
  for these intentionally-omitted references.

## Referential equality after a build

After a successful build the model shares object references rather than
duplicating them, so you can correlate with `===`:

- `foreignKey.refTable` is the exact `Table` instance in `schema.tables`.
- `foreignKey.columns[i]` / `refColumns[i]` are the exact `Column` instances.
- A column whose type is an enum points at the same `EnumType` instance held in
  `schema.objects`.
- An index part's `.column` is the same `Column` object as in `table.columns`.

The one exception is `CREATE TABLE … (LIKE source)`: copied columns are **fresh
`Column` objects**, though they still share the underlying type instances.

## Building schemas by hand

The `new*` and type/attr/expr factories construct the model without parsing
(`newRealm`, `newSchema`, `newTable`, `newColumn`, `columnType`, `integerType`,
`newForeignKey`, `comment`, `rawExpr`, …). They are pure constructors: **no
validation, no graph wiring, no deduplication.** Identity is your
responsibility — pass the *same* `Column` reference to `table.columns` and to
the index part / foreign key that should point at it:

```typescript
const id = newColumn('id', { type: columnType(integerType('bigint'), { null: false }) })
const users = newTable('users', { columns: [id], primaryKey: newPrimaryKey([id]) })
// users.primaryKey.parts[0].column === users.columns[0]
```

To read or edit attribute lists, use the helpers in the public API:
`findAttr(attrs, kind)`, `replaceOrAppendAttr(attrs, attr)` (immutable; keyed by
`kind`), `removeAttr(attrs, kind)`, and `underlyingExpr(expr)` (unwraps a
`NamedDefault` to its inner `Literal | RawExpr`; throws on an unknown expr kind).
