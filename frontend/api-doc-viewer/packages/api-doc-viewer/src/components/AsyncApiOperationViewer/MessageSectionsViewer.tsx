import { useDisplayMode } from "@apihub/contexts/DisplayModeContext";
import { useLayoutMode } from "@apihub/contexts/LayoutModeContext";
import { CHANGED_LAYOUT_SIDE, LayoutSide, ORIGIN_LAYOUT_SIDE } from "@apihub/types/internal/LayoutSide";
import { isMessageSectionNode } from "@apihub/utils/async-api/node-type-checkers";
import { isDiffAdd, isDiffRemove, isDiffReplace } from "@netcracker/qubership-apihub-api-diff";
import { DiffsClassesBuilder } from "@netcracker/qubership-apihub-next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/utilities";
import { NODE_LEVEL_DIFF_KEY } from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/tree-node.interface";
import { AsyncApiTreeNode, AsyncApiTreeNodeWithDiffs } from "@netcracker/qubership-apihub-next-data-model/model/async-api/types/aliases";
import { AsyncApiTreeNodeKinds } from "@netcracker/qubership-apihub-next-data-model/model/async-api/types/node-kind";
import { FC, useCallback, useEffect, useMemo, useState } from "react";
import { SIDE_BY_SIDE_DIFFS_LAYOUT_MODE } from "../..";
import { DiffFloatingBadgeWrapper } from "../shared-components/DiffFloatingBadgeWrapper/DiffFloatingBadgeWrapper";
import { OneSideLayout } from "../shared-components/Layout/OneSideLayout";
import { SideBySideLayout } from "../shared-components/Layout/SideBySideLayout";
import { ATTRIBUTE_PRECEDED_BY, PrecededBy, WithPrecededByProps } from "../shared-components/WithPrecededByProps";
import { isMessageSectionNodeWithDiffs, isMessageSectionSelectorNodeWithDiffs } from "../shared-utilities/tree-node-guards";
import '../shared-styles/preceded-by.css';
import { X_AXIS_PADDING_ROWS_ASYNC_API } from "../shared-styles/tailwind-classnames";
import { MessageSectionViewer } from "./MessageSectionViewer";
import { Selector, SelectorOption } from "./Selector/Selector";
import { SizeVariant } from "./types/SizeVariant";

type MessageSectionsViewerProps = WithPrecededByProps & {
  node:
  | AsyncApiTreeNode<typeof AsyncApiTreeNodeKinds.MESSAGE_SECTION_SELECTOR>
  | AsyncApiTreeNodeWithDiffs<typeof AsyncApiTreeNodeKinds.MESSAGE_SECTION_SELECTOR>
}

