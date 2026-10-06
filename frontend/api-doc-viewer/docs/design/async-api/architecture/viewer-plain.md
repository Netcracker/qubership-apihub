# AsyncAPI — viewer, plain

Paths are relative to `packages/api-doc-viewer/src/components/AsyncApiOperationViewer/`. Abstract
layer: [../../shared/architecture/viewer-plain.md](../../shared/architecture/viewer-plain.md).

```mermaid
flowchart TB
  Root["AsyncApiOperationViewer.tsx<br/>AsyncApiTreeBuilder · AsyncApiDevModeContext ·<br/>DisplayModeContext · LayoutModeContext (DOCUMENT) · LevelContext"]
  Message["MessageNodeViewer.tsx<br/>title (h1) · AddressRow · description · summary"]
  Address["AddressRow/AddressRow.tsx<br/>action badge + address"]
  Sections["MessageSectionsViewer.tsx<br/>Selector: Message | Channel | Operation"]
  Section["MessageSectionViewer.tsx (dispatch by kind)"]
  Content["MessageContentNodeViewer.tsx<br/>Headers · Extensions · Bindings · Payload"]
  Channel["MessageChannelNodeViewer.tsx<br/>title · description · summary ·<br/>Address Parameters · Servers · Extensions · Bindings"]
  Operation["MessageOperationNodeViewer.tsx<br/>title · description · summary · Extensions · Bindings"]
  Params["MessageChannelParametersNodeViewer.tsx<br/>Location custom annotations"]
  Servers["MessageChannelServersNodeViewer.tsx"]
  Server["MessageChannelServerNodeViewer/<br/>title · ServerAddressRow · description · summary · Bindings"]
  Bindings["BindingsNodeViewer.tsx<br/>protocol Selector · Version row"]
  Extensions["ExtensionsNodeViewer.tsx"]
  Visibility["utils/async-api/visibility-checkers.ts<br/>shouldBeDisplayed"]
  JsonSchema["JsonSchemaViewer<br/>(SUPPRESS_ROOT_NESTING_INDICATOR)"]
  Jso["JsoViewer"]

  Root --> Message
  Message --> Address
  Message --> Sections
  Sections --> Section
  Section --> Content
  Section --> Channel
  Section --> Operation
  Content --> JsonSchema
  Content --> Extensions
  Content --> Bindings
  Channel --> Params
  Channel --> Servers
  Channel --> Extensions
  Channel --> Bindings
  Operation --> Extensions
  Operation --> Bindings
  Servers --> Server
  Server --> Bindings
  Params --> JsonSchema
  Bindings --> Jso
  Extensions --> Jso
  Message --> Visibility
  Channel --> Visibility
  Operation --> Visibility
  Server --> Visibility
```
