# JSON Schema meta flags and `required` — agent reference

Design (source of truth): `docs/design/json-schema/features/meta-flags-and-required.md`.

Reference for AI assistants working on **type-flag diffs** (`readOnly`, `writeOnly`, `deprecated`,
**parent `required`**) in the JSON Schema stack.

Grouped by **data model** (where diffs live) vs **viewer** (how they render). Includes session
learnings from the type-flags diff work (cases `001`–`013` under `type-changes/type-flags/`).

**Primary code paths**

| Layer | Role | Path |
| --- | --- | --- |
| Required meta on property nodes | `isRequiredJsonSchemaProperty` | `next-data-model/.../shared/json-schema/guards/tree-node.ts` |
| Required diff resolution | `resolveRequiredMetaDiff` | `next-data-model/.../node-diffs/kind-property.ts` |
| Meta-flag + required accessors | `takeJsonSchema*Diff`, normalization | `next-data-model/.../property-row-diffs.ts` |
| Title-row priority / yellow replace | `aggregatePropertyTitleRowDiff`, `asReplaceFlagDiffForTitleRow` | `kind-any.ts`, `kind-property.ts` |
| Legacy reference | `getRequiredChange`, `$metaChanges.required` | `api-data-model/.../json-schema/diff-tree/model.ts` |
| Title asterisk (diff mode) | `JsonSchemaRequiredDiffIndicator` | `api-doc-viewer/.../SchemaNodeViewer/` |
| Subheader tags | `JsonSchemaTitleRowViewProps.buildTagsProps` → `TagsWithDiffs` | `utils/json-schema-title-row-view-props.ts`, `JsonSchemaTitleSubheader.tsx` |
| Title-row background | `JsonSchemaTitleRowViewProps.buildRowDiffProps` → `TitleRow` | `utils/json-schema-title-row-view-props.ts` |

**Regression**

| Mode | Suite |
| --- | --- |
| Unit (data layer) | `packages/next-data-model/tests/unit-tests/json-schema-meta-flag-diffs.test.ts` |
| Storybook / IT | `packages/samples/json-schema-diffs/type-changes/type-flags/` → `type-flags-samples.*` |
| Case definitions | `packages/api-doc-viewer/bin/json-schema-type-changes-cases.mjs` (`collectTypeFlagsCases`) |
| Regenerate fixtures + stories | `node bin/generate-json-schema-type-changes-samples.mjs` |

---

## Session learnings — what was non-obvious

### 1. `required` is parent-scoped, not a property schema field

In JSON Schema, `required` is an array on the **parent object** (`required: ["name"]`). It is not a
boolean on the child property's merged fragment.

| Concern | Where it lives |
| --- | --- |
| Plain “is this property required?” | `meta.required` on the **property** node — derived by `isRequiredJsonSchemaProperty(key, parent)` reading `parent.value().required` |
| Diff “required status changed” | Resolved in `resolveRequiredMetaDiff` from the **parent** crawl fragment — not from the property's own crawl diffs |

Do not expect a `required` key on property node `value()` or property-level crawl diffs for
OpenAPI/JSON Schema object properties.

### 2. Legacy diff propagation shape (still authoritative)

Legacy `api-data-model` `getRequiredChange` established the contract the Next stack must honour:

1. During merge, the parent's `required` array may carry diffs under symbolic keys.
2. Diffs link **array index → property name** via `parent.required.indexOf(propertyKey)`.
3. Under `parent` changes, `required` may be:
   - a **single Diff** (whole array add/remove/replace), or
   - a **record** `{ "0": DiffAdd, "1": DiffRemove, … }` where values are **property name strings**
     (`afterValue: "name"`), not booleans.

For badge/asterisk display, **normalize** add/remove to boolean semantics:

- `DiffAdd` → `afterValue: true`
- `DiffRemove` → `beforeValue: true`

See `normalizeJsonSchemaRequiredMetaDiffForDisplay` in `property-row-diffs.ts`.

### 3. Trap: picked `parentValue.required` has no diff symbols

`parentNode.value().required` is a **picked copy** for display. Diff metadata is **not** copied onto
that array.

| Source | Safe for diff lookup? |
| --- | --- |
| `parentNode.value().required` | Index/content only — **no** `[DIFF_META_KEY]` on the array |
| `parentNode.meta()._fragment.required` | **Yes** — crawl fragment; array may have `[DIFF_META_KEY]` |
| `parentCrawlValue[DIFF_META_KEY].required` | **Yes** — whole-field or index-keyed record |

`resolveRequiredMetaDiff` must prefer the crawl fragment array and handle **both**:

