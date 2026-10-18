# Viewer — plain (abstract)

The API-type-agnostic shape of a plain viewer in `api-doc-viewer`. API-type diagrams replace the
**API type** subgraph with their concrete components.

```mermaid
flowchart TB
  subgraph ROOT["API type root viewer"]
    Root["&lt;Spec&gt;Viewer<br/>ErrorBoundary · builder in useMemo · build()"]
    Providers["DisplayModeContext · LayoutModeContext (DOCUMENT)<br/>LevelContext · CustomizationOptionsContext"]
  end

  subgraph SPEC["API type components (containers)"]
    Dispatch["node dispatch by kind"]
    Containers["&lt;Kind&gt;NodeViewer<br/>reads node.value() + visibility manager"]
  end

  subgraph SHARED["components/shared-components (presentational)"]
    TitleRow["TitleRow"]
    TextRow["TextRow · MarkdownTextRow"]
    AddInfo["AdditionalInfoRow · AdditionalInfoPiece"]
    Nesting["NestingIndicatorTitleRow"]
    Selector["Selector"]
    Subheader["SubheaderValue · TextValue"]
    Layout["Layout/OneSideLayout · LevelIndicator · Expander"]
    Preceded["WithPrecededByProps (data-precededby spacing)"]
  end

  NDM["next-data-model<br/>tree nodes · visibility managers · resolvers"]

  Root --> Providers
  Root --> Dispatch
  Dispatch --> Containers
  Containers -->|recurse into children| Dispatch
  Containers --> TitleRow
  Containers --> TextRow
  Containers --> AddInfo
  Containers --> Nesting
  Containers --> Selector
  TitleRow --> Subheader
  TitleRow --> Layout
  TextRow --> Layout
  AddInfo --> Layout
  Containers --> Preceded
  Containers --> NDM
```

## Notes

- **Container / presentational split.** Containers are API-type specific and read tree nodes;
  shared components only draw resolved values and must not grow API-type branches.
- Expansion and selection are local React state; `api-state-model` is used only by legacy GraphQL.
- Rows set `data-precededby` so spacing and the level indicator line stay continuous.
