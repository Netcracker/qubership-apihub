# Extract-Table-DDL — Divergences from Plan

Running log of deviations from [extract-table-ddl-plan.md](extract-table-ddl-plan.md) made during
implementation, with rationale. Newest entries appended under each task.

## Task 1 — Span engine

- **Module name.** Plan referred to "the span engine" without a filename; implemented as
  `src/parser/spanEngine.ts`.
- **Pure-but-parser-fed tests.** The plan calls the span engine "pure"; the module itself imports
  nothing from `pgsql-parser` and operates on a `Buffer` + `StmtBoundary[]`. Its unit tests, however,
  obtain realistic byte boundaries by calling the existing `parseStatements` (rather than
  hand-computing byte offsets, which is error-prone for multibyte fixtures). The module stays pure;
  only the test feeds it real parser output.
- **Last statement without `;` — bodyEnd by whitespace-trim.** Confirmed empirically: `stmt_len` is
  `undefined` *only* for a final statement with no terminating `;` (a trailing `;` always yields a
  defined `len`). For that case `bodyEnd` is computed by trimming trailing **whitespace** from the
  buffer end. Known limitation: a trailing *comment* after a semicolon-less final statement (e.g.
  `CREATE TABLE a (...)\n-- note`) is included in that statement's body rather than stripped. This is
  rare and harmless (it only ever affects the very last statement when it both lacks `;` and has a
  trailing comment); a full backward comment-strip was judged not worth the complexity.
- **No automatic trailing newline.** Not specified by the plan. The assembled output ends exactly at
  the final statement's `;` with no trailing newline; leading/trailing file-level blank padding is
  normalized away. Within and between kept statements, bytes are preserved verbatim. Consumers that
  want a trailing newline append one.
- **Trailing-`;` re-attachment preserves source spelling.** When the source has a `;` (possibly
  preceded by whitespace, e.g. `) ;`), that exact slice `[bodyEnd, semiEnd)` is re-attached; only when
  the source omits the `;` entirely is a literal `;` synthesized.

## Task 2 — Public contract skeleton

- **Module name.** Implemented the public entry point as `src/parser/extractTableDdl.ts` (the plan's
  §2 proposed name).
