---
description: Consume next-data-model inside api-doc-viewer — tree builders, node traversal, diff fields, and row-level diff props.
---

# Using next-data-model in api-doc-viewer

`@netcracker/qubership-apihub-next-data-model` is a **private monorepo package**.
It builds typed trees that viewer components render. Use this skill when wiring
viewers to trees or reading diff metadata on nodes — not when changing builders
or aggregators (see `next-data-model-authoring`).

## Import paths

The package root reexports AsyncAPI builders only:

```typescript
import {
  AsyncApiTreeBuilder,
  AsyncApiTreeWithDiffsBuilder,
  createAsyncApiLogger,
} from '@netcracker/qubership-apihub-next-data-model'
```

JSO and shared types use **subpaths** (stable within the monorepo):

```typescript
import { JsoTreeBuilder } from '@netcracker/qubership-apihub-next-data-model/building-service/jso/tree/builder'
import { JsoTreeWithDiffsBuilder } from '@netcracker/qubership-apihub-next-data-model/building-service/jso/tree-with-diffs/builder'
import { NODE_LEVEL_DIFF_KEY, NodeDiffsSeverityPlacemennt } from '@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/tree-node.interface'
import { AsyncApiTreeNodeKinds } from '@netcracker/qubership-apihub-next-data-model/model/async-api/types/node-kind'
```

Inside `packages/api-doc-viewer`, the `@apihub/next-data-model/…` alias may
also be used — mirror whichever style the surrounding file already uses.

## Building trees in viewers

Instantiate a builder in `useMemo`, call `.build()` once per source change,
then walk from `tree.root`:

| Viewer | Builder | Source prop | Extra args |
| --- | --- | --- | --- |
| `AsyncApiOperationViewer` | `AsyncApiTreeBuilder` | `source` | `referenceNamePropertyKey`, optional `operationKeys`, optional logger |
| `AsyncApiOperationDiffsViewer` | `AsyncApiTreeWithDiffsBuilder` | `mergedSource` | above + `diffMetaKeys` |
| `JsoViewer` | `JsoTreeBuilder` | `source` | `supportJsonSchema` |
| `JsoDiffsViewer` | `JsoTreeWithDiffsBuilder` | `mergedSource` | `supportJsonSchema`, `diffMetaKeys`, optional `diffTypes` |

`referenceNamePropertyKey` must be the same `Symbol` used when the merged
document was produced (host normalisation pipeline — e.g.
`FIRST_REFERENCE_KEY_PROPERTY`; Storybook uses `TEST_REFERENCE_NAME_PROPERTY`).

Guard the root: AsyncAPI viewers expect a message node; JSO viewers iterate
`root.childrenNodes()`.

## Traversing nodes

Tree nodes expose:

- `node.value()` — typed value object for the current fragment.
- `node.childrenNodes()` — ordered child property nodes.
- `node.nestedNodes()` — nested structural nodes (when applicable).
- `node.key` — property name / index key.

Discriminate AsyncAPI nodes with `AsyncApiTreeNodeKinds` and helpers under
`@apihub/utils/async-api/node-type-checkers`. Prefer existing guards in
`shared-utilities/tree-node-guards.ts` over new `instanceof` checks.

## Reading diff state on nodes

Diff-aware node classes carry three fields the view layer consumes:

- `node.diffs` — per-property changes; key `NODE_LEVEL_DIFF_KEY` (`""`) marks
  whole-node add/remove/replace.
- `node.descendantDiffs` — keyed by descendant `key`.
- `node.diffsSeverities` — keyed by `NodeDiffsSeverityPlacemennt` (`TitleRow`,
  `DescriptionRow`, `SummaryRow`, …).

Do **not** recompute diffs in React — read these precalculated fields.

### Row-level diff wiring

Use the shared helpers in `shared-components/diffs/node-diff-props.ts`:

```typescript
const nodeDiffState = useNodeDiffState(node, isMessageNodeWithDiffs)
const titleDiffProps = buildRowDiffProps(nodeDiffState, { diffKey: 'title' })
// spread onto TitleRow / TextRow: {...titleDiffProps}
```

`buildRowDiffProps` resolves property-level diffs, optional fallback to
`NODE_LEVEL_DIFF_KEY`, descendant badges, and severity placement. Pass
`diffsSeverityPlacement` when the row is not the title row.

### CSS classes from diff metadata

`DiffsClassesBuilder` (under
`building-service/abstract/tree-with-diffs/node-diffs-data/utilities`) turns
`ChangedPropertyMetaData` into highlight CSS classes — use it in style hooks
(`useJsoValueWithDiffsStyles`, `TextRowContent`, etc.) instead of hand-picking
class names from diff types.

## Context providers

Top-level diffs viewers wrap children with:

- `DiffMetaKeysContext` — keys used to read diff properties off the merged JSO.
- `DiffTypesContext` — optional severity filter list.
- `LayoutModeContext` — `SIDE_BY_SIDE_DIFFS_LAYOUT_MODE` for diffs viewers.
- `DisplayModeContext`, `LevelContext` / `AsyncLevelContextProvider`.

Node-level viewers inherit these; do not thread `diffMetaKeys` down as props
when context is already available.

## Visibility with diffs

`shouldBeDisplayed` (`utils/async-api/visibility-checkers`) combines plain
display rules with diff presence — use it so added/removed fields remain
visible in diffs mode even when `displayMode` is `'simple'`.

## Scope boundary

Changes to crawl rules, aggregators, or node implementations belong in
`packages/next-data-model/src` — switch to `next-data-model-authoring`. This
skill covers **consumption** from `packages/api-doc-viewer/src` only.
