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
- **`assertNever` exhaustiveness must discriminate on a value *typed as the union*.**
  Write `const k: SupportedStmtType = x; switch (k) { … default: assertNever(k) }`.
  Switching on a cast *expression* (`switch (x as SupportedStmtType)` with
  `assertNever(x as never)`) compiles but enforces nothing — the residual in `default`
  is never checked, so a missing case is not caught. This guards the `buildFromDdl`
  dispatch and the `SUPPORTED_STMT_TYPES` list (built from `PgNode` in
  `supportedStatements.ts`).

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

**Escape-hatch attr fields use descriptive names, not Atlas single letters.**
The PG attrs are emitted as `Unknown*` object literals with no interface, so
their fields are never type-checked. They deliberately use descriptive names —
`Partition.type`, `IndexType.type`, `IndexPredicate.predicate`,
`IndexNullsDistinct.value` — instead of the Atlas Go single letters (`T`, `P`,
`V`) that the core model carries with `/* Atlas Go: … */` comments. This is an
intentional divergence for consumer readability; do **not** restore the
single-letter spellings to match the Go source. Because there is no interface,
`tsc` cannot catch drift — keep the parser emission sites, the api-unifier
dialect rules, and the `ddlapi-using` field table in sync by hand.

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

- **`pgParser.ts` is the only file that imports the parser.** It imports `parse`
  from `libpg-query` directly (not through the old `pgsql-parser` wrapper);
  deparsing imports `deparseSync` from `pgsql-deparser`. Route any new
  parser-library use through `pgParser.ts` / the deparse helpers; to swap parsers,
  change only those.
- **`strVal()` in `astHelpers.ts` is the single entry point for raw AST
  identifier strings.** libpg-query's lexer already folds unquoted identifiers
  to lower-case and preserves quoted case, mirroring PostgreSQL. Form every
  registry key and stored name from `strVal()` so normalisation stays in one
  place. Deparsing back to SQL text goes through `exprToString` / `nodeToExpr`
  (both wrap `deparseSync`).
- **Two public entries — keep the model root parser-free.** `src/index.ts` is the
  **model** entry (types, `kind` constants, factories, utilities); `src/parser.ts`
  is the `/parser` entry (`buildFromDdl`, `DdlParseError`, `DdlBuildError`,
  `DdlNonFatalError`, `BuildFromDdlOptions`, `prepareDdlExtractor` +
  `DdlExtractor…`, `SourceRange`). The model root must never reach `pgParser`,
  `buildFromDdl`, the compare/extract paths, or `libpg-query` / `pgsql-deparser` —
  a `postbuild` guard (`scripts/assert-model-entry-parser-free.mjs`) fails the
  build if it does. Everything under `src/parser/` except what these two entries
  re-export is private; never let `@pgsql/types` or parser-library types appear in
  a model-root signature.
- **`/parser` is dual-built** (`vite.config.ts` + `vite.browser.config.ts`): the
  default/Node build externalizes `libpg-query` (Node reads the WASM from
  `node_modules` via `fs`); the `browser`-condition build bundles it and inlines
  the WASM as `wasmBinary` (see `vite-libpg-query-inline-wasm.plugin.ts`) so
  browser consumers need no libpg-query plugins. Keep both configs and the
  `exports` conditions in sync when touching the parser entry or its deps.

## Reading the AST — prefer typed access over `Record<string, unknown>`

`@pgsql/types` types the libpg_query AST well; lean on it instead of casting to
`Record<string, unknown>`.

- **`Node` is a union of single-key wrappers** (`{ ColumnDef: ColumnDef } | { Constraint: Constraint } | …`),
  so it cannot be indexed generically. Unwrap a wrapped node to its typed payload
  with **`unwrapNode(node, key)`** (`astHelpers.ts`), which returns `NodeValue<K>`;
  **`stmtBody(rawStmt, key)`** is the same for a statement body. Both replace the old
  `(x as Record<string, unknown>)['Key']` pattern and keep call sites cast-free.
