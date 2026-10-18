import { isBindingsNode, isExtensionsNode, isMessageChannelParametersNode, isServersNode } from "@apihub/utils/async-api/node-type-checkers"
import { shouldBeDisplayed } from "@apihub/utils/async-api/visibility-checkers"
import { NodeDiffsSeverityPlacemennt } from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/tree-node.interface"
import { AsyncApiTreeNode, AsyncApiTreeNodeWithDiffs } from "@netcracker/qubership-apihub-next-data-model/model/async-api/types/aliases"
import { AsyncApiTreeNodeKinds } from "@netcracker/qubership-apihub-next-data-model/model/async-api/types/node-kind"
import { AsyncApiTreeNodeValueTypeMessageChannel } from "@netcracker/qubership-apihub-next-data-model/model/async-api/types/node-value"
import { FC, useMemo } from "react"
import { TextRow } from "../shared-components/TextRow/TextRow"
import { DEFAULT_LONG_TEXT_COLOR } from "../shared-components/TextRow/consts"
import { TextRowProps } from "../shared-components/TextRow/types"
import { TextValueVariant } from "../shared-components/TextValue/types"
import { TitleRow } from "../shared-components/TitleRow/TitleRow"
import { TitleRowProps } from "../shared-components/TitleRow/types"
import { ATTRIBUTE_PRECEDED_BY, PrecededBy, WithPrecededByProps } from "../shared-components/WithPrecededByProps"
import { buildRowDiffProps, useNodeDiffState } from "../shared-components/diffs/node-diff-props"
import { isMessageChannelNodeWithDiffs } from "../shared-utilities/tree-node-guards"
import { BindingsNodeViewer } from "./BindingsNodeViewer"
import { ExtensionsNodeViewer } from "./ExtensionsNodeViewer"
import { MessageChannelParametersNodeViewer } from "./MessageChannelParametersNodeViewer"
import { MessageChannelServersNodeViewer } from "./MessageChannelServersNodeViewer"

type MessageChannelNodeViewerProps = WithPrecededByProps & {
  node: AsyncApiTreeNode<typeof AsyncApiTreeNodeKinds.MESSAGE_CHANNEL>
}

