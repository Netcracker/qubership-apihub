# JSON Schema diff fixtures — node changes summary

Fixtures for the "node changes summary" marker-panel screenshot suite: a collapsed node shows a
row of colored dots (one per distinct diff type found anywhere in its descendants, plus its own
diffs) so a reader can tell something changed inside without expanding it.

Each case directory contains a standalone JSON Schema `before.yaml`/`after.yaml` pair (not wrapped
in OpenAPI). Generated once by `packages/api-doc-viewer/bin/generate-node-changes-summary-samples.mjs`
from `packages/api-doc-viewer/src/stories/shared/node-changes-summary-schema-builder.ts` — the
builder composes later cases out of earlier ones (case 2 embeds case 1, case 4 embeds case 2, case
6/7 embed cases 1-4 as `oneOf` variants), so re-run the generator (and commit its output) instead
of hand-editing these YAML files if the case shapes change.

## Cases

| Case | Schema shape | Change summary |
|---|---|---|
| `case-1-simple-properties` | object, 4 simple properties | `propAdded` wholly added, `propRemoved` wholly removed, `propDescriptionChanged` description changed, `propTypeChanged` type `string`→`integer` |
| `case-2-object-wrapping-case-1` | object, 2 properties | `caseOne` = case 1's schema, `unchangedProp` unchanged |
| `case-3-array-items-case-1` | array | `items` = case 1's schema |
| `case-4-array-items-case-2` | array | `items` = case 2's schema |
| `case-5-oneof-properties` | object, 4 `oneOf` properties | `oneOfAdded` wholly added, `oneOfRemoved` wholly removed, `oneOfNumberAdded` gains a `number` variant, `oneOfNumberRemoved` loses its `number` variant |
| `case-6-oneof-wrapping-object-cases` | object, 2 `oneOf` properties | `variantWithCaseOne` = `oneOf(string, case 1)`, `variantWithCaseTwo` = `oneOf(string, case 2)` - string listed first (default), see Storybook and screenshot tests below |
| `case-7-oneof-wrapping-array-cases` | object, 2 `oneOf` properties | `variantWithCaseThree` = `oneOf(string, case 3)`, `variantWithCaseFour` = `oneOf(string, case 4)` - string listed first (default) |

## Storybook and screenshot tests

`packages/api-doc-viewer/src/stories/json-schema-diffs-node-changes-summary-suite/` - one file per
case (`case-N-<slug>.stories.tsx`, sharing `node-changes-summary-utils.tsx`), each rendering its
sample through `JsonSchemaDiffsViewer` with `hideUnchangedNodes={false}`.
Splitting the suite by case (mirroring `json-schema-diffs-hiding-unchanged-nodes-suite/`'s
per-topic files) gives each case its own sidebar group in Storybook, named after the case's
schema shape rather than a generic "Case N":

| Case | File | Sidebar title | Stories (story `name` = variant) |
|---|---|---|---|
| 1 | `case-1-one-level-object.stories.tsx` | Case 1 — One Level Object | expanded root, collapsed root |
| 2 | `case-2-two-levels-object.stories.tsx` | Case 2 — Two Levels Object | expanded root + expanded first property, expanded root + collapsed first property, collapsed root |
| 3 | `case-3-array-of-one-level-object-in-items.stories.tsx` | Case 3 — Array Of One Level Object In Items | expanded root, collapsed root |
| 4 | `case-4-array-of-two-levels-object-in-items.stories.tsx` | Case 4 — Array Of Two Levels Object In Items | expanded root + expanded items, expanded root + collapsed items, collapsed root |
| 5 | `case-5-one-level-object-with-primitive-combiner-variants.stories.tsx` | Case 5 — One Level Object With Primitive Combiner Variants | expanded root, collapsed root |
| 6 | `case-6-one-level-object-with-object-combiner-variant.stories.tsx` | Case 6 — One Level Object With Object Combiner Variant | expanded root with `object` variant chosen, collapsed root |
| 7 | `case-7-one-level-object-with-array-combiner-variant.stories.tsx` | Case 7 — One Level Object With Array Combiner Variant | expanded root + chosen `array` + expanded items, expanded root + chosen `array` + collapsed items, expanded root with default choice, collapsed root |

IT tests mirror the same per-case split, flat under `packages/api-doc-viewer/src/it/` with a
dotted suite prefix (matching `json-schema-diffs-hiding-unchanged-nodes-suite.*.it-test.ts`):
`json-schema-diffs-node-changes-summary-suite.case-N-<slug>.it-test.ts`.

**Combiner variant selection is scripted in the paired IT test, not baked into the fixture.**
Cases 6-7's stories render through `JsonSchemaDiffsViewer`
(`packages/api-doc-viewer/src/stories/json-schema-diffs-node-changes-summary-suite/node-changes-summary-utils.tsx`),
whose combiner picker (`CombinerSelectorRow`,
`packages/api-doc-viewer/src/components/JsonSchemaViewer/CombinerNodeViewer/CombinerSelectorRow.tsx`)
carries `data-testid="json-schema-combiner-option-<index>"` on each option button - index-based,
not keyed by JSON pointer, and the same index repeats once per combiner property AND once per
diff side (`SideBySideLayout` renders both sides from one shared selection state, so either side's
button works). Storybook `play` functions do not fire when these stories are loaded directly via
`iframe.html` in the screenshot-test harness, so the case 6/7 IT test files click these testids
directly with Puppeteer (mirroring `switchToChannelSection()` in
`async-api-diffs-suite.channel.it-test.ts`), scoped to the right property via its enclosing
`json-schema-combiner-node-viewer` container (see the IT test files' `selectCombinerOption()`
helper). Cases 6-7's "chosen variant" stories all use the same string-first fixture as their
sibling stories; the IT test clicks the `object`/`array` option to select it.

Case 6 has only 2 stories (not the originally-planned 4): selecting the `object` variant already
renders its properties without a further expand step needed at this suite's `expandedDepth`
values, so there is no independently-toggleable "object chosen, but its properties collapsed"
state to give a 3rd/4th story. Case 7 also has no working "expanded items" story despite keeping
4 stories for historical reasons: a combiner-leaf array does not currently get an expandable
`items` child in `JsonSchemaViewer` at all (no structural children, no expander control) -
the same "root-level array renders as a summary only" limitation documented in
`packages/samples/json-schema-diffs/extensions/README.md`, here shown to also apply to a plain
single-schema `items:` once the array is a combiner leaf, not the schema root. The IT test no
longer attempts an items-expand click; "expanded items" and "collapsed items" currently render
identically.

## Regenerate

From `packages/api-doc-viewer/`, then commit the output:

```bash
node bin/generate-node-changes-summary-samples.mjs
npm run regenerate-screenshots
```
