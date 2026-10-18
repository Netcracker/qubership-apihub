import { AsyncApiTreeNode, AsyncApiTreeNodeWithDiffs } from "@netcracker/qubership-apihub-next-data-model/model/async-api/types/aliases"
import { AsyncApiTreeNodeKinds } from "@netcracker/qubership-apihub-next-data-model/model/async-api/types/node-kind"
import { FC, memo, useCallback, useMemo } from "react"

import { DEFAULT_LONG_TEXT_COLOR } from "@apihub/components/shared-components/TextRow/consts"
import { ATTRIBUTE_PRECEDED_BY, PrecededBy, WithPrecededByProps } from "@apihub/components/shared-components/WithPrecededByProps"
import { X_AXIS_PADDING_ROWS_ASYNC_API } from "@apihub/components/shared-styles/tailwind-classnames"
import { CHANGED_LAYOUT_SIDE, LayoutSide, ORIGIN_LAYOUT_SIDE } from "@apihub/types/internal/LayoutSide"
import { isBindingsNode } from "@apihub/utils/async-api/node-type-checkers"
import { shouldBeDisplayed } from "@apihub/utils/async-api/visibility-checkers"
import { isDiffAdd, isDiffRemove, isDiffRename, isDiffReplace } from "@netcracker/qubership-apihub-api-diff"
import { AbstractNodeDiffsSeveritiesAggregator } from "@netcracker/qubership-apihub-next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/node-diffs-severities-aggregator"
import { DiffsClassesBuilder } from "@netcracker/qubership-apihub-next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/utilities"
import { HighlightVariant, NODE_LEVEL_DIFF_KEY, NodeDiffsSeverityPlacemennt } from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/tree-node.interface"
import { AsyncApiTreeNodeValueTypeServer } from "@netcracker/qubership-apihub-next-data-model/model/async-api/types/node-value"
import { buildRowDiffProps, useNodeDiffState } from "../../shared-components/diffs/node-diff-props"
import { TextRow } from "../../shared-components/TextRow/TextRow"
import { TextRowProps } from "../../shared-components/TextRow/types"
import { TextValueVariant } from "../../shared-components/TextValue/types"
import { TitleRow } from "../../shared-components/TitleRow/TitleRow"
import { TitleRowProps } from "../../shared-components/TitleRow/types"
import { isServerNodeWithDiffs } from "../../shared-utilities/tree-node-guards"
import { BindingsNodeViewer } from "../BindingsNodeViewer"
import { ServerAddressRow, ServerAddressRowProps } from "../ServerAddressRow"
import { SizeVariant } from "../types/SizeVariant"
import './MessageChannelServerNodeViewer.css'

type MessageChannelServerNodeViewerProps = WithPrecededByProps & {
  node:
  | AsyncApiTreeNode<typeof AsyncApiTreeNodeKinds.SERVER>
  | AsyncApiTreeNodeWithDiffs<typeof AsyncApiTreeNodeKinds.SERVER>
}

