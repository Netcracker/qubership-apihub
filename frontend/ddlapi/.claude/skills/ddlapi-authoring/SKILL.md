---
name: ddlapi-authoring
description: Use when adding or changing types, factories, parser handlers, or resolution logic inside the ddlapi library — the rules that keep the model faithful to its Atlas-Go origin and the parser's two-pass contract intact.
---

# Authoring ddlapi

ddlapi is a TypeScript port of the Atlas Go schema model
(`atlas/sql/schema/schema.go`, vendored under `../atlas/`) plus a PostgreSQL
DDL → model builder. The model layer is driver-neutral; PostgreSQL specifics
live only in the parser. These rules are what the type system and the godoc of
`pgsql-parser` will not tell you.

## The model mirrors Atlas Go on purpose

The TypeScript structures are a deliberate, traceable translation of the Go
source. Keep the correspondence visible so a reader can hold both side by side:

- Single-letter Go exported fields (`T string`, `V string`, `X Expr`, `C *Column`)
  get descriptive TypeScript names (`type`, `value`, `expr`, `column`). The
  Atlas Go origin is documented as an inline comment on each field, e.g. `/* Atlas Go: T string */`.
- A Go pointer used for optionality (`*int`, `*Struct`, `nil` = absent) becomes
  an optional field (`field?: number`) — omitted when absent, never `null`.
- Back-reference pointers (`table.Schema`, `index.Table`, `column.indexes`) are
  **kept as commented-out fields**, not deleted — e.g. `// schema?: Schema`.
  Do not wire live back-references; the model is navigated top-down only
  (Realm → Schema → Table → Column). A consumer always has the parent in scope.

When you port a new Go type, follow the same shape and leave the back-ref
comment in place.

## Marker interfaces → discriminated unions

Go groups types with empty marker methods (`obj()`, `typ()`, `expr()`,
`attr()`). TypeScript replaces each with a `kind` string discriminant and a
matching constant group: `ObjectKind`, `TypeKind`, `ExprKind`, `AttrKind` for
driver-neutral core kinds in `constants.ts`; `PgAttrKind`, `PgObjectKind`,
`PgTypeKind` for PostgreSQL escape-hatch kinds in `postgres.constants.ts`.
Rules when extending a union:

- Add the literal to the relevant constant group; reference it from the
  interface (`kind: typeof TypeKind.Foo`) so the string is defined once.
- A type that plays several roles reuses the **same string** across groups —
  `Check` is in both `ObjectKind` and `AttrKind`; `EnumType` is in both
  `ObjectKind` and `TypeKind`; `NamedDefault` is an `Expr` and a `SchemaObject`
  but carries `ObjectKind.NamedDefault` as its `kind` (there is no
  `ExprKind.NamedDefault`). The `test/types.test.ts` exhaustiveness check
  asserts these cross-group equalities — keep them aligned.

## Extend via the escape hatch, never the core union

Each union reserves an open `Unknown*` member shaped
`{ kind: string; [key: string]: unknown }` (`UnknownType`, `UnknownExpr`,
`UnknownAttr`, `UnknownObject`). This is the TypeScript stand-in for Go's open
interfaces. The hard rule:

> Dialect-specific or PostgreSQL-only constructs are emitted as `Unknown*`
> values with a stable `kind` string. **Do not add PostgreSQL members to the
> core unions** in `types.ts` / `attrs.ts` / `schema.ts`.

The parser already follows this: domains are `kind: 'pg:domain'` objects
(`createDomain.ts`), identity columns are `kind: 'Identity'`, partitions are
`kind: 'Partition'`, and so on. (A `DomainType` was once planned as a core
dual-role type and deliberately reverted to the `'pg:domain'` escape hatch to
keep the core driver-neutral — do not reintroduce it into the core union.)

`UnsupportedType` is the one core type that names an un-modelled dialect type
(`unsupportedType('interval')`): use it for SQL types with no generic
representation, and store the raw spelling in `type`. Use `Unknown*` for
everything that is not a column *type* (attrs, objects, exprs).

The `kind` string is also the identity key for `replaceOrAppendAttr` /
`removeAttr` in `utils.ts` (Go keys on `reflect.TypeOf`; we have no runtime
type identity, so the string is it). Two distinct dialect attrs that share a
`kind` string would collide — give every `Unknown*` attr a unique, stable
`kind`.

## Factories are pure and omit absent fields

