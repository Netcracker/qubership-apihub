# qubership-apihub-ddlapi

A TypeScript library for working with relational database schemas as structured, in-memory data. It parses
PostgreSQL DDL into a driver-neutral schema model, lets you build that model by hand with typed factories, and
slices a multi-table DDL script into the minimal verbatim SQL relevant to each table.

The model is a TypeScript port of the [Atlas](https://atlasgo.io/) Go schema model
(`atlas/sql/schema/schema.go`), adapted to idiomatic TypeScript and extended with a PostgreSQL escape hatch for
dialect-specific details that have no driver-neutral representation.

## Features

- **Database schema model** — a driver-neutral tree (`Realm` → `Schema` → `Table` → `Column`, plus indexes,
  foreign keys, types, constraints, comments). Nodes are plain mutable objects; the union members
  (`SchemaObject`, `SchemaType`, `Attr`, `Expr`) carry a `kind` discriminant, so the model serializes cleanly to
  JSON. See [`src/schema.ts`](src/schema.ts), [`src/types.ts`](src/types.ts), [`src/attrs.ts`](src/attrs.ts), and
  [`src/exprs.ts`](src/exprs.ts).
- **Build from DDL** — `buildFromDdl(ddl)` parses PostgreSQL DDL (via the WASM
  [`libpg-query`](https://www.npmjs.com/package/libpg-query)) and returns a fully-wired `Realm`, resolving
  cross-statement references (FK targets, enum/domain types, `LIKE` sources) into shared object instances. See
  [`src/parser/buildFromDdl.ts`](src/parser/buildFromDdl.ts).
- **DDL slicer** — `prepareDdlExtractor(ddl)` indexes a multi-table script once, then returns the minimal
  **verbatim** DDL subset for any single table — its `CREATE TABLE` plus the indexes, triggers, comments, and
  (transitively) the user types it depends on. See [`src/parser/extractTableDdl.ts`](src/parser/extractTableDdl.ts).
- **Typed factories** — pure constructors (`newTable`, `newColumn`, `integerType`, `newForeignKey`, …) to build
  the model without parsing. See [`src/factories.ts`](src/factories.ts).
- **PostgreSQL escape hatch** — dialect-specific details (identity columns, partitioning, exclusion constraints,
  domains, range/composite types, trigger metadata, …) carried as `{ kind: string; … }` objects keyed by stable
  `Pg*Kind` constants. See [`src/postgres.constants.ts`](src/postgres.constants.ts).

## Installation

```bash
npm install @netcracker/qubership-apihub-ddlapi
```

The package ships dual ESM/CJS builds with type declarations. The model runs anywhere. The `/parser` entry runs
in Node.js (it reads its WASM from `node_modules`) and in the browser (a self-contained build with the WASM
inlined, so no bundler plugins are needed).

## Quick start

```typescript
import { buildFromDdl } from '@netcracker/qubership-apihub-ddlapi/parser'

const realm = await buildFromDdl(`
  CREATE TABLE public.users (
    id     bigint PRIMARY KEY,
    email  varchar(255) NOT NULL,
    status text
  );
  CREATE UNIQUE INDEX users_email_idx ON public.users (email);
`)

const users = realm.schemas[0].tables?.find(t => t.name === 'users')
console.log(users?.columns?.map(c => c.name)) // ['id', 'email', 'status']
```

`buildFromDdl` is `async` — the first call initializes the parser's WASM module.

## The schema model

There are **no back-references**: you navigate the tree top-down and keep the parent in scope if you need it. A
`Table` has no `.schema`; a `Column` has no `.table`.

```text
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

Discriminate every union node on its `kind` using the exported constant groups — `TypeKind`, `AttrKind`,
`ExprKind`, `ObjectKind` for core nodes; `PgAttrKind`, `PgObjectKind`, `PgTypeKind` for PostgreSQL escape-hatch
nodes — rather than bare string literals, and always handle the open `default` branch:

```typescript
import { TypeKind } from '@netcracker/qubership-apihub-ddlapi'

switch (column.type?.type.kind) {
  case TypeKind.IntegerType: /* type: 'smallint' | 'integer' | 'bigint' | … */ break
  case TypeKind.StringType:  /* type, size? */ break
  case TypeKind.EnumType:    /* values: string[] */ break
  default:                   /* UnknownType — a PostgreSQL escape-hatch detail */ break
}
```

### Core vs PostgreSQL extensions

The core unions (`SchemaType`, `Attr`, `Expr`) are **closed and driver-neutral**. Anything PostgreSQL-specific
with no generic representation passes through as an escape-hatch object — an `Unknown*` member of the union shaped
`{ kind: string; … }`. Recognize it by its `kind` (use the `Pg*Kind` constants) and cast to read the extra
fields. The escape-hatch kinds `buildFromDdl` emits — identity columns, partitioning, inheritance, storage
params, index options, exclusion constraints, composite/range types, domains, and triggers — are documented in
the [`ddlapi-using` skill](agent-packages/ddlapi-using/.apm/skills/ddlapi-using/SKILL.md).

`UnsupportedType` is **not** the escape hatch — it is a core `SchemaType` member representing a column type with
no generic mapping (e.g. `interval`, `xml`, `money`, array types, or an unresolved user type). Its `type` holds
the raw type name.

### Reading values

- **Compare on `column.type.type` (the `SchemaType`), not `raw`.** `SchemaType.type` is canonicalized
  (`int`/`int4` → `'integer'`; `timestamptz` collapses the timezone), so semantically-equal DDL compares equal.
  `ColumnType.raw` is the original spelling and is frequently absent on a parsed column.
- **`ColumnType.null` is a tri-state.** `false` = `NOT NULL` written; `true` = `NULL` written explicitly;
  `undefined` = no nullability clause in the DDL. Do not collapse `undefined` to "nullable" without deciding what
  an absent clause means for your use case.
- **`Expr` values are raw SQL text.** `Literal.value` keeps the verbatim token (a string literal includes its
  quotes); `RawExpr.expr` is the expression source (e.g. `'now()'`).

## Building schemas by hand

The factories in [`src/factories.ts`](src/factories.ts) construct the model without parsing. They are **pure
constructors — no validation, no graph wiring, no deduplication.** Object identity is your responsibility: pass
the *same* `Column` reference everywhere it should appear.

```typescript
import { newColumn, columnType, integerType, newTable, newPrimaryKey } from '@netcracker/qubership-apihub-ddlapi'

const id = newColumn('id', { type: columnType(integerType('bigint'), { null: false }) })
const users = newTable('users', { columns: [id], primaryKey: newPrimaryKey([id]) })
// users.primaryKey.parts[0].column === users.columns[0]
```

Helpers for working with attribute lists and expressions live in [`src/utils.ts`](src/utils.ts): `findAttr`,
`replaceOrAppendAttr` (immutable, keyed by `kind`), `removeAttr`, and `underlyingExpr` (unwraps a `NamedDefault`
to its inner `Literal | RawExpr`).

## DDL slicer

`prepareDdlExtractor` is a separate entry point for slicing a multi-table DDL script into a **verbatim** SQL
subset per table — distinct from `buildFromDdl`, which builds the structured `Realm`. Use it when you need the
*original SQL text* relevant to one table, not a model.

```typescript
import { prepareDdlExtractor } from '@netcracker/qubership-apihub-ddlapi/parser'

const extractor = await prepareDdlExtractor(ddl)   // heavy work once (async, WASM)
for (const ref of extractor.tables()) {            // { schema, name }, in source order
  const slice = extractor.extractTable(ref)!       // cheap, synchronous, repeatable
  slice.sql        // verbatim CREATE TABLE + its indexes, triggers, comments,
                   // the types it uses (transitively), and any LIKE source
  slice.warnings   // structured notes about omitted dependencies, etc.
}
```

- **Two-phase by design.** `prepareDdlExtractor` parses once; each `extractTable` is synchronous.
- **Pass an already-normalized `TableRef`.** Lookup is a direct key match — identifiers must be in model-normalized
  form (unquoted → lowercase, quoted → preserved), exactly as `tables()` returns them. Use `'public'` for
  unqualified tables. `undefined` is a lookup miss, not a failure.
- **FK targets are excluded on purpose** (you get an `OmittedForeignKeyTarget` warning); `LIKE` sources, by
  contrast, *are* pulled in, since the table is unbuildable without them.
- **`warnings`** is a discriminated union keyed by the `DdlExtractorWarningKind` constants:
  `OmittedForeignKeyTarget`, `OutOfScopeStatementDropped`, `UnresolvedTypeReference`, `DuplicateTable`.

## Error handling

`buildFromDdl` separates hard failures from non-fatal issues:

- **Hard failure** (invalid PostgreSQL syntax) → the promise rejects with `DdlParseError`.
- **Non-fatal issues** → reported through an `onError` callback and/or, with `{ strict: true }`, collected and
  thrown as `DdlBuildError` after the build. `DdlNonFatalError.kind` is one of `out-of-scope-statement`,
  `unresolved-reference`, `duplicate-object`, or `unresolved-like-source`.

Non-fatal issues never abort the build — unresolved references are left `undefined` and a **partial** `Realm` is
still returned (exposed as `DdlBuildError.realm`). **Absence of `onError` does not imply the `Realm` is
complete** — use `{ strict: true }` for pipelines that require completeness.

```typescript
import { buildFromDdl, DdlParseError, DdlBuildError } from '@netcracker/qubership-apihub-ddlapi/parser'

try {
  const realm = await buildFromDdl(ddl, { strict: true })
} catch (err) {
  if (err instanceof DdlParseError) { /* invalid SQL */ }
  else if (err instanceof DdlBuildError) { err.issues /* all issues */; err.realm /* partial Realm */ }
}
```

## Assumptions and limitations

- **PostgreSQL dialect only.** Parsing is backed by the PostgreSQL grammar (`libpg-query`). MySQL-style syntax
  such as per-column `CHARACTER SET` is rejected as a hard `DdlParseError`. (The `Charset` attr exists in the core
  model for Atlas-Go parity but is never produced from real DDL.)
- **`CREATE` statements only.** Only these top-level statements are parsed:
  `CREATE TABLE`, `CREATE [UNIQUE] INDEX`, `CREATE TYPE` (enum / composite / range), `CREATE DOMAIN`,
  `CREATE TRIGGER`, and `COMMENT ON`. Everything else — `ALTER`, `DROP`, `CREATE VIEW`/`SEQUENCE`/`EXTENSION`/
  `FUNCTION`, DML, `CREATE TABLE … PARTITION OF …` — is reported as an `out-of-scope-statement` issue and skipped.
  The supported set is the single source of truth in
  [`src/parser/supportedStatements.ts`](src/parser/supportedStatements.ts); the slicer's scope matches it exactly.
- **Views are not modeled from DDL.** The `View` type exists in the model, but there is no `CREATE VIEW` handler,
  so `buildFromDdl` never populates views (a `CREATE VIEW` statement is reported as out-of-scope).
- **Identifiers follow PostgreSQL case-folding.** Model identifiers are whatever the PostgreSQL parser yields —
  unquoted names come back lowercased, quoted names are preserved verbatim. The slicer's `extractTable` does a
  direct key lookup and expects a `TableRef` already in that form (use `'public'` for unqualified tables).

## API surface

The public API is split across two entries; import from whichever you need, and never from internal module paths
(they are unstable).

- **`@netcracker/qubership-apihub-ddlapi`** — the parser-free **data model**: the schema model types, the `Pg*` and
  core `*Kind` constants, the factories, and the `utils` helpers. Re-exported from [`src/index.ts`](src/index.ts).
- **`@netcracker/qubership-apihub-ddlapi/parser`** — the WASM-bearing **parser**: `buildFromDdl` (with
  `DdlParseError`, `DdlBuildError`, `BuildFromDdlOptions`, `DdlNonFatalError`) and `prepareDdlExtractor` (with
  `DdlExtractor`, `TableRef`, `TableDdlSlice`, `DdlExtractorWarning`, `DdlExtractorWarningKind`), plus `SourceRange`.
  Re-exported from [`src/parser.ts`](src/parser.ts).

```typescript
import { newTable, TypeKind /* … */ } from '@netcracker/qubership-apihub-ddlapi'
import { buildFromDdl, prepareDdlExtractor } from '@netcracker/qubership-apihub-ddlapi/parser'
```

The split keeps the parser and its ~1.1 MB WASM out of code that only needs the model — import `/parser` **only**
where you actually parse DDL. `Realm` and every model type come from the root; the value `buildFromDdl` returns is
still typed via the root.

## Development

```bash
npm run build       # bundle dual ESM/CJS + type declarations (vite)
npm test            # run the Jest suite
npm run typecheck   # tsc --noEmit
```

Implementation plans and design notes for the model, the DDL builder, and the table slicer live in
[`docs/plans`](docs/plans). Contributor-facing conventions for changing the library live in the `ddlapi-authoring`
and `ddlapi-testing` skills under [`agent-packages`](agent-packages).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md), [CODE-OF-CONDUCT.md](CODE-OF-CONDUCT.md), and [SECURITY.md](SECURITY.md).
