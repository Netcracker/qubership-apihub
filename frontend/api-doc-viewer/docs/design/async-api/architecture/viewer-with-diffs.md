# AsyncAPI — viewer, with diffs

Paths are relative to `packages/api-doc-viewer/src/components/AsyncApiOperationViewer/`. Abstract
layer: [../../shared/architecture/viewer-with-diffs.md](../../shared/architecture/viewer-with-diffs.md).

AsyncAPI has **no separate with-diffs node viewers**: the plain components (see
[viewer-plain.md](viewer-plain.md)) detect with-diffs nodes and add diff props. Only the root,
the providers, and the nested viewers differ.

```mermaid
flowchart TB
  RootD["AsyncApiOperationDiffsViewer.tsx<br/>AsyncApiTreeWithDiffsBuilder · DiffMetaKeysContext · DiffTypesContext ·<br/>LayoutModeContext (SIDE_BY_SIDE_DIFFS)"]
  NodeViewers["Message / Sections / Content / Channel / Operation /<br/>Servers / Server / Bindings / Extensions viewers<br/>(shared with plain)"]
  DiffState["shared-components/diffs/node-diff-props.ts<br/>useNodeDiffState · toNodeDiffState · buildRowDiffProps<br/>(diffKey · diffsSeverityPlacement · fallbackToNodeDiff)"]
  Guards["shared-utilities/tree-node-guards.ts<br/>is*NodeWithDiffs"]
  Rows["TitleRow · TextRow · AddressRow · ServerAddressRow<br/>→ DiffFloatingBadgeWrapper → SideBySideLayout"]
  SectionSelector["MessageSectionsViewer<br/>Selector options with diffsSummary · descendantDiffsSummary"]
  JsonSchemaD["JsonSchemaDiffsViewer<br/>(headers · payload · parameters)"]
  JsoD["JsoDiffsViewer<br/>(bindings · extensions)"]
  Wrap["wrapJsonSchemaForDiffsViewer ·<br/>prepareBindingValueInCaseOfWhollyChanged"]

  RootD --> NodeViewers
  NodeViewers --> Guards
  NodeViewers --> DiffState
  NodeViewers --> Rows
  NodeViewers --> SectionSelector
  NodeViewers --> Wrap
  Wrap --> JsonSchemaD
  Wrap --> JsoD
```

## Notes

- A wholly added or removed binding or schema is wrapped so the nested viewer receives a merged
  value with the node-level diff attached at its root.
- `JsoDiffsViewer` installs its own contexts, so AsyncAPI-level filters do not reach bindings and
  extensions.