- `parentCrawlDiffs.required` as a single `Diff` (whole array change), and
- `parentCrawlDiffs.required` as an index-keyed diffs record (legacy / OAS-normalized merge), and
- `requiredArray[DIFF_META_KEY][index]` (array-attached item diffs).

**Symptom when wrong:** unit tests pass (simple merge) but Storybook fails — asterisk on **both**
sides, no `required` badge, no yellow title row. Root cause is usually `requiredDiff === undefined`
while `meta.required === true`.

### 4. Storybook merge ≠ minimal unit-test merge

Type-flags Storybook cases use `prepareJsonDiffSchema()` (`preprocess.ts`): synthetic OAS template +
`apiDiff` with `unify`, `validate`, `liftCombiners`. That produces different diff attachment than a
bare `components.schemas` merge.

When adding or debugging required/meta-flag tests, include at least one case with the **OAS-normalized**
merge helper (see `mergeSchemasWithOasNormalize` in `json-schema-meta-flag-diffs.test.ts`).

### 5. Viewer layout — legacy split (easy to wire wrong)

| Chrome | Location | Component |
| --- | --- | --- |
| Red `*` (side-exclusive in diff mode) | **Title row** | `JsonSchemaRequiredDiffIndicator` |
| `required` **tag** | **Subheader** | `TagsWithDiffs` via `requiredChanged` + `requiredDiff` |
| `readOnly` / `writeOnly` / `deprecated` tags | Subheader | `TagsWithDiffs` only — not mixed into required indicator |

Do **not** look for the required badge only in `JsonSchemaTitleSubheader` title/type area — it is
driven by `JsonSchemaTitleRowViewProps.buildTagsProps`. A hardcoded `requiredChanged: false` there hides
the tag even when the data layer is correct.

Side-exclusive asterisk logic mirrors legacy `RequiredStar`: without a resolved `requiredDiff`, side-by-side
mode shows `*` on **both** sides whenever `meta.required === true` (unchanged required baseline).

### 6. Title-row yellow replace priority

`aggregatePropertyTitleRowDiff` (property nodes) and `aggregateTitleRowDiff` (any nodes) use:

1. Whole-node add/remove (`NODE_LEVEL_DIFF_KEY`) — wins outright
2. Meta flags (`readOnly`, `writeOnly`, `deprecated`)
3. **Required** meta diff (`nodeDiffs.required`)
4. Type-label field diffs

Meta-flag and required content changes use `asReplaceFlagDiffForTitleRow` — synthetic **replace** with
**yellow** row background (both sides in side-by-side layout).

Whole-node add/remove **suppresses** required and meta-flag diffs on the same property (`stripMetaFlagDiffsWhenWholeNode`).

### 7. Type-flags sample cases (001–013)

| Cases | Intent |
| --- | --- |
| `001`–`006` | readOnly / writeOnly / deprecated add & remove |
| `007`–`008` | parent `required` add & remove for a property |
| `009`–`011` | **unchanged** readOnly / writeOnly / deprecated (`before.yaml` === `after.yaml`) |
| `012`–`013` | **unchanged** required vs optional object property |

Unchanged pairs validate that flags/badges render in **document** style with **no** diff chrome.

Add cases in `collectTypeFlagsCases` inside `json-schema-type-changes-cases.mjs`, then regenerate.

### 8. Minor traps from the same session

| Trap | Correct approach |
| --- | --- |
| Import `@apihub/consts/tags` | Alias is `@apihub/constants/*` → `src/consts/*` |
| Required in `JSON_SCHEMA_META_FLAG_DIFF_KEYS` | **No** — `required` is property-only (`JsonSchemaKindPropertyNodeDiffs.required`) |
| Reuse legacy `RequiredStar` in Next stack | Use `JsonSchemaRequiredDiffIndicator` for diffs; keep legacy components untouched |

---

## Checklist — required diff looks wrong in Storybook

1. Run `json-schema-meta-flag-diffs.test.ts` — fail → fix `kind-property.ts` first.
2. Confirm OAS-normalized test case — fail only there → diff attachment / crawl fragment lookup bug.
3. Inspect tree node: `takeJsonSchemaRequiredMetaDiffForDisplay(node)` should return normalized boolean diff.
4. Inspect viewer wiring: `SchemaNodeTitleRowWithDiffs` passes `requiredDiff`;
   `JsonSchemaTitleRowViewProps.buildTagsProps` sets `requiredChanged` and `requiredDiff`.
5. Confirm title row: `takeJsonSchemaTitleRowDiff(node)?.styles.*.backgroundColor` is yellow for flag/required changes.

Fix **data layer first**; do not patch React to hide missing diffs.
