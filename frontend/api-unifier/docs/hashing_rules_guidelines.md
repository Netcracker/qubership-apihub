# Hashing Rules Guidelines

## When to Add Hash Rules

The tolerant hash is designed to capture structure and data-model details
while omitting annotation details. Its primary use case is **deprecated
items tracking with refactoring support** — specifically, tracking schemas
and parameters across `$ref` extractions to components in OAS.

Before adding hash rules for a new spec type, ask:

1. Does the spec have a concept of deprecated items?
2. Does the spec have a way to define reusable components (extract-to-component
   refactoring)?

If the answer to either is **no**, hash rules are likely not needed.
GraphQL (`graphapi`) currently has no hash support; `hash()` skips it
explicitly.

## Hash Rule Properties

Three fields on `NormalizationRule` (`src/types.ts`) control hashing:

| Property | Type | Purpose |
|---|---|---|
| `hashStrategy?` | `InclusionStrategy` | Opts this key into the hash and sets its depth limit |
| `hashOwner?` | `boolean` | Marks an entity as independently hashable |
| `newDataLayer?` | `boolean` | Starts a new depth boundary when descending into this node |

```typescript
export const CURRENT_DATA_LEVEL = 'current-data-level'
export const BEFORE_SECOND_DATA_LEVEL = 'second-data-levels'

export type InclusionStrategy =
  typeof CURRENT_DATA_LEVEL |
  typeof BEFORE_SECOND_DATA_LEVEL
```

## The Opt-In Rule — Most Important

**A rule WITHOUT `hashStrategy` is excluded from the hash.**

This is opt-in per key, not opt-out. The implementation default for
`ignoreKey` is `true`; `hashStrategy` is the only way to flip it to
`false`. Forgetting `hashStrategy` silently drops a key from the hash
without any error.

```typescript
// Excluded — no hashStrategy:
'/description': { validate: checkType(TYPE_STRING) }

// Included:
'/name': { validate: checkType(TYPE_STRING), hashStrategy: CURRENT_DATA_LEVEL }
```

## How the Mechanism Works

### Phase 1 — Installing hash thunks (`createHashScannerHook`)

`hash()` in `src/hash.ts` walks the normalized spec with `syncCrawl`.
At every node whose rules have `hashOwner: true`, it attaches a lazy
getter (a thunk stored under the `hashFlag` symbol) to the object:

```typescript
value[flag] = () => {
  if (!hash) {
    hash = calculateHash(createHashObject(value, rules))
  }
  return hash
}
```

The getter is memoized. `deHash()` removes all `hashFlag` properties.

### Phase 2 — Building the hash object (`createHashObject`)

When a hash getter is invoked, `createHashObject(value, rules)` runs
`syncClone` starting from `dataLevel: 0`. The clone hook
(`createHashObjectCreatorHook`) decides for each visited key whether to
include it:

```
no hashStrategy       → ignoreKey = true  → key excluded
CURRENT_DATA_LEVEL    → ignoreKey = (dataLevel > 0)
BEFORE_SECOND_DATA_LEVEL → ignoreKey = (dataLevel > 1)
```

When a key's rule has `newDataLayer: true`, `dataLevel` increments by 1
before descending into the key's value.

### Phase 3 — Computing the hash

`calculateHash` runs `objectHash` (from the `object-hash` package) on
the filtered clone with `unorderedArrays: true`, `unorderedObjects: true`,
and `algorithm: 'md5'`. The hash is order-independent.

## The Depth Model in Detail

`dataLevel` starts at **0** for each entity's own `createHashObject` call.

| `hashStrategy` on the rule | Included when |
|---|---|
| `CURRENT_DATA_LEVEL` | `dataLevel === 0` |
| `BEFORE_SECOND_DATA_LEVEL` | `dataLevel <= 1` |

`newDataLayer: true` on a rule increments `dataLevel` **when the crawler
descends into that key's value**. The key itself is evaluated at the
current `dataLevel`.

Example walk for a JSON Schema's own hash (`dataLevel` starts at 0):

```
schema (hashOwner, CURRENT_DATA_LEVEL — not relevant for own hash; dataLevel=0)
  /type          CURRENT_DATA_LEVEL   dataLevel=0 → included
  /format        CURRENT_DATA_LEVEL   dataLevel=0 → included
  /properties    CURRENT_DATA_LEVEL   dataLevel=0 → included (key present)
    /username    BEFORE_SECOND_DATA_LEVEL + newDataLayer  dataLevel=0 → included as stub
      (/type     CURRENT_DATA_LEVEL   dataLevel=1 → excluded — CURRENT needs 0)
    /email       BEFORE_SECOND_DATA_LEVEL + newDataLayer  dataLevel=0 → included as stub
  /description   (no hashStrategy)   → excluded
```

The `/properties` container appears, the property names appear, but the
property schemas' content does not. Each property schema owns its own
hash via `hashOwner: true`.

## Practical Rules

### 1. Every content key needs `hashStrategy: CURRENT_DATA_LEVEL`

Any primitive or structural key you want captured in an entity's hash
needs `hashStrategy: CURRENT_DATA_LEVEL`. Apply it on every key inside
a `hashOwner` node that should be part of its fingerprint. Use a shared
const or helper to avoid repetition:

