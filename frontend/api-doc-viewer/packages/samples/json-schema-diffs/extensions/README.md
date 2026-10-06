# JSON Schema diff fixtures — extensions

Hand-written YAML pairs for screenshot-diff scenarios exercising specification
extension (`x-`-prefixed) properties — see OAS 3.0/3.1 and JSON Schema
draft-07 — in the JSON Schema diffs viewer. All cases are **root-only**
(no property/`items`-location split, unlike the plain `json-schema/extensions/`
suite).

- Total cases: 104 (4 types × 8 "existing 1 extension" + 4 types × 14
  "existing 2 extensions" + 8 "node diff → extension inheritance" suites × 2 cases)
- Layout: `json-schema-diffs/extensions/<suite>/<case-id>/before.yaml` and
  `.../after.yaml`
- Each file is a **standalone JSON Schema** document (not wrapped in OpenAPI).

## Cases

### Extension value catalog

Every case is built from a fixed catalog of extension keys/values, so the
same "kind" of extension always reads the same way across cases. A
"secondary" key is used whenever a case needs two coexisting extensions of
the same kind (e.g. two primitives) without a key collision.

| Kind | Primary key: value | Secondary key: value | "Replaced" value (differs from both) |
| --- | --- | --- | --- |
| primitive | `x-internal: true` | `x-version: '1.0.0'` | `false` |
| object | `x-metadata: {owner: platform-team}` | `x-labels: {team: core}` | `{owner: growth-team}` |
| array | `x-tags: [beta, internal]` | `x-owners: [team-a, team-b]` | `[ga, public]` |
| simple JSON Schema | `x-value-schema: {type: integer, minimum: 0}` | `x-response-schema: {type: string, minLength: 1}` | `{type: boolean}` |

### Suites 1–4 — "Existing 1 `<type>` extension"

Starting state: one extension of the given type at the schema root
(`existing-1-primitive/`, `existing-1-object/`, `existing-1-array/`,
`existing-1-json-schema/`).

| Case id | Change |
| --- | --- |
| `01-add-primitive` | + 1 more primitive extension added (secondary key if the base type is already primitive) |
| `02-add-object` | + 1 more object extension added |
| `03-add-array` | + 1 more array extension added |
| `04-add-json-schema` | + 1 more simple-JSON-Schema extension added |
| `05-replace-to-primitive` | Value replaced → another primitive (same key) |
| `06-replace-to-object` | Value replaced → object (same key) |
| `07-replace-to-array` | Value replaced → array (same key) |
| `08-replace-to-json-schema` | Value replaced → simple JSON Schema (same key) |

### Suites 5–8 — "Existing 2 `<type>` extensions"

Starting state for the "removed" cases is the mixed pair `{<type>, X}` — the
outcome of the matching "1 more X added" case above. Starting state for the
"replaced"/combo cases is the same-type pair `{<type>, <type>}` (primary +
secondary key). Combo cases use two auxiliary types, cycling deterministically
through `[primitive, object, array, json-schema]` starting right after the
base type, so each of the four sections exercises different concrete type
combinations.

| Case id | Change |
| --- | --- |
| `01-primitive-removed` | Base pair `{<type>, primitive}` → primitive extension removed |
| `02-object-removed` | Base pair `{<type>, object}` → object extension removed |
| `03-array-removed` | Base pair `{<type>, array}` → array extension removed |
| `04-json-schema-removed` | Base pair `{<type>, json-schema}` → JSON Schema extension removed |
| `05-replaced-to-primitive` | Secondary extension's value replaced → primitive |
| `06-replaced-to-object` | Secondary extension's value replaced → object |
| `07-replaced-to-array` | Secondary extension's value replaced → array |
| `08-replaced-to-json-schema` | Secondary extension's value replaced → simple JSON Schema |
| `09-added-and-removed` | Secondary extension removed; a new extension (auxiliary type 1) added |
| `10-removed-and-replaced` | Secondary extension removed; primary extension's value replaced → auxiliary type 1 |
| `11-added-and-replaced` | Secondary extension's value replaced → auxiliary type 1; a new extension (auxiliary type 2) added |
| `12-both-replaced` | Primary extension's value replaced → auxiliary type 1; secondary → auxiliary type 2 |
| `13-both-added` | Starting state has no extensions → both primary and secondary extensions added at once (wholly-added group) |
| `14-both-removed` | Starting state is the same-type pair `{<type>, <type>}` → both extensions removed at once (wholly-removed group) |