- **AST string literals live in `pgAst.ts`:** `PgNode` (node-type keys such as
  `ColumnDef`, `Constraint`, `DefElem`, `RangeVar`), `PgConstrType` (`Constraint.contype`),
  `PgCommentObject` (`CommentStmt.objtype`). Use them for bracket access and comparison —
  a raw-string typo silently returns `undefined` / never matches, whereas a constant is
  checked against the typed field by `tsc`. (That check is what proved `ConstrType` has
  **no** `CONSTR_COLLATION` — COLLATE is a `ColumnDef.collClause`, not a constraint.)
- **Reserve `Record<string, unknown>`** for genuine whole-tree traversal of unknown nodes
  and for `deparseSync(node as Record<string, unknown>)` (its loose parameter). Don't reach
  for it to read a *typed* field: `RangeVar` has `relname`/`schemaname`; list fields
  (`tableElts`, `constraints`, `typeName`, `params`, …) are `Node[]`; `Constraint` carries
  `contype`/`generated_when`/`options`/`pktable`. `(x ?? []) as Node[]` and
  `con.pktable as { relname?; schemaname? }` are redundant — drop them.
- **`TypeName` appears in two shapes.** In a generic Node slot (a range subtype, the
  `COMMENT ON TYPE` object) it is wrapped `{ TypeName: payload }`; under a `typeName`
  **field** (`ColumnDef.typeName`, `TypeCast.typeName`) it is the payload **directly**, with
  no wrapper. Unwrapping only by the `TypeName` key misses the direct form. When walking the
  tree generically, detect a `TypeName` payload structurally — it has a `names: Node[]` array
  and a `typemod` field.

## Reading scalars from the AST — protobuf zero-omission

`pgsql-parser` hands back libpg_query's protobuf as plain JSON, and protobuf
**omits any scalar field equal to its zero value**. An integer `0`, a boolean
`false`, and an empty string never appear — only the wrapper object survives:

- `DEFAULT 0` → `A_Const.ival = {}` (the inner `ival: 0` is gone)
- `DEFAULT false` → `A_Const.boolval = {}`
- `timestamp(0)` → the typmod node is `A_Const { ival: {} }`

So a truthiness check or a `?.['ival'] ?? ''` fallback silently turns a real
`0` into `''`/`undefined`. The wrapper's *presence* already proves the value's
type, so distinguish "wrapper absent" (field not set) from "wrapper present,
inner omitted" (value **is** the zero) and supply the zero yourself:

```typescript
// integer literal — nodeToExpr (astHelpers.ts), low-level Record access
if (c['ival']) return literal(String((c['ival'] as Record<string, unknown>)['ival'] ?? 0))

// integer scalar — typeMapper.ival, low-level Record access
if (!c || !('ival' in c)) return undefined          // not an integer const
const iv = (c['ival'] as Record<string, unknown>)['ival']
return typeof iv === 'number' ? iv : 0               // inner omitted ⇒ 0
```

The low-level extractors (`strVal`, `nodeToExpr`, `typeMapper.ival`) keep this raw
`Record` form on purpose. Everywhere else, the same lesson holds through the typed
`unwrapNode` helper — e.g. `createTable.constIval` does
`const c = unwrapNode(node, PgNode.A_Const); const iv = c?.ival?.ival` — because
`c.ival` is a present `Integer` whose inner `ival` is *still* omitted for zero, the
`typeof iv === 'number' ? iv : 0` guard stays.

The same trap covers `boolval` (omitted ⇒ `false`). `fval` is the exception —
it is stored as a non-empty string even for `0.0`, so it is never omitted.
Reading a boolean as `node.flag && { flag: true }` is already correct: an
omitted `false` *should* mean absent. The bug bites only when a zero is itself
meaningful — a `0`/`false` default, `timestamp(0)` precision, `START WITH 0`.

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
