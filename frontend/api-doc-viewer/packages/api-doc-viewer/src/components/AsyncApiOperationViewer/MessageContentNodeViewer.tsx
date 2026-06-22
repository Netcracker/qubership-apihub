import { useDiffMetaKeys } from "@apihub/contexts/DiffMetaKeysContext"
import { useDiffTypes } from "@apihub/contexts/DiffTypesContext"
import { useDisplayMode } from "@apihub/contexts/DisplayModeContext"
import { useLayoutMode } from "@apihub/contexts/LayoutModeContext"
import { isBindingsNode, isExtensionsNode, isMessageContentHeadersNode, isMessageContentPayloadNode } from "@apihub/utils/async-api/node-type-checkers"
import { wrapJsonSchemaForDiffsViewer, wrapJsonSchemaForViewer } from "@apihub/utils/jso/prepare-json-schema-to-jso-viewers"
import { SimpleTreeNodeWithDiffs } from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/simple-node.impl"
import { NODE_LEVEL_DIFF_KEY } from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/tree-node.interface"
import { AsyncApiTreeNode } from "@netcracker/qubership-apihub-next-data-model/model/async-api/types/aliases"
import { AsyncApiTreeNodeKinds } from "@netcracker/qubership-apihub-next-data-model/model/async-api/types/node-kind"
import { AsyncApiTreeNodeValueTypeMessageHeaders, AsyncApiTreeNodeValueTypeMessagePayload } from "@netcracker/qubership-apihub-next-data-model/model/async-api/types/node-value"
import { FC, useCallback, useMemo } from "react"
import { DiffMetaKeys, DOCUMENT_LAYOUT_MODE, JsonSchemaDiffViewer, SIDE_BY_SIDE_DIFFS_LAYOUT_MODE } from "../.."
import { JsonSchemaViewer } from "../JsonSchemaViewer/JsonSchemaViewer"
import { buildRowDiffProps, toNodeDiffState } from "../shared-components/diffs/node-diff-props"
import { TextValueVariant } from "../shared-components/TextValue/types"
import { TitleRow } from "../shared-components/TitleRow/TitleRow"
import { TitleRowProps } from "../shared-components/TitleRow/types"
import { ATTRIBUTE_PRECEDED_BY, PrecededBy, WithPrecededByProps } from "../shared-components/WithPrecededByProps"
import { isAsyncApiMessageHeadersNodeWithDiffs, isAsyncApiMessagePayloadNodeWithDiffs } from "../shared-utilities/tree-node-guards"
import { BindingsNodeViewer } from "./BindingsNodeViewer"
import { ExtensionsNodeViewer } from "./ExtensionsNodeViewer"

type MessageContentNodeViewerProps = WithPrecededByProps & {
  node: AsyncApiTreeNode<typeof AsyncApiTreeNodeKinds.MESSAGE_CONTENT>
}

