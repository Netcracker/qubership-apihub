---
description: How to write AsyncAPI 3.0.0 diff test specifications in api-diff, including valid spec patterns, helper functions, and test organisation.
---

# AsyncAPI Test Writing Standards

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