- **`DdlExtractorWarning` defined up front.** The full warning union is declared in the skeleton (per
  the plan's "stable integration target" goal) even though no kind is emitted until Task 8.
- **`createTableRef` inline now, shared later.** Table-name/key derivation is done inline in Task 2
  with a `TODO(Task 4)` to fold it into the planned shared `stmtTargets.ts`. Avoids premature
  abstraction before the other statement kinds exist.
- **PARTITION OF excluded from `tables()`.** To match `buildFromDdl` (which treats
  `CREATE TABLE … PARTITION OF` as out of scope and never registers the table), discovery skips
  statements with `partbound`. Not explicit in the plan but required for parity.
- **Empty-input fast path.** `parseStatements` rejects empty/whitespace input ("Query cannot be
  empty"), so `prepareDdlExtractor` short-circuits to an empty extractor — mirroring `buildFromDdl`'s
  empty fast path.

## Task 3 — Supported-statement source of truth

- **`assertNever` lives locally in `buildFromDdl.ts`.** The plan referenced the `test/types.test.ts`
  sentinel; the runtime dispatch needs its own, so a private `assertNever` was added to
  `buildFromDdl.ts` (not exported, not in `utils.ts`, to avoid widening the public surface).
- **Switch on a typed local, not a cast expression.** To make the exhaustiveness check real, the
  dispatch switches on `const supported: SupportedStmtType = typeName as SupportedStmtType` and calls
  `assertNever(supported)` in `default` — verified that removing any case fails `tsc` with
  `'X' is not assignable to never`. (A first attempt switched on `typeName as SupportedStmtType` and
  `assertNever(typeName as never)`, which compiles regardless and does NOT enforce exhaustiveness;
  corrected.)
- **`OUT_OF_SCOPE_STMTS` deny-list removed.** Replaced by the inverted `!SUPPORTED_STMT_TYPE_SET.has`
  check. Behavior is identical (any non-supported type → `OutOfScopeStatement`), confirmed by the
  unchanged `buildFromDdl` test suite. The out-of-scope message/`statementType` now uniformly use
  `typeName || 'unknown'` (previously the deny-list branch omitted the `|| 'unknown'` fallback that
  only the `default` branch had).

## Task 4 — Statement target indexing

- **`stmtTargets.ts` is analyzer-side; handlers untouched.** Per the plan's allowance, the shared
  key derivation lives in `describeStatement` and the existing `stmtHandlers/` were NOT refactored to
  call it (too invasive for the value). A parity test asserts the derived table/type keys equal the
  keys `buildFromDdl` registers in the Realm.
- **`StatementDescriptor` carries `defines` only (no `dependsOnTypes` yet).** The plan's descriptor
  included a type-dependency field; that is added in Task 6 (the whole-AST `TypeName` walk). Kept the
  descriptor minimal until then.

## Task 5 — Basic relevance closure

- **Closure as a table worklist.** `selectForTable` uses a worklist over table keys with a
  `seenTables` guard, even though Task 5 only ever enqueues the root table. This is the extension
  point for Task 7 (LIKE pushes more table keys) and Task 6 (type statements), and gives cycle/dedup
  safety for free.
- **`ownedByTable` precomputed once.** A single `tableKey → owned descriptors` map (indexes, triggers,
  table/column/constraint comments, and index-comments resolved via `indexKey → table`) is built in
  `prepareDdlExtractor` so each `extractTable` is a cheap map lookup.
- **Inline-constraint index comments — RESOLVED (was deferred).** Initially `COMMENT ON INDEX` was
  attributed to a table only for standalone `CREATE INDEX`. Per code review, the table descriptor now
  also carries `constraintIndexNames` (names of *named* `UNIQUE` constraints, inline column +
  table-level), and `buildOwnedByTable` maps `schema.constraintName → table`. PRIMARY KEY constraint
  names remain excluded, matching buildFromDdl (which does not register PK indexes for COMMENT
  lookup).

## Task 6 — Type-dependency closure

- **`TypeName` detected structurally, not by field name.** libpg_query stores a `TypeName` payload
  *directly* under a `typeName` field (e.g. `ColumnDef.typeName`, `TypeCast.typeName`) — NOT always
  wrapped as `{ TypeName: … }` (the wrapped form appears only in generic Node positions like a range
  subtype or `COMMENT ON TYPE`). The whole-AST walk identifies a payload structurally (`names[]` +
  `typemod`), which the recursion reaches in both forms. (First implementation matched only the
  wrapped `{ TypeName }` key and missed every column type; corrected.)
- **`TypeRef` carries `{ key, rawName }`.** Each reference keeps both its resolved `schema.type` key
  (for the closure) and the as-written name (for Task 8's `UnresolvedTypeReference` / denylist), so
  Task 8 need not re-walk the AST.
- **Type refs collected for table, type, index, AND trigger statements.** (Revised per code review —
  initially only table + type-definition statements were walked, which missed types used in an
  included index's expression/predicate or a trigger's `WHEN` clause, e.g.
  `CREATE INDEX idx ON t ((s::mood))`. The closure now enqueues type refs for every *owned* statement
  too, so such types are pulled in.) The `owningSchemaOf` helper scopes bare names by the statement's
  table (index/trigger) or own (table/type) schema. Comments carry no type refs.

## Task 7 — LIKE closure

- **LIKE sources carried on the table descriptor.** `describeStatement` extracts `TableLikeClause`
  relations into `DefinedObject.table.likeSources`; the closure enqueues them onto the same table
  worklist (so a LIKE source gets the full Task 5/6 closure). No new traversal machinery — the
  `seenTables` guard already handles chains and `A LIKE B` / `B LIKE A` cycles.

## Task 8 — Warnings

- **FK refs carried on the table descriptor** (`DefinedObject.table.foreignKeys`), extracted from
  inline column + table-level `CONSTR_FOREIGN` constraints, mirroring the createTable handler.
- **`OmittedForeignKeyTarget` fires for *any* FK whose target is not in the slice** — including when
  the target table exists elsewhere in the DDL (FK targets are excluded by design). A self-FK or an
  FK to an included LIKE source does not warn (target is in `includedTables`). FK warning `range` is
  the owning CREATE TABLE's range (the plan allowed "FK clause / owning CREATE TABLE").
- **`knownTypeNames.ts` denylist.** New module with the builtin set (typeMapper's pg_catalog names +
  serial aliases + common bare SQL spellings) and an extension set (citext, hstore, ltree, lquery,
  ltxtquery, vector, geometry, geography, cube, earth, isn-family…). `isKnownTypeName` returns false
  for any dotted (schema-qualified) name — those are always user types. Documented as extensible.
- **Dropped-statement scan is generic, not AlterTable-specific.** `droppedRelationKeys` reads a
  `.relation` (direct or wrapped RangeVar) and a `.relations[]` array off any unsupported statement
  body, covering `AlterTableStmt`, `TruncateStmt`, `RuleStmt`, etc. Statements with no obvious
  relation (sequences, functions) simply do not produce the warning — matching the plan's best-effort
  scope. A dropped statement with no resolvable `stmt_len` range (last statement) is skipped.
- **Warnings attributed to every included table**, not only the root — so a dropped `ALTER TABLE` or
  an omitted FK target on an included LIKE source also surfaces.

## Task 9 — Docs & final integration

- **`ddlapi-using` skill updated at source, not recompiled.** A new "Extracting per-table DDL
  subsets" section was added to `agent-packages/ddlapi-using/.apm/skills/ddlapi-using/SKILL.md` (the
  APM source of truth). `apm` is not available in this environment, so the compiled
  `.claude/skills/ddlapi-using/SKILL.md` was NOT regenerated — **run `apm compile` to propagate**
  (matches the repo's existing "apm compile" commit cadence).
- **No new `.sql` fixtures.** All extractor tests use inline multi-statement SQL (per the
  ddlapi-testing guidance for cross-statement behaviour), so `sqlSamples.test.ts` is unaffected.

## Testing strategy — exact-form assertions

Relevance/type/LIKE/warning/e2e extractor tests assert the **exact** extracted SQL (`toBe`) against
**literal expected text**, not substrings and not a computed oracle. Each test writes the input DDL
and the expected slice as plain template-literal strings, so both are directly readable and
verifiable. This pins **inclusion, exclusion, and source order** in one assertion — substring checks
(`toContain`) silently passed on over-inclusion or wrong order. (An earlier version used an
`expectedSlice(stmts, keptIndices)` oracle; it was replaced with literal text because the slice
indices were hard to verify by reading — and writing the literal output immediately caught a wrong
seam in one expectation.)

**Behavior this surfaced — reviewed and kept (user decision):** a section-style comment that
*directly* precedes a pulled-in dependency is included with it. E.g. `-- Enumerations\nCREATE TYPE
order_status …` — when a table uses `order_status`, the `-- Enumerations` line comes along, because
the comment is structurally adjacent (no blank line) to that statement. This is consistent with the
run-head comment rule (directly-touching comments are kept); it can pull a file-level section header
into a slice. Considered and **intentionally kept** as-is — current behavior is locked by the e2e
exact-form tests.

## Final state

All 9 tasks complete, plus two code-review follow-ups and an exact-form test pass. `tsc --noEmit`
clean, `vite build` succeeds (new public API present in `dist/index.d.ts`), full suite green:
**372 tests, 13 suites**. New source files:
`spanEngine.ts`, `extractTableDdl.ts`, `stmtTargets.ts`, `supportedStatements.ts`,
`knownTypeNames.ts`. New tests: `spanEngine.test.ts`, `extractTableDdl.test.ts`,
`stmtTargets.test.ts`, `supportedStatements.test.ts`. `buildFromDdl.ts` refactored to consume the
shared supported-statement list with compile-time exhaustiveness.