export const MessageChannelServerNodeViewer: FC<MessageChannelServerNodeViewerProps> = memo(props => {
  const { node, [ATTRIBUTE_PRECEDED_BY]: precededBy } = props

  const value = useMemo(() => node.value(), [node])

  const children: AsyncApiTreeNode[] | AsyncApiTreeNodeWithDiffs[] = node.childrenNodes()
  const bindingsChild = children.find(isBindingsNode)

  const nodeDiffState = useNodeDiffState<AsyncApiTreeNodeValueTypeServer, AsyncApiTreeNode | AsyncApiTreeNodeWithDiffs>(node, isServerNodeWithDiffs)
  const { nodeDiffs } = nodeDiffState

  const titleRowDiffsProps: Pick<TitleRowProps, 'diff' | 'descendantDiffs' | 'diffsSeverities'> = useMemo(
    () => buildRowDiffProps<AsyncApiTreeNodeValueTypeServer>(nodeDiffState, { diffKey: "title" }),
    [nodeDiffState],
  )

  const descriptionRowDiffProps: Pick<TextRowProps, 'diff' | 'descendantDiffs' | 'diffsSeverities'> = useMemo(
    () => buildRowDiffProps<AsyncApiTreeNodeValueTypeServer>(nodeDiffState, {
      diffKey: "description",
      diffsSeverityPlacement: NodeDiffsSeverityPlacemennt.DescriptionRow,
    }),
    [nodeDiffState],
  )

  const summaryRowDiffProps: Pick<TextRowProps, 'diff' | 'descendantDiffs' | 'diffsSeverities'> = useMemo(
    () => buildRowDiffProps<AsyncApiTreeNodeValueTypeServer>(nodeDiffState, {
      diffKey: "summary",
      diffsSeverityPlacement: NodeDiffsSeverityPlacemennt.SummaryRow,
    }),
    [nodeDiffState],
  )

  const serverAddressRowDiffsProps: Pick<ServerAddressRowProps, 'diff' | 'descendantDiffs' | 'diffsSeverities'> = useMemo(() => {
    return buildRowDiffProps<AsyncApiTreeNodeValueTypeServer>(nodeDiffState, {
      resolveDiff: (diffs, getDiffByKey) => {
        const maxDiff = AbstractNodeDiffsSeveritiesAggregator.maxChangedPropertyMetaDataByDiffType(getDiffByKey('protocol'), getDiffByKey('host'))
        return diffs[NODE_LEVEL_DIFF_KEY] ?? maxDiff
      },
    })
  }, [nodeDiffState])

  const renderProtocol = useCallback((layoutSide: LayoutSide) => {
    if (!value) {
      return null
    }
    if (!(isServerNodeWithDiffs(node))) {
      return <>{value.protocol}</>
    }
    const diffProtocol = node.diffs?.['protocol']
    if (!diffProtocol) {
      return <>{value.protocol}</>
    }
    const diffsClasses: Set<string> = new Set()
    const { data, styles } = diffProtocol
    let resolvedValue = value.protocol
    let isInvisible = false
    if (layoutSide === ORIGIN_LAYOUT_SIDE) {
      diffsClasses.add(DiffsClassesBuilder.highlighter(styles.before.textHighlighterColor))
      if (isDiffRemove(data) || isDiffReplace(data)) {
        resolvedValue = data.beforeValue as string
      } else if (isDiffRename(data)) {
        resolvedValue = data.beforeKey as string
      }
      if (isDiffAdd(data)) {
        isInvisible = true
      }
    }
    if (layoutSide === CHANGED_LAYOUT_SIDE) {
      diffsClasses.add(DiffsClassesBuilder.highlighter(styles.after.textHighlighterColor))
      if (isDiffAdd(data) || isDiffReplace(data)) {
        resolvedValue = data.afterValue as string
      } else if (isDiffRename(data)) {
        resolvedValue = data.afterKey as string
      }
      if (isDiffRemove(data)) {
        isInvisible = true
      }
    }
    if (isInvisible) {
      return null
    }
    return (
      <span className={Array.from(diffsClasses).join(' ')}>
        {resolvedValue}
      </span>
    )
  }, [node, value])

  const renderHost = useCallback((layoutSide: LayoutSide) => {
    if (!value) {
      return null
    }
    if (!(isServerNodeWithDiffs(node))) {
      return <>{value.host}</>
    }
    const diffHost = node.diffs?.['host']
    if (!diffHost) {
      return <>{value.host}</>
    }
    const diffsClasses: Set<string> = new Set()
    const { data, styles } = diffHost
    let resolvedValue = value.host
    let isInvisible = false
    if (layoutSide === ORIGIN_LAYOUT_SIDE) {
      diffsClasses.add(DiffsClassesBuilder.highlighter(styles.before.textHighlighterColor))
      if (isDiffRemove(data) || isDiffReplace(data)) {
        resolvedValue = data.beforeValue as string
      } else if (isDiffRename(data)) {
        resolvedValue = data.beforeKey as string
      }
      if (isDiffAdd(data)) {
        isInvisible = true
      }
    }
    if (layoutSide === CHANGED_LAYOUT_SIDE) {
      diffsClasses.add(DiffsClassesBuilder.highlighter(styles.after.textHighlighterColor))
      if (isDiffAdd(data) || isDiffReplace(data)) {
        resolvedValue = data.afterValue as string
      } else if (isDiffRename(data)) {
        resolvedValue = data.afterKey as string
      }
      if (isDiffRemove(data)) {
        isInvisible = true
      }
    }
    if (isInvisible) {
      return null
    }
    return (
      <span className={Array.from(diffsClasses).join(' ')}>
        {resolvedValue}
      </span>
    )
  }, [node, value])

  const renderAddress = useCallback((layoutSide: LayoutSide) => {
    function renderAddressContent(isInvisible: boolean = false, diffClasses: string[] = []) {
      return (
        <div
          data-precededby={PrecededBy.MESSAGE_SECTION_HEADER_HIGH_LEVEL}
          className={`${X_AXIS_PADDING_ROWS_ASYNC_API} py-2 flex flex-row h-full ${diffClasses.join(' ')}`}
        >
          {!isInvisible && (
            <div className="server-address-container server-address server-subheader">
              {renderProtocol(layoutSide)}
              ://
              {renderHost(layoutSide)}
            </div>
          )}
        </div>
      )
    }
    if (!(isServerNodeWithDiffs(node))) {
      return renderAddressContent()
    }
    const changedPropertyMetadata = node.diffs?.[NODE_LEVEL_DIFF_KEY] ?? serverAddressRowDiffsProps.diff
    if (!changedPropertyMetadata) {
      return renderAddressContent()
    }
    const { data, styles } = changedPropertyMetadata
    const diffsClasses: Set<string> = new Set()
    let isInvisible = false
    if (layoutSide === ORIGIN_LAYOUT_SIDE) {
      if (isDiffAdd(data)) {
        diffsClasses.add(DiffsClassesBuilder.background(HighlightVariant.Gray))
        isInvisible = true
      } else {
        diffsClasses.add(DiffsClassesBuilder.background(styles.before.backgroundColor))
      }
    }
    if (layoutSide === CHANGED_LAYOUT_SIDE) {
      if (isDiffRemove(data)) {
        diffsClasses.add(DiffsClassesBuilder.background(HighlightVariant.Gray))
        isInvisible = true
      } else {
        diffsClasses.add(DiffsClassesBuilder.background(styles.after.backgroundColor))
      }
    }
    return renderAddressContent(isInvisible, Array.from(diffsClasses))
  }, [node, renderHost, renderProtocol, serverAddressRowDiffsProps.diff])

  const isTitleDisplayed = useMemo(() => shouldBeDisplayed<AsyncApiTreeNodeValueTypeServer>(value, nodeDiffs, 'title'), [value, nodeDiffs])
  const isDescriptionDisplayed = useMemo(() => shouldBeDisplayed<AsyncApiTreeNodeValueTypeServer>(value, nodeDiffs, 'description'), [value, nodeDiffs])
  const isSummaryDisplayed = useMemo(() => shouldBeDisplayed<AsyncApiTreeNodeValueTypeServer>(value, nodeDiffs, 'summary'), [value, nodeDiffs])

  if (!value) {
    return null
  }

  return (
    <div className='flex flex-col'>
      {isTitleDisplayed && (
        <TitleRow
          data-precededby={precededBy}
          value={value.title}
          expandable={false}
          expanded={true}
          variant={TextValueVariant.h4}
          // diffs
          {...titleRowDiffsProps}
        />
      )}
      {!isTitleDisplayed && (
        <TitleRow
          data-precededby={precededBy}
          value={node.key.toString()}
          expandable={false}
          expanded={true}
          variant={TextValueVariant.h4}
          // diffs
          {...titleRowDiffsProps}
        />
      )}
      <ServerAddressRow
        renderAddress={renderAddress}
        // diffs
        {...serverAddressRowDiffsProps}
      />
      {isDescriptionDisplayed && (
        <TextRow
          data-precededby={PrecededBy.SERVER_ADDRESS_ROW}
          value={value?.description ?? ''}
          variant={TextValueVariant.h6}
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
              : PrecededBy.SERVER_ADDRESS_ROW
          }
          value={value?.summary ?? ''}
          variant={TextValueVariant.h6}
          textFontWeight='normal'
          textColor={DEFAULT_LONG_TEXT_COLOR}
          // diffs
          {...summaryRowDiffProps}
        />
      )}
      {bindingsChild && (
        <BindingsNodeViewer
          data-precededby={
            isSummaryDisplayed
              ? PrecededBy.SUMMARY_ROW
              : isDescriptionDisplayed
                ? PrecededBy.DESCRIPTION_ROW
                : PrecededBy.SERVER_ADDRESS_ROW
          }
          node={bindingsChild}
          variant={SizeVariant.SECONDARY}
        />
      )}
    </div>
  )
})