export const MessageChannelNodeViewer: FC<MessageChannelNodeViewerProps> = (props) => {
  const { node, [ATTRIBUTE_PRECEDED_BY]: precededBy } = props

  const value = node.value()

  const children: AsyncApiTreeNode[] = node.childrenNodes()
  const bindingsChild = children.find(isBindingsNode)
  const parametersChild = children.find(isMessageChannelParametersNode)
  const serversChild = children.find(isServersNode)
  const extensionsChild = children.find(isExtensionsNode)

  const nodeDiffState = useNodeDiffState<AsyncApiTreeNodeValueTypeMessageChannel, AsyncApiTreeNode | AsyncApiTreeNodeWithDiffs>(node, isMessageChannelNodeWithDiffs)
  const { nodeDiffs } = nodeDiffState

  const titleRowDiffProps: Pick<TitleRowProps, 'diff' | 'descendantDiffs' | 'diffsSeverities'> = useMemo(
    () => buildRowDiffProps<AsyncApiTreeNodeValueTypeMessageChannel>(nodeDiffState, { diffKey: "title" }),
    [nodeDiffState],
  )

  const descriptionRowDiffProps: Pick<TextRowProps, 'diff' | 'descendantDiffs' | 'diffsSeverities'> = useMemo(
    () => buildRowDiffProps<AsyncApiTreeNodeValueTypeMessageChannel>(nodeDiffState, {
      diffKey: "description",
      diffsSeverityPlacement: NodeDiffsSeverityPlacemennt.DescriptionRow,
    }),
    [nodeDiffState],
  )

  const summaryRowDiffProps: Pick<TextRowProps, 'diff' | 'descendantDiffs' | 'diffsSeverities'> = useMemo(
    () => buildRowDiffProps<AsyncApiTreeNodeValueTypeMessageChannel>(nodeDiffState, {
      diffKey: "summary",
      diffsSeverityPlacement: NodeDiffsSeverityPlacemennt.SummaryRow,
    }),
    [nodeDiffState],
  )

  const isTitleDisplayed = useMemo(() => shouldBeDisplayed<AsyncApiTreeNodeValueTypeMessageChannel>(value, nodeDiffs, 'title'), [value, nodeDiffs])
  const isDescriptionDisplayed = useMemo(() => shouldBeDisplayed<AsyncApiTreeNodeValueTypeMessageChannel>(value, nodeDiffs, 'description'), [value, nodeDiffs])
  const isSummaryDisplayed = useMemo(() => shouldBeDisplayed<AsyncApiTreeNodeValueTypeMessageChannel>(value, nodeDiffs, 'summary'), [value, nodeDiffs])

  return (
    <div className="flex flex-col">
      {isTitleDisplayed && (
        <TitleRow
          data-precededby={precededBy}
          value={value?.title ?? ''}
          expandable={false}
          expanded={true}
          variant={TextValueVariant.h2}
          // diffs
          {...titleRowDiffProps}
        />
      )}
      {!isTitleDisplayed && (
        <TitleRow
          data-precededby={precededBy}
          value={node.key.toString()}
          expandable={false}
          expanded={true}
          variant={TextValueVariant.h2}
          // diffs
          {...titleRowDiffProps}
        />
      )}
      {isDescriptionDisplayed && (
        <TextRow
          data-precededby={PrecededBy.MESSAGE_SECTION_HEADER_HIGH_LEVEL}
          value={value?.description ?? ''}
          variant={TextValueVariant.h5}
          textFontWeight='normal'
          textColor={DEFAULT_LONG_TEXT_COLOR}
          // diffs
          {...descriptionRowDiffProps}
        />
      )}
      {isSummaryDisplayed && (
        <TextRow
          data-precededby={
            isDescriptionDisplayed
              ? PrecededBy.DESCRIPTION_ROW
              : PrecededBy.MESSAGE_SECTION_HEADER_HIGH_LEVEL
          }
          value={value?.summary ?? ''}
          variant={TextValueVariant.h5}
          textFontWeight='normal'
          textColor={DEFAULT_LONG_TEXT_COLOR}
          // diffs
          {...summaryRowDiffProps}
        />
      )}

      {children.length > 0 && (
        <div className="flex flex-col">
          {parametersChild && (
            <MessageChannelParametersNodeViewer
              data-precededby={
                isDescriptionDisplayed
                  ? PrecededBy.DESCRIPTION_ROW
                  : isSummaryDisplayed
                    ? PrecededBy.SUMMARY_ROW
                    : PrecededBy.MESSAGE_SECTION_HEADER_HIGH_LEVEL
              }
              node={parametersChild}
            />
          )}
          {serversChild && (
            <MessageChannelServersNodeViewer
              data-precededby={
                parametersChild
                  ? PrecededBy.JSON_SCHEMA_VIEWER
                  : isDescriptionDisplayed
                    ? PrecededBy.DESCRIPTION_ROW
                    : isSummaryDisplayed
                      ? PrecededBy.SUMMARY_ROW
                      : PrecededBy.MESSAGE_SECTION_HEADER_HIGH_LEVEL
              }
              node={serversChild}
            />
          )}
          {extensionsChild && (
            <ExtensionsNodeViewer
              data-precededby={
                serversChild
                  ? PrecededBy.SERVER_BLOCK
                  : parametersChild
                    ? PrecededBy.JSON_SCHEMA_VIEWER
                    : isDescriptionDisplayed
                      ? PrecededBy.DESCRIPTION_ROW
                      : isSummaryDisplayed
                        ? PrecededBy.SUMMARY_ROW
                        : PrecededBy.MESSAGE_SECTION_HEADER_HIGH_LEVEL
              }
              node={extensionsChild}
            />
          )}
          {bindingsChild && (
            <BindingsNodeViewer
              data-precededby={
                extensionsChild
                  ? PrecededBy.JSO_VIEWER
                  : serversChild
                    ? PrecededBy.SERVER_BLOCK
                    : parametersChild
                      ? PrecededBy.JSON_SCHEMA_VIEWER
                      : isDescriptionDisplayed
                        ? PrecededBy.DESCRIPTION_ROW
                        : isSummaryDisplayed
                          ? PrecededBy.SUMMARY_ROW
                          : PrecededBy.MESSAGE_SECTION_HEADER_HIGH_LEVEL
              }
              node={bindingsChild}
            />
          )}
        </div>
      )}
    </div>
  )
}
