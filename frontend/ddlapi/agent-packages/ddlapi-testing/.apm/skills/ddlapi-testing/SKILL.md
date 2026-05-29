---
name: ddlapi-testing
description: Use when adding or changing ddlapi tests — choosing the right test file, adding a SQL fixture, asserting on parsed Realms or escape-hatch attrs, or extending the compile-time exhaustiveness check.
---

# Testing ddlapi

Tests are Jest + ts-jest (`jest.config.js`, `tsconfig.test.json`). The points
below are the project-specific conventions a generic Jest setup will not imply.

## `maxWorkers: 1` is mandatory — do not change it

`pgsql-parser` initialises a libpg_query WASM instance per worker process and
that instance cannot be torn down programmatically. With the default worker
pool, workers fail to exit inside Jest's graceful-shutdown window and you get
*"A worker process has failed to exit gracefully and has been force exited."*
`maxWorkers: 1` recycles a single worker and pays WASM init once. Leave it set;
do not parallelise the suite to "speed it up".

## Where each kind of test goes

| File | Scope |
|------|-------|
| `test/types.test.ts` | Compile-time union exhaustiveness (no runtime behaviour). |
| `test/schema.test.ts` | Model construction: factories, constant values, dual-role `kind` equality, referential equality of factory output, undefined-omission. |
| `test/buildFromDdl.test.ts` | Cross-cutting parser behaviour: realm shape, identifier normalisation, multi-schema, error/`strict` handling, post-resolution referential equality, type-resolution scope, forward references. |
| `test/statements/<stmt>.test.ts` | One statement type, driven by SQL fixtures (`createTable`, `createIndex`, `createType`, `createTrigger`, `commentOn`). |
| `test/sqlSamples.test.ts` | Auto-discovers **every** `.sql` under `test/resources/` and asserts it is valid PostgreSQL. |

Model-only tests import through the public package name
(`@netcracker/qubership-apihub-ddlapi`, mapped to `src/index.ts` by
`moduleNameMapper`); parser tests import from the relative source
(`../src` / `../../src`). Follow the convention already used by neighbouring
files rather than mixing the two.

## SQL fixtures

Per-statement tests load SQL from `test/resources/<category>/<case>.sql` via the
`loadSql('create-table/foo.sql')` helper. Categories mirror statement types
(`create-table/`, `create-index/`, `create-type/`, `create-domain/`,
`create-trigger/`, `comment-on/`, `mixed/`).

Because `sqlSamples.test.ts` globs the whole `resources/` tree and runs each
file through `assertValidSql`, **every fixture you add must be syntactically
valid PostgreSQL** or that test fails — there is no opt-out. Use short, inline
multi-statement SQL passed directly to `buildFromDdl` (not a fixture) for cases
about cross-statement interaction or errors, as `buildFromDdl.test.ts` does.

## Assertion conventions

- Tests are `async`; always `await buildFromDdl(...)`.
- Reach into the parsed Realm with non-null assertions:
  `realm.schemas[0]!.tables![0]!.columns!`.
- **Referential equality is a tested guarantee** — assert it with `.toBe()`
  (e.g. `fk.refTable` is the same object as the table in `schema.tables`, a
  column's enum type is the same instance as the one in `schema.objects`).
- Escape-hatch (`Unknown*`) attrs have no static fields, so find by `kind`
  string and cast to read extra properties:

  ```typescript
  const ident = idCol.attrs!.find(a => a.kind === 'Identity') as { generation: string } | undefined
  expect(ident!.generation).toBe('ALWAYS')
  ```

- Collect non-fatal issues with `{ onError: e => errors.push(e) }` and assert on
  `error.kind` (a `DdlErrorKind`). Pass `{ onError: () => {} }` to silence
  *expected* non-fatal errors when the test only cares about the resulting
  Realm. Assert hard failures with `rejects.toThrow(DdlParseError)` and `strict`
  failures with `rejects.toThrow(DdlBuildError)`.

## Extending the exhaustiveness check

`types.test.ts` proves every known union variant is handled via an
`assertNever(x: never)` sentinel in each `switch` default. The `Known*` aliases
deliberately **exclude** the `Unknown*` escape hatch. When you add a variant to
a core union, update it in three places — the interface + its constant, the
`Known*` alias, and a `case` in the matching `_exhaustive*` function — and tsc
will fail until all three are done.

## When adding a new statement to the parser

Add all three together: the handler under `src/parser/stmtHandlers/`, a
`test/statements/<stmt>.test.ts` exercising it through fixtures, and the SQL
fixtures under `test/resources/<category>/`. Put any cross-statement or
forward-reference behaviour in `buildFromDdl.test.ts` instead.
