---
description: How to write diff tests in api-diff — shared assertion and fixture conventions for every spec type, plus AsyncAPI-specific spec patterns and parser-built (e.g. ddlapi SQL) fixtures.
---

# api-diff Test Writing Standards

The **Shared conventions** and **Parser-built fixtures** sections apply to every spec
type. The AsyncAPI sections are specific to AsyncAPI specs.

## Valid specifications

All test specs must be valid AsyncAPI 3.0.0 unless the test is deliberately exercising error handling. Call `parseAsyncApiAndAssertValid` on each spec before the diff assertion:

```typescript
await parseAsyncApiAndAssertValid(before)
await parseAsyncApiAndAssertValid(after)

const { merged, diffs } = apiDiff(before, after, COMPARE_OPTIONS)
```

When a spec is intentionally invalid, comment out the validation call and explain why:

```typescript
// await parseAsyncApiAndAssertValid(source) // intentionally missing required 'info'
```

## Minimum required fields

Every valid AsyncAPI 3.0.0 spec must include:

```typescript
{
  asyncapi: '3.0.0',
  info: {
    title: 'Test API',
    version: '1.0.0',
  },
}
```

## Helper functions

Extract a `createAsyncAPIWithSchema` helper when multiple tests share the same document shape but vary only the schema:

```typescript
const createAsyncAPIWithSchema = (
  schemaDefinition: unknown,
  schemaFormat?: string,
) => ({
  asyncapi: '3.0.0',
  info: { title: 'Test API', version: '1.0.0' },
  components: {
    schemas: {
      TestSchema: schemaFormat
        ? { schemaFormat, schema: schemaDefinition }
        : schemaDefinition,
    },
  },
})
```

Pass `schemaFormat` to create a Multi Format Schema; omit it for a plain schema.

## Test organisation

- Define `COMPARE_OPTIONS` constants at the top of the `describe` block.
- Keep spec literals close to the test that uses them.
- Name variables `before` / `after` (or domain-specific names) — not `spec1` / `spec2`.

## Shared conventions (all spec types)

- **Assert diff fields, not stringified dumps.** Check `action`, `type`,
  `before|afterValue`, and `before|afterDeclarationPaths` via the `diffsMatcher`
  helper (order-independent) with `expect.objectContaining`. Assert the exact count
  with an explaining comment: `expect(diffs).toHaveLength(1) // the added column`.
- **Import specific classifier constants** (`nonBreaking`, `breaking`, `annotation`,
  `unclassified`) from `../src` and use them directly — do **not** import
  `ClassifierType` and write `ClassifierType.nonBreaking`.
- **Isolate human-readable descriptions in one dedicated test file, and assert the
  exact string** (`expect(diff.description).toBe("…")`), not just that a description
  exists. The full-string assertion is what catches a calculator that fell back to the
  default description — i.e. a string containing a **raw declaration path** (e.g.
  `[Changed] '#defaults' in root` or `[Added] 'schemas.0.tables.0…'`) instead of the
  expected entity names. A `toBeDefined()` / `toContain()` check would pass on that
  garbage. Keeping these in one `*.description.test.ts` also limits a wording change to
  one blast radius.
- **Type the merged document as the spec's model type** (e.g. ddlapi `Realm`), not
  `any` — diff metadata is attached under symbol keys and does not affect the type.
- **Verify the shared-diff contract on the *Diff instance*.** For an entity reached
  via several paths, don't stop at node identity — read the attached diff via the
  `DIFF_META_KEY` symbol at each path (`node[DIFF_META_KEY][propertyKey]`) and assert
  it is the **same `Diff` object** and equal to the single entry in `diffs`.
- **Make rule coverage exhaustive — one description test per non-`unclassified` rule
  × action.** This is what surfaces param-calculator path-resolution bugs. The classic
  one: a `replace` whose *after* value is a normalized default (e.g. an index
  `unique:true→false`) has its after declaration path resolved to the synthetic
  `#defaults` origin, so a calculator that naively reads the after side renders a raw
  path instead of a name. The **fix belongs in the calculator, not the test** — it
  should take candidate paths from `resolveAllDeclarationPath(diff)` (before+after
  merged) and prefer the change side's root, exactly like the OpenAPI/JSON Schema
  calculators (see the `api-diff-authoring` skill). Where a rule/action isn't
  producible by the parser (e.g. PG per-column charset, schema-level comments), note it
  rather than forcing a fixture.
- **Group tests by durable subject, not by plan phase or task.** A `describe` named for the
  schema element or kind of change (`column default`, `foreign keys`, `indexes and primary
  keys`) survives refactors; `phase-2 (T4.2)` does not. Name each test for the scenario it
  exercises (`int → bigint`, `added composite primary key`), never a plan case number
  (`case 5a`), and keep comments on the same axis — no `§`/`T#`/`phase` citations pointing at a
  planning doc the reader won't have.
- **Drive a threshold-governed value from its constant, not a magic number.** When a rendered
  value is capped (e.g. a description truncation limit), import that constant into the test,
  size the fixture from it, and derive the expected string with a small local helper that
  mirrors the renderer's contract — the test then follows the constant if it changes. Cover the
  boundary explicitly: a value *at* the limit renders unchanged, one *over* it is truncated.

## Parser-built fixtures (e.g. ddlapi SQL)

When fixtures are built from source text by a parser instead of written as literals
(ddlapi `buildFromDdl`):

- **Put the inputs in `beforeSql` / `afterSql` constants** — never inline in the diff
  call. Wrap the pair in a small helper (`diffSql(beforeSql, afterSql)`) that builds
  both and calls `apiDiff`.
- **Use multi-line template literals for multi-statement SQL**, and keep *both*
  members of a pair as literals when either is multi-line (so they align visually for
  comparison). Prefer single quotes; use backticks when the SQL embeds quotes.
- **Map the parser package to source in jest** if its bundled build can't load under
  the test runner (ddlapi's WASM); `await` the async build; `maxWorkers: 1` if the
  parser holds a per-worker native/WASM instance.
- Avoid parser quirks in fixtures (e.g. ddlapi `DEFAULT 0` → empty literal value) and
  don't write constructs the parser can't represent (e.g. PG per-column charset,
  schema-level comments).