### Suites 9–16 — Node diff → extension inheritance (JSON Schema Viewer ↔ JSO Viewer seam)

The whole-node add/remove diff (a property/array item appearing or disappearing) is rendered
by the JSON Schema Viewer, but the extensions attached to that node are rendered by the
(separate) JSO Viewer embedded within it. These 8 suites check that a node's "added"/"removed"
diff status correctly inherits into its JSO-rendered extensions when the whole node — including
its extensions — is inserted or deleted, across every root shape the viewer supports: plain
`object`/`array`, and `object`/`array` nested inside `oneOf`/`anyOf`/`allOf`. This is untested
by suites 1–8 above, which only cover extension *value* diffs at an already-present node.

Each suite has 2 fixed members plus (for combiner suites) one static, unchanged sibling
option:

- First member: simple primitive, no extensions (`name: {type: string}` for object suites,
  `items[0]: {type: string}` for array suites).
- Second member: simple primitive carrying 2 extensions —
  `{type: integer, x-internal: true, x-version: '1.0.0'}` (reusing the primitive kind's
  primary/secondary keys from the catalog above).
- Sibling option, `oneOf`/`anyOf` suites only: `{type: boolean}` — a genuine alternative,
  since `oneOf`/`anyOf` pick one matching branch.
- Sibling option, `allOf` suites only: `{description: 'Unchanged constraint'}` — **not**
  `{type: boolean}`. `allOf` intersects all members against the *same* instance, so a `boolean`
  sibling next to an `object`/`array` member is self-contradictory (no value can satisfy both
  types) and the viewer correctly renders the merged type as `nothing`, defeating the case. A
  type-free constraint composes with the object/array member instead of conflicting with it.

| Suite dir | Root shape |
| --- | --- |
| `object-two-properties/` | `object` with 2 properties |
| `array-two-items/` | `array` with 2 indexed items (tuple) |
| `oneof-object-two-properties/` | `oneOf: [<object-two-properties>, boolean]` |
| `oneof-array-two-items/` | `oneOf: [<array-two-items>, boolean]` |
| `anyof-object-two-properties/` | `anyOf: [<object-two-properties>, boolean]` |
| `anyof-array-two-items/` | `anyOf: [<array-two-items>, boolean]` |
| `allof-object-two-properties/` | `allOf: [<object-two-properties>, {description: 'Unchanged constraint'}]` |
| `allof-array-two-items/` | `allOf: [<array-two-items>, {description: 'Unchanged constraint'}]` |

Each suite has 2 cases:

| Case id (object suites) | Case id (array suites) | Change |
| --- | --- | --- |
| `01-second-property-added` | `01-second-item-added` | before: only the first member → after: both members, second one already carrying its extensions |
| `02-second-property-removed` | `02-second-item-removed` | before: both members (second with extensions) → after: only the first member |

#### Known gap — the 4 array-shaped suites don't currently prove anything

