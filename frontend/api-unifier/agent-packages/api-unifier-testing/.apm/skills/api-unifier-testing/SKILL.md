---
name: api-unifier-testing
description: Write api-unifier tests — exercise normalize/denormalize on OpenAPI, AsyncAPI, JSON Schema, and GraphAPI specs and assert unified output, origins, and hashes.
---

# Testing api-unifier

Tests run on Jest (`npm test`, or `npm run test:coverage`). They live
under `test/` grouped by spec family — `test/oas/`, `test/asyncapi/`,
`test/graphql/` — with shared helpers in `test/helpers/index.ts`. Name
files `*.test.ts` and put new tests in the matching family folder. Import
the engine from the package root (`from '../../src'`), not from deep
module paths.

## The options bundle

`normalize` behaviour is entirely flag-driven. A test fixes a `baseOptions`
constant at the top of the `describe` and spreads it per call. The flags
that turn on metadata must be passed **test-only symbols** so assertions
can read them back — the helpers export these (`TEST_ORIGINS_FLAG`,
`TEST_HASH_FLAG`, `TEST_SYNTHETIC_TITLE_FLAG`, `TEST_INLINE_REFS_FLAG`,
`TEST_DEFAULTS_FLAG`, …). Typical bundle:

```typescript
const baseOptions = {
  validate: true,
  liftCombiners: true,
  unify: true,
  allowNotValidSyntheticChanges: true,
  syntheticTitleFlag: TEST_SYNTHETIC_TITLE_FLAG,
  originsFlag: TEST_ORIGINS_FLAG,
  hashFlag: TEST_HASH_FLAG,
  inlineRefsFlag: TEST_INLINE_REFS_FLAG,
}
```

Enable only the stages the test asserts on — turning on `unify` when you
are testing merge alone makes failures harder to localize.

## Building specs

Use the helper builders rather than hand-rolling envelopes:
`createOas(schema, version?)`, `createOasWithParameters(...)`,
`createOasWithDeprecatedCandidates(...)` for OpenAPI; the `` yaml`...` ``
and `` graphapi`...` `` template tags for inline YAML and GraphQL. Keep
the spec literal close to the assertion. For collecting reported problems,
pass `onUnifyError: (message) => errors.push(message)` and assert on
`errors`.

## Asserting

- **Output shape:** read nested values with `resolveValueByPath` /
  `getValueByPath`; prefer `toMatchObject` for partial structure.
- **Origins:** three tools, each with a distinct scope:
  - `commonOriginsCheck(result, { source })` — validates the whole tree:
    every node carries an origins record, every ChainItem is interned, and
    (when `source` is supplied) every path actually exists in the source.
    Call this first; it is the broadest contract check.
  - `convertOriginToHumanReadable(result, TEST_ORIGINS_FLAG)` — converts
    ChainItem chains to slash-joined path strings in place, returning the
    same object. Call it **after** `commonOriginsCheck` (it mutates).
    Then assert specific origins with `toHaveProperty`:

    ```typescript
    const r = convertOriginToHumanReadable(result, TEST_ORIGINS_FLAG)
    expect(r).toHaveProperty(
      ['components', 'schemas', 'Pet', TEST_ORIGINS_FLAG, 'description'],
      ['components/schemas/Pet/allOf/1/description'],
    )
    // array slot origin
    expect(r).toHaveProperty(
      ['components', 'schemas', TEST_ORIGINS_FLAG, 0],
      ['components/schemas/0'],
    )
    ```

    Path segments are joined by `/`; array indices are numbers in both the
    `toHaveProperty` key path and the expected string.
  - `checkOriginsAreTheSame(obj1, obj2, propertyName, originsFlag)` — asserts
    that two nodes carry the **same interned ChainItem** for a property (i.e.
    `===`, not just equal strings). Use this for shared-reference cases
    (FK columns, index parts, enum type) where identity matters more than
    the string value. Do not call `resolveOrigins()` in tests — the helper
    comment flags it as unreliable.
- **Hashes:** `checkHashesEqualByPath` / `checkHashesNotEqualByPath`
  assert two nodes hash the same (semantic equality) or differ.
- **Round-trip:** for any reversible unify change, assert
  `denormalize`(or `unify: false`) restores the source minus removed
  defaults. Reversibility bugs are the most common regression.

## Spec validity

Every fixture must be a **valid** spec for its type unless the test is
specifically exercising error handling — in which case say so with a
comment where the validation call would be.

For AsyncAPI, validate the fixture against the real parser with
`parseAsyncApiAndAssertValid(spec)` from `test/helpers/asyncapi.ts`
(async — the test must `await`). It asserts the parser emits no
diagnostics and returns the parsed JSON, which also lets you run the
**dual-validation** pattern: normalize with the unifier, parse with the
parser, and assert both agree.

```typescript
// intentionally invalid — exercising error handling
const source = { asyncapi: '3.0.0' /* missing info */ }
// await parseAsyncApiAndAssertValid(source) // not valid on purpose
```