export const MessageSectionsViewer: FC<MessageSectionsViewerProps> = (props) => {
  const { node, [ATTRIBUTE_PRECEDED_BY]: precededBy } = props

  const layoutMode = useLayoutMode()
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const displayMode = useDisplayMode()

  const [selectedSection, setSelectedSection] = useState<SelectorOption | null>(null)
  const sectionNodes: AsyncApiTreeNode[] | AsyncApiTreeNodeWithDiffs[] = node.nestedNodes()
  const sectionSelectorOptions = useMemo(
    () => sectionNodes.map(node => {
      const messageSectionTitle = getMessageSectionTitle(node)
      const messageSectionTestId = getMessageSectionTestId(node)
      if (isMessageSectionNodeWithDiffs(node)) {
        return {
          node: node,
          title: messageSectionTitle,
          testId: messageSectionTestId,
          // diffs
          diffs: node.diffs,
          diffsSummary: node.diffsSummary,
          descendantDiffs: node.descendantDiffs,
          descendantDiffsSummary: node.descendantDiffsSummary,
          diffsSeverities: node.diffsSeverities,
        }
      }
      return {
        node: node,
        title: messageSectionTitle,
        testId: messageSectionTestId,
      }
    }),
    [sectionNodes]
  )

  useEffect(() => {
    if (sectionSelectorOptions.length > 0 && selectedSection === null) {
      setSelectedSection(sectionSelectorOptions[0])
    }
  }, [sectionSelectorOptions, selectedSection])

  const nodeDiff = useMemo(
    () => (
      isMessageSectionSelectorNodeWithDiffs(node)
        ? node.diffs?.[NODE_LEVEL_DIFF_KEY]
        : null
    ),
    [node]
  )
  const nodeDiffCausedAt = useMemo(() => {
    if (nodeDiff) {
      const { data } = nodeDiff
      if (isDiffReplace(data) || isDiffRemove(data)) {
        return data.beforeDeclarationPaths[0]
      }
      if (isDiffAdd(data)) {
        return data.afterDeclarationPaths[0]
      }
    }
    return null
  }, [nodeDiff])
  const diffType = useMemo(() => nodeDiff?.data?.type, [nodeDiff])
  const diffTypeCause = useMemo(() => {
    // TODO: Extract to shared utility function
    const path = nodeDiffCausedAt?.join('.')
    return path ? `caused by ${path} change` : undefined
  }, [nodeDiffCausedAt])

  const renderSelector = useCallback((layoutSide: LayoutSide) => {
    const diffsStyles: Set<string> = new Set()
    if (nodeDiff) {
      const { styles } = nodeDiff
      if (layoutSide === ORIGIN_LAYOUT_SIDE) {
        diffsStyles.add(DiffsClassesBuilder.background(styles.before.backgroundColor))
      }
      if (layoutSide === CHANGED_LAYOUT_SIDE) {
        diffsStyles.add(DiffsClassesBuilder.background(styles.after.backgroundColor))
      }
    }
    return (
      <div
        data-precededby={precededBy}
        className={`message-sections-selector ${X_AXIS_PADDING_ROWS_ASYNC_API} h-full ${Array.from(diffsStyles).join(' ')}`}
      >
        <Selector
          options={sectionSelectorOptions}
          selectedOption={selectedSection}
          onSelectOption={setSelectedSection}
          variant={SizeVariant.SECONDARY}
          // diffs
          layoutSide={layoutSide}
        />
      </div>
    )
  }, [nodeDiff, precededBy, sectionSelectorOptions, selectedSection])

  const renderSelectorRow = useCallback(() => {
    switch (layoutMode) {
      case SIDE_BY_SIDE_DIFFS_LAYOUT_MODE:
        return (
          <DiffFloatingBadgeWrapper
            diffType={diffType}
            diffTypeCause={diffTypeCause}
            hidden={false} // TODO: Implement diffs severities filters
          >
            <SideBySideLayout
              left={renderSelector(ORIGIN_LAYOUT_SIDE)}
              right={renderSelector(CHANGED_LAYOUT_SIDE)}
            />
          </DiffFloatingBadgeWrapper>
        )
      default:
        return (
          <OneSideLayout
            content={renderSelector(CHANGED_LAYOUT_SIDE)}
          />
        )
    }
  }, [diffType, diffTypeCause, layoutMode, renderSelector])

  return (
    <div className="flex flex-col">
      {renderSelectorRow()}
      {selectedSection && isMessageSectionNode(selectedSection.node) && (
        <div data-testid={`${selectedSection.testId}-section`}>
          <MessageSectionViewer
            data-precededby={PrecededBy.MESSAGE_SECTION_SELECTOR}
            node={selectedSection.node}
          />
        </div>
      )}
    </div>
  )
}

function getMessageSectionTitle(node: AsyncApiTreeNode): string {
  switch (node.kind) {
    case AsyncApiTreeNodeKinds.MESSAGE_CONTENT:
      return 'Message'
    case AsyncApiTreeNodeKinds.MESSAGE_CHANNEL:
      return 'Channel'
    case AsyncApiTreeNodeKinds.MESSAGE_OPERATION:
      return 'Operation'
    default:
      return 'Unknown'
  }
}

function getMessageSectionTestId(node: AsyncApiTreeNode): string {
  switch (node.kind) {
    case AsyncApiTreeNodeKinds.MESSAGE_CONTENT:
      return 'message-content'
    case AsyncApiTreeNodeKinds.MESSAGE_CHANNEL:
      return 'message-channel'
    case AsyncApiTreeNodeKinds.MESSAGE_OPERATION:
      return 'message-operation'
    default:
      return 'unknown'
  }
}
