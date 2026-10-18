import { JsoDiffsViewer } from "@apihub/components/JsoViewer/JsoDiffsViewer"
import { JsoViewer } from "@apihub/components/JsoViewer/JsoViewer"
import {
  JsonSchemaExtensionsJsoComponent,
  JsonSchemaExtensionsJsoDiffsComponent,
} from "./json-schema-embedding-types"

export const DefaultExtensionsJsoComponent: JsonSchemaExtensionsJsoComponent = ({ source, initialLevel }) => (
  <JsoViewer source={source} initialLevel={initialLevel} />
)

export const DefaultExtensionsJsoDiffsComponent: JsonSchemaExtensionsJsoDiffsComponent = ({
  mergedSource,
  initialLevel,
  displayMode,
  diffMetaKeys,
}) => (
  <JsoDiffsViewer
    mergedSource={mergedSource}
    initialLevel={initialLevel}
    displayMode={displayMode}
    diffMetaKeys={diffMetaKeys}
  />
)