Factory functions in `factories.ts` do no validation and never wire the object
graph (no back-refs, no dedup, no cloning — identity is the caller's job).
Match the existing construction pattern exactly: spread optional fields only
when defined, so the output object has no `field: undefined` keys.

```typescript
export function integerType(type: string, opts?: { unsigned?: boolean; attrs?: Attr[] }): IntegerType {
  return {
    kind: TypeKind.IntegerType,
    type,
    ...(opts?.unsigned !== undefined && { unsigned: opts.unsigned }),
    ...(opts?.attrs !== undefined && { attrs: opts.attrs }),
  }
}
```

An absent array is `undefined`, never `[]`. `buildRealm()` and the handlers
rely on this (`...(tables.length > 0 && { tables })`).

## The parser is a strict two-pass pipeline

`buildFromDdl` (`src/parser/buildFromDdl.ts`) orchestrates:

1. **Pass 1 — dispatch.** Each `RawStmt` is routed by its type-name key to a
   handler in `stmtHandlers/`. Handlers share the signature
   `(stmt, rawStmt, schemaName, acc, onError)`: they build model objects,
   register them in the `SchemaAccumulator`, and queue cross-statement work on
   the accumulator's pending lists (`pendingLikes`, `pendingFKs`,
   `pendingIndexParts`, `orphanIndexes`). Names not in scope hit
   `OUT_OF_SCOPE_STMTS` or the `default` branch and emit `out-of-scope-statement`.
2. **Pass 2 — `resolveReferences`.** Runs after every statement is parsed, in a
   **fixed order that must be preserved**: LIKE expansion → column-type upgrade
   (`UnsupportedType` → registered type) → orphan index re-attachment →
   foreign-key resolution → index-part column resolution. In-place mutation is
   fine here because the Realm has not been returned yet.

When you add a construct that can reference another statement, register a
pending entry in pass 1 and resolve it in the correct pass-2 step — never try
to resolve forward references inside a handler.

Registry keys are normalised qualified names: `"schema.table"`,
`"schema.table.column"`, `"schema.typeOrIndex"`. Build keys from
`strVal()` output (see below) so they match PostgreSQL name resolution.

## Parser boundaries you must not cross

- **`pgParser.ts` is the only file that imports `pgsql-parser`.** It lazily
  initialises the libpg_query WASM via a module-level singleton and a dynamic
  `import()` so consumers who never call `buildFromDdl` don't bundle the WASM.
  Route any new parser-library use through here; to swap parsers, change only
  this file.
- **`strVal()` in `astHelpers.ts` is the single entry point for raw AST
  identifier strings.** pgsql-parser's lexer already folds unquoted identifiers
  to lower-case and preserves quoted case, mirroring PostgreSQL. Form every
  registry key and stored name from `strVal()` so normalisation stays in one
  place. Deparsing back to SQL text goes through `exprToString` / `nodeToExpr`
  (both wrap `deparseSync`).
- **Public surface is `src/index.ts` only.** Everything under `src/parser/`
  except the handful re-exported from `buildFromDdl.ts` (`buildFromDdl`,
  `DdlParseError`, `DdlBuildError`, `DdlNonFatalError`, `BuildFromDdlOptions`)
  and `SourceRange` from `positions.ts` is private. Never let `@pgsql/types`
  or `pgsql-parser` types appear in an exported signature.

## Error contract

Non-fatal issues are reported through `onError` with a machine-readable `kind`
from `DdlErrorKind` (`out-of-scope-statement`, `unresolved-reference`,
`duplicate-object`, `unresolved-like-source`) and a human message; the build
continues and returns a partial Realm. Only a hard syntax failure throws
(`DdlParseError`). Two intentional asymmetries to preserve:

- A forward-referenced `CREATE INDEX` (table defined later) is resolved
  **silently** in pass 2 — no error. An unresolved **foreign key** *does* emit
  `unresolved-reference`.
- `onError` messages carry the statement type name, never the raw SQL text.

## Type mapping

`typeMapper.ts` maps a `pg_catalog` type name to a core `SchemaType`; anything
unrecognised (including unqualified user-defined type names) returns
`unsupportedType(name)`, which pass 2 upgrades if the name was later registered
in `typeRegistry`. Add new built-in mappings inside `pgCatalog()`; leave the
`unsupportedType` fallback as the catch-all for the pass-2 upgrade path.
