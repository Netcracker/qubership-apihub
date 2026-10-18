import { useDiffMetaKeys } from "@apihub/contexts/DiffMetaKeysContext"
import { useDisplayMode } from "@apihub/contexts/DisplayModeContext"
import { useLayoutMode } from "@apihub/contexts/LayoutModeContext"
import { DiffMetaKeys } from "@netcracker/qubership-apihub-api-data-model"
import { isDiffAdd, isDiffRemove } from "@netcracker/qubership-apihub-api-diff"
import { ChangedPropertyMetaData, NODE_LEVEL_DIFF_KEY } from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/tree-node.interface"
import { AsyncApiTreeNode, AsyncApiTreeNodeWithDiffs } from "@netcracker/qubership-apihub-next-data-model/model/async-api/types/aliases"
import { AsyncApiTreeNodeKinds } from "@netcracker/qubership-apihub-next-data-model/model/async-api/types/node-kind"
import { AsyncApiTreeNodeValueTypeChannelParameters } from "@netcracker/qubership-apihub-next-data-model/model/async-api/types/node-value"
import { FC, useMemo } from "react"
import { JsonSchemaDiffViewer } from "../JsonSchemaViewer/JsonSchemaDiffViewer"
import { JsonSchemaViewer } from "../JsonSchemaViewer/JsonSchemaViewer"
import { buildRowDiffProps, toNodeDiffState } from "../shared-components/diffs/node-diff-props"
import { TextValueVariant } from "../shared-components/TextValue/types"
import { TitleRow } from "../shared-components/TitleRow/TitleRow"
import { TitleRowProps } from "../shared-components/TitleRow/types"
import { ATTRIBUTE_PRECEDED_BY, PrecededBy, WithPrecededByProps } from "../shared-components/WithPrecededByProps"
import { isMessageChannelParametersNodeWithDiffs } from "../shared-utilities/tree-node-guards"

const MESSAGE_CHANNEL_PARAMETERS_TITLE = 'Address Parameters'

type MessageChannelParametersNodeViewerProps = WithPrecededByProps & {
  node:
  | AsyncApiTreeNode<typeof AsyncApiTreeNodeKinds.MESSAGE_CHANNEL_PARAMETERS>
  | AsyncApiTreeNodeWithDiffs<typeof AsyncApiTreeNodeKinds.MESSAGE_CHANNEL_PARAMETERS>
}

export const MessageChannelParametersNodeViewer: FC<MessageChannelParametersNodeViewerProps> = (props) => {
  const { node, [ATTRIBUTE_PRECEDED_BY]: precededBy } = props

  const displayMode = useDisplayMode()

  if (isMessageChannelParametersNodeWithDiffs(node)) {
    return (
      <MessageChannelParametersNodeWithDiffsViewer
        data-precededby={precededBy}
        node={node}
      />
    )
  }

  const value = node.value()
  const addressParameters = value?.rawValues ?? {}

  return <>
    <TitleRow
      data-precededby={precededBy}
      value={MESSAGE_CHANNEL_PARAMETERS_TITLE}
      expandable={false}
      variant={TextValueVariant.h3}
    />
    <JsonSchemaViewer
      data-precededby={PrecededBy.MESSAGE_SECTION_HEADER_HIGH_LEVEL}
      schema={addressParameters}
      expandedDepth={2}
      displayMode={displayMode}
      overriddenKind='parameters'
    />
  </>
}

type MessageChannelParametersNodeWithDiffsViewerProps = WithPrecededByProps & {
  node: AsyncApiTreeNodeWithDiffs<typeof AsyncApiTreeNodeKinds.MESSAGE_CHANNEL_PARAMETERS>
}

const MessageChannelParametersNodeWithDiffsViewer: FC<MessageChannelParametersNodeWithDiffsViewerProps> = (props) => {
  const { node, [ATTRIBUTE_PRECEDED_BY]: precededBy } = props

  const displayMode = useDisplayMode()
  const layoutMode = useLayoutMode()

  const value = node.value()
  const addressParameters = value?.rawValues

  const diffMetaKeys = useDiffMetaKeys()

  const diffsProps: Pick<TitleRowProps, 'diff' | 'descendantDiffs' | 'diffsSeverities'> = useMemo(() => {
    const nodeDiffState = toNodeDiffState<AsyncApiTreeNodeValueTypeChannelParameters>(node)
    return buildRowDiffProps<AsyncApiTreeNodeValueTypeChannelParameters>(nodeDiffState)
  }, [node])

  const preparedAddressParameters = useMemo(() => {
    return prepareJsonSchemaInCaseOfWhollyChanged(
      addressParameters,
      node.diffs[NODE_LEVEL_DIFF_KEY],
      diffMetaKeys
    )
  }, [addressParameters, diffMetaKeys, node.diffs])

  if (!diffMetaKeys || !addressParameters) {
    return null
  }

  return <>
    <TitleRow
      data-precededby={precededBy}
      value={MESSAGE_CHANNEL_PARAMETERS_TITLE}
      expandable={false}
      variant={TextValueVariant.h3}
      // diffs
      {...diffsProps}
    />
    <JsonSchemaDiffViewer
      data-precededby={PrecededBy.MESSAGE_SECTION_HEADER_HIGH_LEVEL}
      schema={preparedAddressParameters}
      expandedDepth={2}
      displayMode={displayMode}
      layoutMode={layoutMode}
      metaKeys={diffMetaKeys}
      overriddenKind='parameters'
    />
  </>
}

function prepareJsonSchemaInCaseOfWhollyChanged(
  jsonSchema: Record<string, unknown> | undefined,
  changedNodeMetadata: ChangedPropertyMetaData | undefined,
  diffMetaKeys: DiffMetaKeys | undefined
): Record<PropertyKey, unknown> | undefined {
  if (!jsonSchema || !changedNodeMetadata || !diffMetaKeys) {
    return jsonSchema
  }
  const diff = changedNodeMetadata.data
  const { diffsMetaKey } = diffMetaKeys
  const extendedJsonSchema = {
    ...jsonSchema,
    [diffsMetaKey]: Object.keys(jsonSchema).reduce((acc, key) => {
      acc[key] = diff
      if (isDiffAdd(diff)) {
        const afterValue = jsonSchema[key]
        acc[key] = { ...diff, afterValue: afterValue }
      }
      if (isDiffRemove(diff)) {
        const beforeValue = jsonSchema[key]
        acc[key] = { ...diff, beforeValue: beforeValue }
      }
      return acc
    }, {} as Record<PropertyKey, unknown>)
  }
  return extendedJsonSchema
}
