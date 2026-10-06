# AsyncAPI — display coverage

Baseline for the AsyncAPI stack (`AsyncApiOperationViewer` / `AsyncApiOperationDiffsViewer` +
`AsyncApiTreeBuilder` / `AsyncApiTreeWithDiffsBuilder`). Assumes **current behaviour is correct**:
this document records what is shown today, what is omitted on purpose, and how to classify a gap
before planning work or writing tests.

Last reviewed against the codebase: 2026-09-25.

## Sources

Keep in sync when behaviour changes.

| Layer | Location |
| --- | --- |
| Operation → message-oriented spec | `packages/next-data-model/src/building-service/async-api/shared/async-api-spec-transformer.ts` |
| Merged diffs → message-oriented spec | `packages/next-data-model/src/building-service/async-api/shared/async-api-spec-with-diffs-transformer.ts` |
| Crawl rules / transformers | `packages/next-data-model/src/building-service/async-api/json-crawl-entities/` |
| Builders and aggregators | `packages/next-data-model/src/building-service/async-api/{tree,tree-with-diffs}/` |
| Tree model | `packages/next-data-model/src/model/async-api/` (`types/node-kind.ts`, `types/node-value.ts`) |
| Row visibility | `packages/api-doc-viewer/src/utils/async-api/visibility-checkers.ts` (`shouldBeDisplayed`) |
| Viewers | `packages/api-doc-viewer/src/components/AsyncApiOperationViewer/` |
| Fixture catalogues | `packages/samples/async-api-diffs/README.md`; plain fixtures are inline in `src/stories/async-api-suite/shared-test-data/` |

## Scope

One AsyncAPI 3.0 **operation** and one of its **messages**, selected by `operationKeys`
(defaults resolved by `operationKeysOrDefaults`). The transformer reshapes the operation-oriented
document into a message-oriented spec whose root is the message. Not a channel or server browser.

| Viewer | Props |
| --- | --- |
| `AsyncApiOperationViewer` | `source`, `operationKeys`, `displayMode`, `devMode`, `noHeading`, `referenceNamePropertyKey` |
| `AsyncApiOperationDiffsViewer` | `mergedSource` instead of `source`, plus `diffMetaKeys`, `diffTypes` |

Plain and with-diffs rendering share **one** set of node viewers: each viewer detects a with-diffs
node (`useNodeDiffState`, `is*NodeWithDiffs`) and adds diff props when present.

## Pipeline

```text
AsyncAPI document | merged diff document
  → AsyncApiSpecTransformer | AsyncApiSpecWithDiffsTransformer   (message-oriented spec)
  → AsyncApiTreeBuilder | AsyncApiTreeWithDiffsBuilder
  → AsyncApiOperationViewer | AsyncApiOperationDiffsViewer
  → MessageNodeViewer → MessageSectionsViewer → Message | Channel | Operation section viewers
```

Nested documents are rendered by other stacks: headers, payload and channel parameters by the
JSON Schema viewers; bindings and extensions by the JSO viewers. Diagrams:
[architecture/](architecture/).

## Classification tags

| Tag | Meaning |
| --- | --- |
| **`viewer`** | Shown today. |
| **`ndm-reserved`** | Present in the tree node value but not painted. |
| **`intentional-gap`** | Product decision — absence is **not** a regression. |
| **`planned`** | Accepted follow-up; not implemented yet. |

## Displayed (plain)

### Message header (`MessageNodeViewer`)

| UI element | Condition | Tree source |
| --- | --- | --- |
| Message title (h1) | unless `noHeading`; `title`, else the node key | `message.title` |
| Address row | always | `action` badge (`SEND` / `RECEIVE`) + `address` (`<address unknown>` when absent) |
| Description | `description` present | `message.description` |
| Summary | `summary` present | `message.summary` |
| Section selector | always | `Message` / `Channel` / `Operation` tabs; the first tab is selected initially |

### Message section (`MessageContentNodeViewer`)

Rows in rendering order:

| UI element | Condition | Rendered by |
| --- | --- | --- |
| `Headers` (h3) + schema | `headers` present | `JsonSchemaViewer`, root wrapped as `Type`, root nesting indicator suppressed |
| `Extensions` (h3) | `x-*` keys on the message | `JsoViewer` |
| `Bindings` (h3) | `bindings` present | see **Bindings** |
| `Payload` (h3) + schema | `payload` present | `JsonSchemaViewer`, same wrapping as headers |

### Channel section (`MessageChannelNodeViewer`)