export const MessageContentNodeViewer: FC<MessageContentNodeViewerProps> = (props) => {
  const { node, [ATTRIBUTE_PRECEDED_BY]: precededBy } = props

  const displayMode = useDisplayMode()
  const layoutMode = useLayoutMode()
  const diffMetaKeys = useDiffMetaKeys()
  const diffTypes = useDiffTypes()

  const messageChildren: AsyncApiTreeNode[] = node.childrenNodes()
  const headersChild = messageChildren.find(isMessageContentHeadersNode)
  const extensionsChild = messageChildren.find(isExtensionsNode)
  const bindingsChild = messageChildren.find(isBindingsNode)
  const payloadChild = messageChildren.find(isMessageContentPayloadNode)

  const headersJsonSchema = useMemo(
    () => prepareMessageContentChildJsonSchema(headersChild, diffMetaKeys),
    [headersChild, diffMetaKeys],
  )
  const payloadJsonSchema = useMemo(
    () => prepareMessageContentChildJsonSchema(payloadChild, diffMetaKeys),
    [payloadChild, diffMetaKeys],
  )

  const headersTitleRowDiffProps: Pick<TitleRowProps, 'diff' | 'descendantDiffs' | 'diffsSeverities'> = useMemo(() => {
    if (isAsyncApiMessageHeadersNodeWithDiffs(headersChild)) {
      const nodeDiffState = toNodeDiffState<AsyncApiTreeNodeValueTypeMessageHeaders>(headersChild)
      return buildRowDiffProps<AsyncApiTreeNodeValueTypeMessageHeaders>(nodeDiffState)
    }
    return {}
  }, [headersChild])
  const payloadTitleRowDiffProps: Pick<TitleRowProps, 'diff' | 'descendantDiffs' | 'diffsSeverities'> = useMemo(() => {
    if (isAsyncApiMessagePayloadNodeWithDiffs(payloadChild)) {
      const nodeDiffState = toNodeDiffState<AsyncApiTreeNodeValueTypeMessagePayload>(payloadChild)
      return buildRowDiffProps<AsyncApiTreeNodeValueTypeMessagePayload>(nodeDiffState)
    }
    return {}
  }, [payloadChild])

  const renderJsonSchemaViewer = useCallback((source: unknown) => {
    if (layoutMode === DOCUMENT_LAYOUT_MODE) {
      return (
        <JsonSchemaViewer
          data-precededby={PrecededBy.MESSAGE_SECTION_HEADER_HIGH_LEVEL}
          schema={source}
          displayMode={displayMode}
          overriddenKind='parameters'
        />
      )
    }
    if (layoutMode === SIDE_BY_SIDE_DIFFS_LAYOUT_MODE && diffMetaKeys) {
      return (
        <JsonSchemaDiffViewer
          data-precededby={PrecededBy.MESSAGE_SECTION_HEADER_HIGH_LEVEL}
          schema={source}
          displayMode={displayMode}
          metaKeys={diffMetaKeys}
          filters={diffTypes}
          layoutMode={SIDE_BY_SIDE_DIFFS_LAYOUT_MODE}
          overriddenKind='parameters'
        />
      )
    }
    return null
  }, [diffMetaKeys, diffTypes, displayMode, layoutMode])

  return (
    <div className="flex flex-col">
      {headersChild && (
        <div className="flex flex-col">
          <TitleRow
            data-precededby={precededBy}
            value="Headers"
            variant={TextValueVariant.h3}
            expandable={false}
            // diffs
            {...headersTitleRowDiffProps}
          />
          {renderJsonSchemaViewer(headersJsonSchema)}
        </div>
      )}
      {extensionsChild && (
        <ExtensionsNodeViewer
          data-precededby={
            headersChild
              ? PrecededBy.JSON_SCHEMA_VIEWER
              : precededBy
          }
          node={extensionsChild}
        />
      )}
      {bindingsChild && (
        <BindingsNodeViewer
          data-precededby={
            headersChild
              ? PrecededBy.JSON_SCHEMA_VIEWER
              : extensionsChild
                ? PrecededBy.JSO_VIEWER
                : precededBy
          }
          node={bindingsChild}
        />
      )}
      {payloadChild && (
        <div className="flex flex-col">
          <TitleRow
            data-precededby={
              headersChild
                ? PrecededBy.JSON_SCHEMA_VIEWER
                : extensionsChild || bindingsChild
                  ? PrecededBy.JSO_VIEWER
                  : precededBy
            }
            value="Payload"
            variant={TextValueVariant.h3}
            expandable={false}
            // diffs
            {...payloadTitleRowDiffProps}
          />
          {renderJsonSchemaViewer(payloadJsonSchema)}
        </div>
      )}
    </div>
  )
}

type MessageContentChildNode =
  | AsyncApiTreeNode<typeof AsyncApiTreeNodeKinds.MESSAGE_HEADERS>
  | AsyncApiTreeNode<typeof AsyncApiTreeNodeKinds.MESSAGE_PAYLOAD>

const TITLE_FOR_WRAPPED_JSON_SCHEMA = 'Type'

function prepareMessageContentChildJsonSchema(
  child: MessageContentChildNode | undefined,
  diffMetaKeys: DiffMetaKeys | undefined,
): object | undefined {
  if (!child) {
    return undefined
  }
  const value = child.value()
  if (!value) {
    return undefined
  }
  if (!(child instanceof SimpleTreeNodeWithDiffs)) {
    return wrapJsonSchemaForViewer(TITLE_FOR_WRAPPED_JSON_SCHEMA, value.schema)
  }
  return wrapJsonSchemaForDiffsViewer(TITLE_FOR_WRAPPED_JSON_SCHEMA, value.schema, child.diffs[NODE_LEVEL_DIFF_KEY], diffMetaKeys)
}
