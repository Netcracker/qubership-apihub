# Meta flags and `required`

How `readOnly`, `writeOnly`, `deprecated`, and the parent's `required` list are shown on a
property, with and without diffs.

## Semantics

- `required` is **parent-scoped**: it is an array on the parent object, not a field of the
  property. A property is required when its key is in `parent.required`
  (`isRequiredJsonSchemaProperty`), stored as `meta.required` on the property node.
- `readOnly`, `writeOnly`, and `deprecated` are fields of the property's own schema.

## Plain

| Element | Location | Rule |
| --- | --- | --- |
| Red `*` after the name | title row | shown when `meta.required` |
| **read-only** / **write-only** / **deprecated** tags | subheader | shown when the flag is `true` |
| **required** tag | subheader | never in plain mode |

## With diffs

| Element | Rule |
| --- | --- |
| Red `*` | side-exclusive: shown only on the side where the property is required (`JsonSchemaRowDiffs.RequiredStar.isVisibleOnSide`); unchanged required properties show it on both sides |
| **required** tag | shown only when the required status changed and the property itself was not wholly added or removed |
| Flag tags | shown when the flag is `true` on a side or has its own diff; highlighted only by **their own** diff |
| Title row | yellow replace when a meta flag or the required status changed |

### Title-row priority

1. Whole-node add / remove — wins outright and suppresses flag and required diffs on the same node.
2. Node key rename — see [node-key-rename.md](node-key-rename.md); the node's own diffs still apply
   to their elements.
3. Meta flags.
4. Required status.
5. Type-label field diffs.

Flag and required changes become a synthetic **replace** for the title row (yellow on both sides).

### Required diff shape

A merged document can carry the parent's `required` change as a whole-array diff, as an
index-keyed record whose values are property names, or as item diffs attached to the array. Each
shape is normalized to boolean semantics for display: `add` → `afterValue: true`,
`remove` → `beforeValue: true`.

## Not displayed

- A wholly added or removed property shows its `true` flags as plain tags, not green or red.
  A tag is never highlighted with a diff borrowed from the node or another flag.

## Fixtures

`packages/samples/json-schema-diffs/type-changes/type-flags/`:

| Cases | Intent |
| --- | --- |
| `001`–`006` | readOnly / writeOnly / deprecated added and removed |
| `007`–`008` | parent `required` added and removed |
| `009`–`011` | unchanged flags — document style, no diff chrome |
| `012`–`013` | unchanged required vs. optional property |