```typescript
// Pattern used in OAS parameter rules:
'/name':     { validate: checkType(TYPE_STRING),  hashStrategy: CURRENT_DATA_LEVEL },
'/in':       { validate: checkType(TYPE_STRING),  hashStrategy: CURRENT_DATA_LEVEL },
'/required': { validate: checkType(TYPE_BOOLEAN), hashStrategy: CURRENT_DATA_LEVEL },
```

### 2. Each independently-comparable entity gets `hashOwner: true` + `CURRENT_DATA_LEVEL`

Any entity that needs to be tracked individually (schema, parameter, etc.)
should set `hashOwner: true` and `hashStrategy: CURRENT_DATA_LEVEL` on its
own rule node. The `hashOwner` installs the hash thunk; the
`CURRENT_DATA_LEVEL` on the node itself is what an outer entity uses to
include this entity's KEY (but not its content) in the outer hash.

```typescript
// JSON Schema root (src/rules/jsonschema.ts):
hashStrategy: CURRENT_DATA_LEVEL,
hashOwner: true,

// OAS parameter (src/rules/openapi.ts):
hashStrategy: BEFORE_SECOND_DATA_LEVEL,
hashOwner: true,
```

### 3. Use `newDataLayer + BEFORE_SECOND_DATA_LEVEL` only for entity isolation or cycle-breaking

Place a `newDataLayer + BEFORE_SECOND_DATA_LEVEL` boundary **only** where
you want to:

- Isolate an independently-hashable nested entity so its content does not
  pollute the parent's hash (each entity has its own hash; correlate by
  per-element hash + origins, not array index), or
- Break a reference cycle — `object-hash` is not cycle-safe. When the
  crawler encounters an already-seen object (cycle guard), it returns the
  object reference as a placeholder without recursing. The `newDataLayer`
  boundary is what makes the cloned graph acyclic.

```typescript
// JSON Schema /properties/* — each property schema is a nested entity:
'/*': () => ({
  ...self(),                              // spreads hashOwner + CURRENT_DATA_LEVEL
  newDataLayer: true,
  hashStrategy: BEFORE_SECOND_DATA_LEVEL, // parent sees the property key as a stub
}),
hashStrategy: CURRENT_DATA_LEVEL,  // on /properties itself
```

With this boundary, a change to a property schema's content does **not**
change the parent schema's hash. The parent hash only changes when
properties are added, removed, or renamed.

### 4. Do not add hash rules for annotation-only keys

Keys like `/description`, `/title`, `/externalDocs`, and vendor extensions
should not have `hashStrategy`. They are annotation details intentionally
excluded from the tolerant hash.

## Example: OAS Parameter

The full parameter rule (`src/rules/openapi.ts`) illustrates the pattern:

```typescript
'/*': {
  // structural + data-model keys opted in:
  '/name':          { ..., hashStrategy: CURRENT_DATA_LEVEL },
  '/in':            { ..., hashStrategy: CURRENT_DATA_LEVEL },
  '/required':      { ..., hashStrategy: CURRENT_DATA_LEVEL },
  '/deprecated':    { ..., hashStrategy: CURRENT_DATA_LEVEL },
  '/allowEmptyValue': { ..., hashStrategy: CURRENT_DATA_LEVEL },
  '/style':         { ..., hashStrategy: CURRENT_DATA_LEVEL },
  '/explode':       { ..., hashStrategy: CURRENT_DATA_LEVEL },
  '/allowReserved': { ..., hashStrategy: CURRENT_DATA_LEVEL },

  // annotation keys — NO hashStrategy:
  '/description':   { validate: checkType(TYPE_STRING) },

  // nested entity — boundary, no hash contribution from schema content:
  '/schema': () => ({ ...openApiJsonSchemaRules(version), newDataLayer: true }),

  // the parameter itself:
  hashStrategy: BEFORE_SECOND_DATA_LEVEL,
  hashOwner: true,
}
```

The parameter hash captures its identity (name, in, required, style, …)
but not the schema body. Schema changes are tracked via the schema's own
hash.

## Checklist for a New Spec Type

- [ ] Ask: does this spec support deprecated items and reusable components?
      If no to both, skip hash rules entirely.
- [ ] Identify independently-comparable entities (e.g., schemas, parameters).
- [ ] Add `hashOwner: true, hashStrategy: CURRENT_DATA_LEVEL` to each entity's root rule.
- [ ] Add `hashStrategy: CURRENT_DATA_LEVEL` to every content key inside the entity
      that contributes to its structural fingerprint.
- [ ] Omit `hashStrategy` from annotation keys (description, title, examples, extensions).
- [ ] Add `newDataLayer: true, hashStrategy: BEFORE_SECOND_DATA_LEVEL` at each point
      where a nested independently-hashable entity is referenced, to isolate it and
      prevent cycle traversal.
- [ ] Verify the spec type is **not** `SPEC_TYPE_GRAPH_API` (that path is already skipped
      in `hash()` — don't add hash rules for GraphAPI until the feature is implemented).