| UI element | Condition | Rendered by |
| --- | --- | --- |
| Channel title (h2) | `title`, else the node key | `TitleRow` |
| Description, summary | present | `TextRow` (h5) |
| `Address Parameters` (h3) | `parameters` present | `JsonSchemaViewer`; each parameter gets a `Location` custom annotation row |
| `Servers` (h3) | `servers` present | one server block per server |
| `Extensions` (h3) | `x-*` keys on the channel | `JsoViewer` |
| `Bindings` (h3) | `bindings` present | see **Bindings** |

### Server block (`MessageChannelServerNodeViewer`)

| UI element | Condition |
| --- | --- |
| Server title (h4) | `title`, else the node key |
| Server address row | `protocol` + `host` |
| Description, summary | present (h6) |
| `Bindings` (h5, secondary size) | server `bindings` present |

### Operation section (`MessageOperationNodeViewer`)

| UI element | Condition |
| --- | --- |
| Operation title (h2) | `title`, else the node key |
| Description, summary | present (h5) |
| `Extensions`, `Bindings` | present |

### Bindings (`BindingsNodeViewer`)

| UI element | Condition |
| --- | --- |
| `Bindings` title with protocol selector | ≥1 binding; the selector is hidden when `meta.brokenRef` is set |
| `Version` row | always for the selected binding; `latest` when `bindingVersion` is absent |
| Binding content | `JsoViewer` over the selected binding without `bindingVersion` |

## Displayed (with diffs)

`AsyncApiOperationDiffsViewer` renders the same rows in `SIDE_BY_SIDE_DIFFS_LAYOUT_MODE`. Diff
props come from `buildRowDiffProps` over precomputed `nodeDiffs`, `descendantDiffs`, and
`diffsSeverities`.

| Area | Diff key | Severity placement |
| --- | --- | --- |
| Message / channel / operation / server title | `title` | `title-row` |
| Address row (action badge hidden on the absent side; partial replace keeps the common prefix) | `address` | `address-row` |
| Description / summary | `description` / `summary` | `description-row` / `summary-row` |
| Section selector | node-level diff, per-tab summaries | selector option markers |
| Server address row | `protocol`, `host` (max severity of both) | `server-address-row` |
| Binding version | `version` | `binding-version-row` |
| `Headers` / `Payload` / `Address Parameters` / `Extensions` / `Bindings` / `Servers` titles | node-level diff | `title-row` |
| Headers, payload, parameters content | continues in `JsonSchemaDiffsViewer` | JSON Schema placements |
| Bindings and extensions content | continues in `JsoDiffsViewer` | JSO placements |

Descendant summaries cross tree boundaries through the forward aggregators `kind-binding`,
`kind-message-content`, `kind-channel`, and `kind-operation`, which read
`aggregatedDiffsMetaKey` from the merged document.

## Not displayed

| Item | Tag | Notes |
| --- | --- | --- |
| `message.internalTitle` (renamed from `name`) | `ndm-reserved` | Kept on the value; the title row uses `title` or the key. |
| `schemaFormat` of headers / payload | `ndm-reserved` | Schemas are always rendered as JSON Schema. |
| Hiding unchanged rows | `planned` | JSON Schema has it; AsyncAPI row slots and visibility would first move into next-data-model. |
| Row visibility in next-data-model | `planned` | Visibility still lives in the viewer (`shouldBeDisplayed`). |
| Diff-type filters on rows | `planned` | `DiffTypesContext` is provided; `DiffFloatingBadgeWrapper` keeps `hidden={false}`. |
| Channel / server / operation browser | `intentional-gap` | Scope is one operation + one message. |
| Layout modes other than document / side-by-side | `intentional-gap` | Plain viewer supports `DOCUMENT_LAYOUT_MODE` only. |

## Triage rules

1. Check a fixture against **Displayed** before filing a bug.
2. A missing row inside headers, payload, parameters, bindings, or extensions is triaged against
   the JSON Schema or JSO coverage — not here.
3. Diff semantics are fixed in next-data-model aggregators, not in viewers.

## Regression coverage

| Suite | Stories | Fixtures |
| --- | ---: | --- |
| `Async API Suite` (message general, content, channel, operation) | 66 | inline in `src/stories/async-api-suite/shared-test-data/` |
| `Async API Diffs Suite` (message, channel, channel server, channel parameters, operation, whole operation) | 169 | `packages/samples/async-api-diffs/` |

## Related documents

- Architecture diagrams: [architecture/](architecture/)
- JSON Schema coverage (nested schemas): [../json-schema/display-coverage.md](../json-schema/display-coverage.md)
- JSO diffs specification (bindings, extensions): [../jso/features/diffs.md](../jso/features/diffs.md)