`array-two-items`, `oneof-array-two-items`, `anyof-array-two-items`, and `allof-array-two-items`
use root-level **tuple/indexed** `items:` (a YAML list — `items[0]`/`items[1]`), mirroring
`type-changes/array-indexed-items/`. As of this writing, the JSON Schema diffs viewer
renders a root-level tuple array as a **text summary only** ("Tuple array with N indexed item
schema(s)", `Unique items`, `Items count`) — it does **not** render the individual indexed items
as inspectable child nodes. Confirmed by DOM inspection against the pre-existing, committed
`array-indexed-items` suite (not just these new fixtures): only one `JsonNode` element exists
for a 2-item tuple array, and the container's full content height is ~138px — there is nothing
hidden or collapsed to expand.

Practical effect: `items[1]` (the property carrying `x-internal`/`x-version`) is never rendered,
so these 4 suites' before/after screenshots will look identical regardless of whether the
extension-inheritance seam works correctly — **they cannot currently catch a regression in this
area**. They are kept anyway, deliberately, as a forward-looking regression trap: if/when the
viewer gains tuple-item rendering, these fixtures are already in place to exercise it, and their
baseline screenshots will visibly change the moment that rendering exists (which is itself a
signal worth noticing). The 4 object-shaped suites above (`object-two-properties`,
`oneof-object-two-properties`, `anyof-object-two-properties`, `allof-object-two-properties`) are
the ones that actually verify the seam today — confirmed visually (added `count` property and
its `x-internal`/`x-version` extensions correctly inherit the green "added" diff state; same for
combiner-wrapped variants) before these fixtures were committed.

## Storybook and screenshot tests

Hand-written suites live under
`packages/api-doc-viewer/src/stories/json-schema-diffs-extensions-suite/`
and `packages/api-doc-viewer/src/it/`, reusing the generic helpers in
`json-schema-diffs-suite/json-schema-diffs-utils.tsx`
(`createJsonSchemaDiffsViewerArgs`, `createSampleById` from `utils/sample-cases.ts`,
`createJsonSchemaDiffCaseStoryFactory`, `JsonSchemaDiffSamplesStory`). The same module also
provides the `JsonSchemaDiffSamplesStoryOas31` and
`JsonSchemaDiffSamplesStoryWithDisabledSubstitutionTitle` story variants.

| Suite | Story title | Story / IT files |
| --- | --- | --- |
| Existing 1 Primitive | `JSON Schema Diffs Suite (Extensions)/Existing 1 Primitive` | `existing-1-primitive.*` |
| Existing 1 Object | `JSON Schema Diffs Suite (Extensions)/Existing 1 Object` | `existing-1-object.*` |
| Existing 1 Array | `JSON Schema Diffs Suite (Extensions)/Existing 1 Array` | `existing-1-array.*` |
| Existing 1 JSON Schema | `JSON Schema Diffs Suite (Extensions)/Existing 1 JSON Schema` | `existing-1-json-schema.*` |
| Existing 2 Primitive | `JSON Schema Diffs Suite (Extensions)/Existing 2 Primitive` | `existing-2-primitive.*` |
| Existing 2 Object | `JSON Schema Diffs Suite (Extensions)/Existing 2 Object` | `existing-2-object.*` |
| Existing 2 Array | `JSON Schema Diffs Suite (Extensions)/Existing 2 Array` | `existing-2-array.*` |
| Existing 2 JSON Schema | `JSON Schema Diffs Suite (Extensions)/Existing 2 JSON Schema` | `existing-2-json-schema.*` |
| Object Two Properties | `JSON Schema Diffs Suite (Extensions)/Node Diff to Extension Inheritance/Object Two Properties` | `object-two-properties.*` |
| Array Two Items | `JSON Schema Diffs Suite (Extensions)/Node Diff to Extension Inheritance/Array Two Items` | `array-two-items.*` |
| OneOf Object Two Properties | `JSON Schema Diffs Suite (Extensions)/Node Diff to Extension Inheritance/OneOf Object Two Properties` | `oneof-object-two-properties.*` |
| OneOf Array Two Items | `JSON Schema Diffs Suite (Extensions)/Node Diff to Extension Inheritance/OneOf Array Two Items` | `oneof-array-two-items.*` |
| AnyOf Object Two Properties | `JSON Schema Diffs Suite (Extensions)/Node Diff to Extension Inheritance/AnyOf Object Two Properties` | `anyof-object-two-properties.*` |
| AnyOf Array Two Items | `JSON Schema Diffs Suite (Extensions)/Node Diff to Extension Inheritance/AnyOf Array Two Items` | `anyof-array-two-items.*` |
| AllOf Object Two Properties | `JSON Schema Diffs Suite (Extensions)/Node Diff to Extension Inheritance/AllOf Object Two Properties` | `allof-object-two-properties.*` |
| AllOf Array Two Items | `JSON Schema Diffs Suite (Extensions)/Node Diff to Extension Inheritance/AllOf Array Two Items` | `allof-array-two-items.*` |

Story id pattern: `{meta-id}--case-{case-id}` (for example
`json-schema-diffs-suite-extensions-existing-1-primitive--case-01-add-primitive`, or
`json-schema-diffs-suite-extensions-node-diff-to-extension-inheritance-object-two-properties--case-01-second-property-added`
for the new suites). Meta ids were derived from the title strings above and confirmed against
a built Storybook `index.json` before the IT files were written (per the
`api-doc-viewer-testing` skill's story-id verification step) — verified with
`bin/audit-story-id-mismatches.mjs`, 0 mismatches.

## Regenerate

Hand-written fixtures; there is no generator. After visual changes:

```bash
cd packages/api-doc-viewer
npm run regenerate-screenshots
```
