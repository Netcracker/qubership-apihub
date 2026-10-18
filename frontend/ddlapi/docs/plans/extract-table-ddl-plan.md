# Extract-Table-DDL Implementation Plan

## Goal

Add an API to `@netcracker/qubership-apihub-ddlapi` that, given a PostgreSQL DDL string, a schema
name, and a table name, returns a **subset of the original DDL** containing only the statements
relevant to that table — reproduced **as close to the input as possible, character-for-character**
(same line breaks, indentation, comments, casing).

Only statement types that `buildFromDdl` itself supports are eligible for extraction. The output is
itself valid, build-able DDL for that table (with the deliberate exceptions noted under
[Relevance rules](#relevance-rules)).

### Primary use case → design constraint

The consumer holds one DDL file containing many tables and iterates over **every table**, asking for
each table's DDL in turn. Therefore all expensive work (WASM parse, statement indexing, dependency
graph construction) must happen **once per DDL** and be reused across many per-table extractions.
The API is split into a one-time `prepare` step and a cheap, repeatable `extract` step.

---

## 1. Public API shape

A two-phase API mirroring the heavy-prepare / cheap-reuse split.

```typescript
/**
 * Parses the DDL once and builds a reusable index of statements, their source
 * ranges, the object each defines, and the type-dependency graph.
 * Async because the underlying parser initialises a WASM module.
 *
 * No options parameter in v1 — there are no tuning knobs yet. Add an options
 * object only when a real option exists, to avoid a weak empty-interface contract.
 */
export async function prepareDdlExtractor(ddl: string): Promise<DdlExtractor>

/** A schema-qualified table identity, using normalized model identifiers. */
export interface TableRef {
  schema: string
  name: string
}

export interface DdlExtractor {
  /** Every table discovered, for convenient iteration by the consumer. */
  tables(): readonly TableRef[]

  /**
   * Returns the minimal DDL subset relevant to `table`, copied verbatim from the
   * original source. Synchronous and cheap — call once per table.
   *
   * Returns `undefined` for a *lookup miss* — a table with no CREATE TABLE in the
   * DDL. This is NOT an extraction failure: all hard failures happen in
   * `prepareDdlExtractor` (which throws), and every non-fatal issue is a `warning`
   * on the returned slice.
   */
  extractTable(table: TableRef): TableDdlSlice | undefined
}

export interface TableDdlSlice {
  /** Echoes the requested table identity. */
  table: TableRef
  /** The extracted DDL text. */
  sql: string
  /** Machine-readable notes about deliberately-omitted dependencies, etc. */
  warnings: readonly DdlExtractorWarning[]
}
```

`extractTable` is **synchronous** (all parsing happens in `prepareDdlExtractor`). A `TableRef` is
passed by value, so `extractTable(extractor.tables()[0])` is the natural iteration path and there is
no way to accidentally swap the schema and table arguments. The return shape is intentionally
minimal — `sql` + `warnings` only; consumers that need structure re-parse the slice (e.g. via
`buildFromDdl`).

#### Identifier semantics (precise contract)

`extractTable` accepts **normalized model identifiers exactly as returned by `tables()` / the
`Realm`** — i.e. already case-folded by the parser (unquoted → lowercase; quoted → preserved). The
extractor performs **no SQL-identifier parsing or re-folding** on caller-provided strings: it does a
direct key lookup. (Re-folding would be wrong for quoted mixed-case identifiers like `"MyTable"`.)
The typical caller obtained the names from a prior `buildFromDdl` pass, so they already match. A
caller that hand-writes a name must pass it in normalized form.

### 1a. Diagnostics model — two tiers

- **Prepare tier:** `prepareDdlExtractor` **throws `DdlParseError`** on hard parse failure (reusing
  `buildFromDdl`'s wrapping of the underlying parser error) and otherwise emits **no** diagnostics
  channel — there is no `onError`/`strict` at prepare time. Unsupported statements are silently
  non-eligible, not errors. (No options object in v1; see §1.)
- **Extract tier:** every non-fatal observation is attached to the specific `TableDdlSlice` it
  concerns, via `warnings`. Payloads carry **structured** targets (not flattened strings) so they are
  unambiguous and actionable, and a `range` into the original source wherever one is available:

```typescript
export type DdlExtractorWarning =
  | {
      kind: 'OmittedForeignKeyTarget'
      /** The FK's referenced table, structured to avoid ambiguity. */
      refTable: TableRef
      /** FK constraint name, when the DDL named it. */
      symbol?: string
      /** Range of the FK clause / owning CREATE TABLE, when resolvable. */
      range?: SourceRange
    }
  | {
      kind: 'OutOfScopeStatementDropped'
      /** AST node type, e.g. 'AlterTableStmt'. */
      statementType: string
      range: SourceRange
    }
  | {
      kind: 'UnresolvedTypeReference'
      /** As written, possibly schema-qualified, e.g. 'audit.mood' or 'mood'. */
      typeName: string
    }
  | {
      kind: 'DuplicateTable'
      /** The duplicated table identity. */
      table: TableRef
      /** Range of each ignored redefinition, when resolvable. */
      range?: SourceRange
    }
```

| Warning | Raised when |
|---|---|
| `OmittedForeignKeyTarget` | T has an FK to a table deliberately not included (output references an absent table). |
| `OutOfScopeStatementDropped` | A statement unsupported by `buildFromDdl` (e.g. `ALTER TABLE T …`, a backing `CREATE SEQUENCE`) names T and was dropped — see [§4b](#4b-scanning-dropped-statements). |
| `UnresolvedTypeReference` | A column/expression references a user-type-looking name with no `CREATE` in the DDL, **and** the name is not a recognized builtin/extension type — see [§4c](#4c-unresolved-type-suppression). |
| `DuplicateTable` | The DDL defines T more than once; the **first** definition is used (mirrors `buildFromDdl`), the rest are reported here. |

---

## 2. Where it lives

- New module: `src/parser/extractTableDdl.ts` (analyzer + public entry point).
- Re-exported from `src/index.ts` alongside `buildFromDdl`.
- Reuses existing primitives: `parseStatements`, `stmtTypeName`, `stmtBody` (`pgParser.ts`),
  `strVal`, `stmtRangeOf` (`astHelpers.ts`), `mapTypeName`/`rawTypeName` (`typeMapper.ts`),
  `SourceRange` (`positions.ts`).
- **Shared key-derivation:** the relevance analyzer must compute the *same* qualified-name keys the
  handlers/`referenceResolver` use (`schema.table`, `schema.type`, type-scope resolution rules).
  To prevent drift, factor the name/key extraction for each supported statement into a small shared
  helper module (proposed `src/parser/stmtTargets.ts`) consumed by both the new analyzer and,
  where practical, the existing handlers. If refactoring the handlers proves too invasive, the
  analyzer duplicates the minimal logic and a test asserts parity. (See ddlapi-authoring before
  touching handler internals.)

---

## 3. Why not reuse the `Realm` from `buildFromDdl`

The built `Realm` is unsuitable as the extraction substrate:

- **Loss of statement identity.** `COMMENT ON …`, `CREATE INDEX`, and `CREATE TRIGGER` are folded
  into `attrs`/`indexes` arrays of their target object. Their identity as *separate source
  statements* — and their source ranges — is gone, but those are exactly the statements we must
  re-emit verbatim.
- **No source ranges on model objects.** Ranges are currently computed only for error reporting and
  never attached to model objects.

Extraction is therefore **statement-centric**: we keep a 1:1 index from each supported raw statement
to its source range and to a descriptor of what it defines / depends on, and select a subset of
those statements.

---

## 4. Statement index (the "prepare" phase)

Parse once (`parseStatements`) → for each `RawStmt`, if its type is in the supported subset, build a
`StatementDescriptor`:

```typescript
interface StatementDescriptor {
  rawIndex: number                 // position in the statement list
  type: string                     // 'CreateStmt' | 'IndexStmt' | ...
  span: ResolvedSpan               // see §6 — byte range incl. trailing ';' handling
  defines: DefinedObject           // what this statement introduces
  dependsOnTypes: string[]         // type keys referenced in declared positions
}
```

`DefinedObject` is a discriminated union:

| Statement | `defines` |
|---|---|
| `CreateStmt` (CREATE TABLE) | `{ kind: 'table', key }` |
| `IndexStmt` | `{ kind: 'index', name?, targetTable: key }` |
| `CreateTrigStmt` | `{ kind: 'trigger', targetTable: key }` |
| `CreateEnumStmt` / `CompositeTypeStmt` / `CreateRangeStmt` / `CreateDomainStmt` | `{ kind: 'type', key }` |
| `CommentStmt` | `{ kind: 'comment', target: CommentTarget }` |

`CommentTarget` captures the resolved object the comment is about: table key, column
(`table key` + column), table constraint (`table key` + constraint name), index (`schema.indexName`),
or type (`schema.typeName`). Comment objtypes that `buildFromDdl` ignores (functions, schemas-as-such,
etc.) are not indexed as relevant-to-any-table.

The supported statement types are defined **once**, in a shared source of truth, and both
`buildFromDdl` and the extractor consume it — see [§4a](#4a-shared-supported-statement-type-single-source-of-truth).
Anything not in that set (including `AlterTableStmt`, `CreateSeqStmt`, `CreateFunctionStmt`,
`ViewStmt`, …) is **never** selected, matching `buildFromDdl`'s scope.

Also built during prepare:
- **Type-definition registry**: `typeKey → StatementDescriptor` for every CREATE TYPE/DOMAIN.
- **Index-of-table map**: `targetTable key → IndexStmt descriptors`.
- **Trigger-of-table map**: `targetTable key → CreateTrigStmt descriptors`.
- **Comment-by-target map**: keyed so a table's comments (table/column/constraint/index) and a
  type's comments can be looked up O(1).
- **Type-dependency edges**: `typeKey → typeKey[]`, computed by the whole-AST `TypeName` walk
  (declared positions *and* expression casts; see below) for transitive closure.

This whole structure is the reusable product of `prepareDdlExtractor`; `extractTable` only reads it.

### 4a. Shared supported-statement-type single source of truth

To guarantee the extractor's eligible-statement set cannot drift from `buildFromDdl`'s dispatch, both
read from one declaration (proposed `src/parser/supportedStatements.ts`):

```typescript
export const SUPPORTED_STMT_TYPES = [
  'CreateStmt', 'IndexStmt', 'CommentStmt', 'CreateDomainStmt',
  'CreateEnumStmt', 'CompositeTypeStmt', 'CreateRangeStmt', 'CreateTrigStmt',
] as const

export type SupportedStmtType = typeof SUPPORTED_STMT_TYPES[number]
export const SUPPORTED_STMT_TYPE_SET: ReadonlySet<string> = new Set(SUPPORTED_STMT_TYPES)
```

**`buildFromDdl` is refactored to derive its scope from this list** (small change, see
ddlapi-authoring): the "is this supported?" test becomes `SUPPORTED_STMT_TYPE_SET.has(typeName)`
(replacing the hand-maintained `OUT_OF_SCOPE_STMTS` allow/deny split), and its dispatch `switch` is
made **exhaustive over `SupportedStmtType`** using the existing `assertNever` sentinel
(`test/types.test.ts` pattern) in the `default` branch. Consequence enforced *at compile time*:

- Add a name to `SUPPORTED_STMT_TYPES` ⇒ `buildFromDdl`'s switch fails to compile until it has a
  handler `case` (the residual type is no longer `never`).
- The extractor builds its statement index by filtering on `SUPPORTED_STMT_TYPE_SET`, so it is
  *definitionally* a subset of what `buildFromDdl` dispatches — they cannot diverge.

A test mirrors the existing exhaustiveness test: a `_exhaustiveSupportedStmt(t: SupportedStmtType)`
switch with an `assertNever` default, plus a runtime assertion that every name in the list resolves
to a handler.

### Type-dependency detection

**Decision: detect type references everywhere in a statement's AST — including expression casts —
which deliberately goes *beyond* `buildFromDdl`'s declared-position-only resolution.**

A statement "depends on" a user type when a `TypeName` node referencing that type appears **anywhere
in the statement's AST**. A single uniform AST walk over each statement collects every `TypeName`
node and resolves it, which subsumes all of:
- Declared positions: column `typeName` (incl. array element types, e.g. `mood[]`), composite field
  types, domain `AS <baseType>`, range `subtype`.
- Expression positions: `TypeCast` nodes inside `CHECK` / `DEFAULT` / generated-column expressions,
  index predicates/expressions, etc. (e.g. `CHECK (x::mood = 'a')`, `DEFAULT 'a'::mood`).

Resolution **matches `buildFromDdl`/`referenceResolver` step 2 exactly**: a bare name is scoped to
the owning object's schema only — **no `public`/`search_path` fallback** — and a qualified `s.t`
name is used as-is. A dependency is only emitted when the resolved key exists in the type-definition
registry — built-in types (`int`, `text`, …) resolve to known `SchemaType`s, have no defining
statement, and are skipped. FK target tables appear as `RangeVar`, not `TypeName`, so the walk never
mistakes them for type dependencies.

The same whole-AST walk runs on each *included type definition* too, so transitive expression-level
references (e.g. a domain `CHECK` that casts to another enum) are followed.

**Cycle prevention.** The per-statement AST walk is over a single finite parse tree — no cycles
there. But the *transitive closure* across type definitions (and, below, across `LIKE` sources and
the overall statement selection) can revisit nodes — PostgreSQL forbids most direct type recursion,
but malformed or self-referential DDL must not loop. All closures are implemented as a worklist with
a **`visited`/`selected` set keyed by object key** (`schema.type`, `schema.table`, or statement
index): a node already selected is never re-expanded. This makes both termination and idempotence
trivial and doubles as the de-duplication mechanism for the final statement set.

> **Note:** this is an intentional divergence — the extracted subset may pull in a type that
> `buildFromDdl` would not have linked to the table, because `buildFromDdl` ignores expression-level
> type usage. The goal here is a *self-contained, runnable* subset, which argues for the broader
> detection.

### 4b. Scanning dropped statements

To emit the `OutOfScopeStatementDropped` warning, prepare also **light-scans unsupported
statements** for their target relation, so a dropped statement that names T can be attributed to T.
Scope of the scan (best-effort relation extraction, no full handling):
- `AlterTableStmt` → `relation` (covers `ALTER TABLE T ADD CONSTRAINT/COLUMN/…`).
- Other statements that carry an obvious target relation where cheaply available (e.g.
  `TruncateStmt`, `RuleStmt`, `CreateTrigStmt` for an out-of-scope trigger variant). Statements with
  no clear single relation (sequences, functions) are attributed only when their *name* matches T's
  (rare); otherwise they are simply not warned.

This index is `targetRelationKey → DroppedStatementInfo[]`, consulted by `extractTable` to produce
the warning. It carries **no source ranges into the output** — dropped statements are never emitted,
only reported.

### 4c. Unresolved-type suppression

The `UnresolvedTypeReference` warning fires only for a `TypeName` that (a) did not resolve to a
defined type in the DDL **and** (b) is not a recognized builtin/extension type. A **denylist of
known names that never warn** is seeded from:
- Every name `typeMapper` recognizes (all `pg_catalog` builtins, serial aliases, spatial, etc.).
- A curated set of common extension types: `citext`, `hstore`, `ltree`, `lquery`, `ltxtquery`,
  `vector`, `geometry`, `geography`, `cube`, `earth`, `isn`-family, etc.

The list is centralized (proposed alongside `postgres.constants.ts`) and documented as extensible.
Names outside it — genuinely unknown user types with no `CREATE` — warn once per slice.

---

## 5. Relevance rules

Given the target table `T = (schema S, name N)` with key `S.N`, the selected statement set is the
transitive closure of:

### Included

1. **The `CREATE TABLE S.N` statement itself.** Carries inline PRIMARY KEY / UNIQUE / CHECK / FOREIGN
   KEY / identity / generated / default clauses — all part of T's own statement. If the DDL defines
   T more than once, the **first** `CREATE TABLE S.N` is used and a `DuplicateTable` warning is
   emitted (mirrors `buildFromDdl`'s duplicate handling).
2. **`CREATE [UNIQUE] INDEX … ON S.N`** — every index whose target relation is T.
3. **`CREATE TRIGGER … ON S.N`** — every trigger whose target relation is T.
   (The trigger's `EXECUTE FUNCTION` target is a `CREATE FUNCTION`, which is out of scope for
   `buildFromDdl` and therefore *not* extracted — consistent with "only statements supported by
   `buildFromDdl`".)
4. **`COMMENT ON …`** whose resolved target is T or something owned by T:
   - `COMMENT ON TABLE S.N`
   - `COMMENT ON COLUMN S.N.col`
   - `COMMENT ON CONSTRAINT cname ON S.N` (table-level checks / FKs)
   - `COMMENT ON INDEX S.idx` where `idx` is an index on T (known from the index-of-table map and
     named inline/constraint indexes).
5. **Type definitions** (`CREATE TYPE … AS ENUM | AS (...) | AS RANGE`, `CREATE DOMAIN`) for every
   type T depends on, **transitively** — via the whole-AST `TypeName` walk (declared positions *and*
   expression casts; composite → its field types → …; domain → its base domain / `CHECK` casts → …;
   range → its subtype).
6. **`COMMENT ON TYPE typename`** for each included type.
7. **`LIKE` source tables — full closure.** When T is `CREATE TABLE T (LIKE U …)`, the source table
   `U` is included with its **whole definition and all statements relevant to it** — i.e. `U` is fed
   back through this same relevance closure (rules 1–7) as if it were itself a requested table: its
   `CREATE TABLE`, its indexes, triggers, comments, type deps, and any further `LIKE` chain. Unlike
   an FK target, `U` is structurally required — `buildFromDdl` drops T entirely
   (`UnresolvedLikeSource`) without it. The shared `selected` set (see Cycle prevention) makes a
   `LIKE` chain (or a pathological `A LIKE B`, `B LIKE A`) terminate naturally.

### Excluded (deliberately)

- **The target table of any FK from T** (and that table's own indexes/comments/triggers). The FK
  *clause* lives inside T's own `CREATE TABLE`, so it is emitted; the referenced table is not pulled
  in. → emits a `warning` so the consumer knows the produced SQL references an absent table.
- **Tables/objects reached only via a trigger's function body** — invisible at the DDL-structural
  level and out of scope anyway.
- **Any statement type unsupported by `buildFromDdl`**, even when semantically relevant — notably
  `ALTER TABLE S.N ADD CONSTRAINT …` (out-of-scope FK/index/check additions) and `CREATE SEQUENCE`
  backing a `DEFAULT nextval(...)`. These are never emitted; a `warning` is recorded when such a
  statement names T.

### Output ordering & runnability guarantee

Selected statements are emitted in **original source order** (by statement index); the analyzer
**never reorders** — it only filters. Therefore:

> **If the input DDL is runnable in psql, the extracted subset is runnable too — except for the
> dependencies deliberately excluded.** A correctly-ordered input already places every type / `LIKE`
> source before the table that uses it (psql requires this to run at all); filtering preserves that
> relative order, so no topological sort is needed.

The only things that change runnability are the intentional exclusions, each of which is reported via
a `warning`:
- an **FK to an omitted target table** (output references an absent table → `OmittedForeignKeyTarget`);
- an **out-of-scope backing object** such as a `CREATE SEQUENCE` behind `DEFAULT nextval(...)` or a
  trigger's `CREATE FUNCTION` (`OutOfScopeStatementDropped`).

Consequently the subset is intentionally **not** guaranteed to pass `buildFromDdl({ strict: true })`
cleanly (the FK yields an `UnresolvedReference`) — the explicit trade requested ("FK statements yes,
target-table statements no"). `LIKE` sources, by contrast, *are* included (full closure, §5.7), so
`LIKE` does not break round-tripping.

---

## 6. Verbatim slicing (the "extract" phase)

Findings from probing `pgsql-parser` (libpg_query) that drive this design:

- `stmt_location` / `stmt_len` are **UTF-8 byte offsets**. We operate on `Buffer.from(ddl, 'utf8')`
  and decode slices back with `toString('utf8')` — multibyte content round-trips exactly.
- `stmt_len` spans `[loc, loc+len)` and **excludes the trailing `;`**.
- The **last statement has no `stmt_len`** → its end is the buffer end.
- **Comments are not separate statements.** Whitespace and comments between the previous statement's
  `;` and a statement's first token are absorbed into *that statement's* leading span. So slicing a
  statement's full `[loc, loc+len)` span **automatically includes its preceding comments** (line and
  block), which is most of the comment-extraction feature for free.

### Span resolution

For statement *i* compute a `ResolvedSpan`:
- `start = stmt_location_i` (start of its leading-trivia region).
- `bodyEnd = stmt_location_i + stmt_len_i`, or buffer end for the last statement.
- `semiEnd` = `bodyEnd` advanced over whitespace to include a single trailing `;` if present.
- Within `[start, bodyEnd)`, locate `firstTokenStart` (end of leading trivia) by lexing the trivia
  region for whitespace + `--`/`/* */` comments. This lets us separate *leading comments* from
  *leading blank-line padding* inherited from a skipped predecessor.

### Assembly strategy

Select the relevant statements, sort by statement index, then emit using **contiguous-run verbatim
copy**:

- When consecutive selected statements are adjacent in the source with no *unselected* statement
  between them, copy the original text spanning them **verbatim** (`buf.slice(runStart, runEnd)`),
  preserving every blank line and interstitial comment exactly. This directly satisfies "a comment
  that is the only thing between two relevant statements is kept."
- When a selected statement follows an *unselected* one, start a new run and insert a normalized
  **seam separator** between runs.
- **Seam newline style:** the inserted blank-line seam uses the source's **detected dominant newline**
  (LF vs CRLF) so a CRLF file does not get mixed line endings. (Verbatim run copies already preserve
  whatever the source used, since they are byte slices.)
- **Run-head comment trimming (decided):** at a run head whose predecessor was *dropped*, keep only
  the comment block **directly touching** the first statement — i.e. walk back from `firstTokenStart`
  over comment lines and stop at the **first blank line**. Comments separated from the statement by a
  blank line are treated as belonging to the dropped predecessor and trimmed. (The very first
  statement in the file keeps its leading comments and only sheds leading blank lines; inside a
  contiguous run nothing is trimmed.)
- **Trailing `;`:** re-attach a `;` after each statement (sourced from `semiEnd` when present, else
  synthesized) so the output is runnable even when the input's final statement lacked one.

This keeps runs of kept statements byte-identical to the input and only normalizes the seams where
statements were dropped.

---

## 7. Identifier normalization

Keys are built via `strVal`, which is already case-folded by the parser's lexer (unquoted →
lowercase; quoted → preserved) — identical to `buildFromDdl`. The `TableRef` passed to `extractTable`
must already be in this normalized form, exactly as `tables()` / the `Realm` returns it.

**The extractor does NOT re-fold or SQL-parse caller strings** — it does a direct key lookup. This is
deliberate: re-folding would corrupt quoted mixed-case identifiers (a column/table declared as
`"MyTable"` is keyed as `MyTable`, and lowercasing the caller's `"MyTable"` to `mytable` would miss
it). Callers that hand-write a name are responsible for matching the model's normalization
(lowercase an unquoted identifier; preserve the case of a quoted one).

Tables written without a schema qualifier resolve to `public` (`PG_DEFAULT_SCHEMA`); the
corresponding `TableRef.schema` is `'public'`.

---

## 8. Testing approach

Tests are **attached to the task that introduces the behavior** (see §9), not deferred to the end.
Each task below lists its own acceptance criteria. This section only fixes the mechanics:

- Follow the `ddlapi-testing` skill: SQL fixtures + assertions, in the conventional test locations.
- Each task is mergeable on its own: it must leave the full `ddlapi` suite green.
- The final task adds only cross-cutting end-to-end/regression fixtures and docs — it is **not** the
  first time any behavior is verified.

---

## 9. Implementation tasks

Vertical slices, each independently verified. Three hard **checkpoints** (⛳) gate the riskiest
transitions: after the span engine, after the supported-statement refactor (touches existing
`buildFromDdl`), and after the core relevance closure.

### Task 1 — Span engine ⛳ checkpoint

Pure, no relevance logic. Buffer-based span resolution (`start`/`bodyEnd`/`semiEnd`/`firstTokenStart`),
trivia/comment lexer, dominant-newline detection, contiguous-run assembler, run-head comment trimming,
trailing-`;` re-attachment.

**Acceptance criteria**
- Single-statement slice equals the input byte-for-byte, including leading comments, odd whitespace,
  and multibyte identifiers/strings.
- Last statement without a trailing `;` is sliced correctly and gets a `;` re-attached.
- Multibyte byte-offset slicing is exact; statement with no leading trivia handled; empty input → empty.
- CRLF source → CRLF seams (no mixed line endings); LF source → LF seams.
- Run-head trimming: a comment directly above a run's first statement is kept; one separated by a
  blank line is trimmed; inside a contiguous run nothing is trimmed.

> ⛳ **Checkpoint 1:** the hardest byte-level behavior is locked and fully unit-tested before any
> relevance logic is built on top of it.

### Task 2 — Public contract skeleton

Export `TableRef`, `TableDdlSlice`, `DdlExtractorWarning`, `DdlExtractor`, `prepareDdlExtractor` from
`index.ts`. Implement parse-once + table discovery + `extractTable(table)` returning **just the raw
`CREATE TABLE` slice** (no indexes/types/comments/warnings yet). Gives every later task a stable
integration target.

**Acceptance criteria**
- `prepareDdlExtractor` throws `DdlParseError` on invalid SQL; resolves otherwise.
- `tables()` lists only `CREATE TABLE`d tables, in source order, as `TableRef`s.
- `extractTable(extractor.tables()[i])` returns that table's verbatim `CREATE TABLE` slice.
- Unknown `TableRef` → `undefined` (lookup miss, never a throw).
- Quoted mixed-case `"MyTable"` is found via `TableRef { name: 'MyTable' }`; no lowercasing of caller
  strings.

### Task 3 — Supported-statement source of truth ⛳ checkpoint

Add `supportedStatements.ts` (`SUPPORTED_STMT_TYPES` / `SupportedStmtType` / `SUPPORTED_STMT_TYPE_SET`,
§4a) and refactor `buildFromDdl` to consume it (replacing `OUT_OF_SCOPE_STMTS`), with the `assertNever`
exhaustive `switch`. Isolated because it **touches existing `buildFromDdl` behavior**.

**Acceptance criteria**
- Existing `buildFromDdl` tests stay green (no behavior change for current inputs).
- `_exhaustiveSupportedStmt` compile-time check present (mirrors `test/types.test.ts`); removing a
  handler `case` fails to compile.
- Runtime parity test: every name in `SUPPORTED_STMT_TYPES` dispatches to a handler.

> ⛳ **Checkpoint 2:** shared scope landed and `buildFromDdl` is provably unchanged for existing
> inputs before the extractor depends on it.

### Task 4 — Statement target indexing

Build the `StatementDescriptor` index for all supported statements via shared `stmtTargets.ts` key
derivation: tables, indexes (+ target), triggers (+ target), comments (+ resolved target), types.
Lookup maps (index-of-table, trigger-of-table, comment-by-target, type registry). No closure yet.

**Acceptance criteria**
- Each descriptor kind is asserted independently from a fixture (correct key, target, source range).
- `stmtTargets.ts` key derivation matches `buildFromDdl`'s keys (parity test).

### Task 5 — Basic relevance closure ⛳ checkpoint

Worklist + `selected` set seeded from the table; include indexes, triggers, and table-owned comments
(table/column/constraint/index). Assemble via the Task 1 engine.

**Acceptance criteria**
- Table + its indexes + triggers + owned comments are included; unrelated statements omitted.
- Output preserves source order; runs are byte-verbatim, seams normalized.
- Reuse: one `prepareDdlExtractor` drives many `extractTable` calls correctly.

> ⛳ **Checkpoint 3:** end-to-end extraction works for the common single-table case before the harder
> type/`LIKE`/warning behaviors are layered on.

### Task 6 — Type-dependency closure

Whole-AST `TypeName` walk (§4 — declared positions *and* expression casts), transitive type inclusion
with the `selected`-set cycle guard, and `COMMENT ON TYPE` for each included type.

**Acceptance criteria**
- Included: column → enum; column → composite → enum; column → domain → base domain; column → `type[]`
  array; qualified `otherschema.type`; expression-cast-only reference (`CHECK (x::mood = …)`).
- `COMMENT ON TYPE` for an included type is emitted; for an unused type is not.
- A type cycle terminates.

### Task 7 — `LIKE` closure

Full recursive inclusion: a `LIKE` source `U` is fed back through the relevance closure (Tasks 5–6)
as if requested.

**Acceptance criteria**
- `T (LIKE U …)` pulls in `U`'s `CREATE TABLE` *and* `U`'s indexes/comments/types.
- A `LIKE` chain `A→B→C` includes all; a self-referential `A LIKE B`, `B LIKE A` terminates.

### Task 8 — Warnings

Add the four `DdlExtractorWarning` kinds with structured payloads (§1a), including the dropped-statement
relation scan (§4b) and the extension-type denylist (§4c).

**Acceptance criteria**
- `OmittedForeignKeyTarget` (structured `refTable: TableRef`) on an FK to an absent table.
- `DuplicateTable` on a doubly-defined table; first definition is the one emitted.
- `OutOfScopeStatementDropped` for an `ALTER TABLE T …` present in the source.
- **Extension-type denylist defined and documented**: at least one known extension type (e.g.
  `citext`) does **not** warn, while a genuinely unknown user type does. (This subsumes the former
  "denylist contents" open item — it is now a shipped acceptance criterion, not a deferred detail.)

### Task 9 — Docs & final integration

Update `index.ts` exports/JSDoc; update the `ddlapi-using` skill if the consumer surface warrants it.
Add cross-cutting end-to-end fixtures (multi-table file, extractor reuse across all tables) and run the
full `ddlapi` suite.

**Acceptance criteria**
- A realistic multi-table DDL: iterating `tables()` and extracting each yields the expected per-table
  subsets; full suite green.

---

## Decisions

### Settled (confirmed with user)

- **LIKE source tables → included as a full closure.** `U` is run back through the whole relevance
  closure (its indexes/triggers/comments/type deps/further LIKEs), not just its `CREATE TABLE`;
  see §5.7.
- **Expression-level type references → detected** (whole-AST `TypeName` walk), a deliberate
  divergence from `buildFromDdl`; see §4 / §5.5. Goal: self-contained, runnable subset.
- **Output fidelity → verbatim runs + normalized seams + ensured `;`.** Contiguous kept statements
  copied byte-for-byte; one blank line at seams where statements were dropped; a trailing `;`
  re-attached per statement so output is runnable even when the source's last statement lacked one.
- **API naming → `prepareDdlExtractor(ddl)` → `DdlExtractor`** with `tables()` and
  `extractTable(table)`. **No options object in v1** (no real knobs yet — avoids a weak empty
  interface); add one only when an option exists.
- **Table identity → a `TableRef { schema, name }` value**, not two positional strings. Prevents
  accidental schema/table swaps and makes `extractTable(extractor.tables()[0])` natural; see §1.
- **Unknown table → `undefined` is a lookup miss, not a failure.** All hard failures occur in
  `prepareDdlExtractor` (which throws); everything non-fatal is a slice `warning`; see §1.
- **Identifier handling → no re-folding.** `extractTable` does a direct key lookup on the normalized
  `TableRef`; it never SQL-parses or case-folds caller strings (would break quoted mixed-case
  identifiers); see §7.
- **Warning payloads → structured + ranged.** Targets are structured (`refTable: TableRef`,
  `table: TableRef`) and carry a `SourceRange` where available, not flattened strings; see §1a.
- **Supported-statement set → single source of truth** shared by `buildFromDdl` and the extractor,
  with compile-time exhaustiveness (`assertNever`); see §4a. The two cannot drift.
- **Cycle/dedup safety → worklist + `selected` set** keyed by object key for every closure (types,
  LIKE chains, statement selection); see §4 Cycle prevention.
- **Schema qualification → always schema-qualified.** A `TableRef` always carries a schema
  (`'public'` for unqualified tables), so homonymous tables in different schemas are unambiguous.
- **Output ordering → preserve source order**, never reorder. Runnable-in ⇒ runnable-out except for
  the deliberately-excluded references (each warned); see §5 Output ordering.
- **Return shape → `table` + `sql` + `warnings` only.** No structured object summary; consumers
  re-parse if they need structure.
- **Batch API → none.** Only `tables()` + `extractTable()`; the consumer loops itself.
- **Type-name resolution → exact `buildFromDdl` parity.** Bare names scope to the owning schema only,
  no `public`/`search_path` fallback; see §4.
- **Diagnostics → two-tier.** `prepareDdlExtractor` throws `DdlParseError` on parse failure and is
  otherwise silent; all non-fatal observations are per-`TableDdlSlice` `warnings`; see §1a.
- **Warnings → four kinds:** `OmittedForeignKeyTarget`, `OutOfScopeStatementDropped`,
  `UnresolvedTypeReference`, `DuplicateTable`; see §1a.
- **Duplicate `CREATE TABLE` → first wins + `DuplicateTable` warning** (mirrors `buildFromDdl`).
- **Dropped-statement scanning → enabled.** Prepare light-scans unsupported statements for their
  target relation so `OutOfScopeStatementDropped` can attribute them to T; see §4b.
- **Unresolved-type warning → suppressed for known builtin/extension types** via a centralized
  denylist; warns only for genuinely unknown user types; see §4c.
- **Seam newline style → match the source's detected dominant newline** (LF vs CRLF); see §6.
- **Run-head comment trimming → keep only the comment block directly touching the statement**, stop
  at the first blank line above it; see §6.

### Remaining details (resolve during implementation)

- **`tables()` content/order.** Lists only tables that have a `CREATE TABLE` in the DDL (not
  FK-target-only or `LIKE`-only phantoms), in source order. Trivial; no behavioral risk.

(The extension-type denylist is no longer an open detail — Task 8 ships an initial documented list as
an acceptance criterion. It remains extensible later.)
