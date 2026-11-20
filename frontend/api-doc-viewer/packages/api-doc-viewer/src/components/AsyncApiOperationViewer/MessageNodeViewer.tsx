import { cn } from "@apihub/utils/common/cn";
import { isMessageSectionSelectorNode } from "@apihub/utils/async-api/node-type-checkers";
import { resolveAsyncApiTextRowVisibility, shouldBeDisplayed } from "@apihub/utils/async-api/visibility-checkers";
import { useDisplayMode } from "@apihub/contexts/DisplayModeContext";
import { NodeDiffsSeverityPlacemennt } from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/tree-node.interface";
import { AsyncApiTreeNode, AsyncApiTreeNodeWithDiffs } from "@netcracker/qubership-apihub-next-data-model/model/async-api/types/aliases";
import { AsyncApiTreeNodeKinds } from "@netcracker/qubership-apihub-next-data-model/model/async-api/types/node-kind";
import { AsyncApiTreeNodeValueTypeMessage } from "@netcracker/qubership-apihub-next-data-model/model/async-api/types/node-value";
import { FC, useMemo } from "react";
import { TextRow } from "../shared-components/TextRow/TextRow";
import { DEFAULT_LONG_TEXT_COLOR } from "../shared-components/TextRow/consts";
import { TextRowProps } from "../shared-components/TextRow/types";
import { TextValueVariant } from "../shared-components/TextValue/types";
import { TitleRow } from "../shared-components/TitleRow/TitleRow";
import { TitleRowProps } from "../shared-components/TitleRow/types";
import { ATTRIBUTE_PRECEDED_BY, PrecededBy, WithPrecededByProps } from "../shared-components/WithPrecededByProps";
import { buildRowDiffProps, useNodeDiffState } from "../shared-components/diffs/node-diff-props";
import { isMessageNodeWithDiffs } from "../shared-utilities/tree-node-guards";
import { AddressRow, AddressRowProps } from "../shared-components/AddressRow/AddressRow";
import { MessageSectionsViewer } from "./MessageSectionsViewer";
import { getSecurityChildren, isSecuritySectionNode } from "@apihub/utils/security/node-type-checkers";
import { AsyncApiSecuritySection } from "./AsyncApiSecuritySection";
import { SizeVariant } from "./types/SizeVariant";
import { resolveAsyncApiActionBadge } from "@apihub/utils/async-api/action-badge-config";

type MessageNodeViewerProps = {
  node: AsyncApiTreeNode<typeof AsyncApiTreeNodeKinds.MESSAGE>
  noHeading?: boolean
}

export const MessageNodeViewer: FC<MessageNodeViewerProps> = (props) => {
  const { node, noHeading = false } = props

  const value = node.value()
  const children = useMemo(() => node.childrenNodes(), [node])
  // The operation's Security section (a child of the message root).
  const security = useMemo(() => getSecurityChildren(node, isSecuritySectionNode).at(0), [node])

  const nodeDiffState = useNodeDiffState<AsyncApiTreeNodeValueTypeMessage, AsyncApiTreeNode | AsyncApiTreeNodeWithDiffs>(node, isMessageNodeWithDiffs)
  const { nodeDiffs } = nodeDiffState

  const titleRowDiffsProps: Pick<TitleRowProps, 'diff' | 'descendantDiffs' | 'diffsSeverities'> = useMemo(
    () => buildRowDiffProps<AsyncApiTreeNodeValueTypeMessage>(nodeDiffState, { diffKey: "title" }),
    [nodeDiffState],
  )

  const addressRowDiffsProps: Pick<AddressRowProps, 'diff' | 'descendantDiffs' | 'diffsSeverities'> = useMemo(
    () => buildRowDiffProps<AsyncApiTreeNodeValueTypeMessage>(nodeDiffState, { diffKey: "address" }),
    [nodeDiffState],
  )

  const descriptionRowDiffsProps: Pick<TextRowProps, 'diff' | 'descendantDiffs' | 'diffsSeverities'> = useMemo(
    () => buildRowDiffProps<AsyncApiTreeNodeValueTypeMessage>(nodeDiffState, {
      diffKey: "description",
      diffsSeverityPlacement: NodeDiffsSeverityPlacemennt.DescriptionRow,
    }),
    [nodeDiffState],
  )

  const summaryRowDiffsProps: Pick<TextRowProps, 'diff' | 'descendantDiffs' | 'diffsSeverities'> = useMemo(
    () => buildRowDiffProps<AsyncApiTreeNodeValueTypeMessage>(nodeDiffState, {
      diffKey: "summary",
      diffsSeverityPlacement: NodeDiffsSeverityPlacemennt.SummaryRow,
    }),
    [nodeDiffState],
  )

  const isTitleDisplayed = useMemo(() => shouldBeDisplayed<AsyncApiTreeNodeValueTypeMessage>(value, nodeDiffs, 'title'), [value, nodeDiffs])
  const displayMode = useDisplayMode()
  const { showDescription: isDescriptionDisplayed, showSummary: isSummaryDisplayed } = useMemo(
    () => resolveAsyncApiTextRowVisibility<AsyncApiTreeNodeValueTypeMessage>(value, nodeDiffs, displayMode),
    [value, nodeDiffs, displayMode],
  )

  const addressRowPrecededBy = noHeading
    ? PrecededBy.ROOT
    : PrecededBy.MESSAGE_SECTION_HEADER_HIGH_LEVEL

  // What the first element after the operation header (Security, else the section selector) follows.
  const headerPrecededBy = isSummaryDisplayed
    ? PrecededBy.SUMMARY_ROW
    : isDescriptionDisplayed
      ? PrecededBy.DESCRIPTION_ROW
      : PrecededBy.ADDRESS_ROW

  return (
    <div className={cn("flex flex-col")}>
      {!noHeading && isTitleDisplayed && (
        <TitleRow
          data-precededby={PrecededBy.ROOT}
          value={value?.title ?? ''}
          expandable={false}
          variant={TextValueVariant.h1}
          // diffs
          {...titleRowDiffsProps}
        />
      )}
      {!noHeading && !isTitleDisplayed && (
        <TitleRow
          data-precededby={PrecededBy.ROOT}
          value={node.key.toString()}
          expandable={false}
          variant={TextValueVariant.h1}
          // diffs
          {...titleRowDiffsProps}
        />
      )}
      <AddressRow
        data-precededby={addressRowPrecededBy}
        badge={resolveAsyncApiActionBadge(value?.action ?? '')}
        address={value?.address ?? ''}
        // diffs
        {...addressRowDiffsProps}
      />
      {isDescriptionDisplayed && (
        <TextRow
          data-precededby={PrecededBy.ADDRESS_ROW}
          value={value?.description ?? ''}
          variant={TextValueVariant.h4}
          textFontWeight='normal'
          textColor={DEFAULT_LONG_TEXT_COLOR}
          // diffs
          {...descriptionRowDiffsProps}
        />
      )}
      {isSummaryDisplayed && (
        <TextRow
          data-precededby={
            isDescriptionDisplayed
              ? PrecededBy.DESCRIPTION_ROW
              : PrecededBy.ADDRESS_ROW
          }
          value={value?.summary ?? ''}
          variant={TextValueVariant.h4}
          textFontWeight='normal'
          textColor={DEFAULT_LONG_TEXT_COLOR}
          // diffs
          {...summaryRowDiffsProps}
        />
      )}
      {security && (
        <AsyncApiSecuritySection
          data-precededby={headerPrecededBy}
          node={security}
          variant={SizeVariant.PRIMARY}
        />
      )}
      <MessageChildrenViewer
        data-precededby={security ? PrecededBy.SECURITY_SECTION : headerPrecededBy}
        children={children}
      />
    </div>
  )
}

type OperationChildrenViewerProps = WithPrecededByProps & {
  children: AsyncApiTreeNode[]
}

const MessageChildrenViewer: FC<OperationChildrenViewerProps> = (props) => {
  const { children, [ATTRIBUTE_PRECEDED_BY]: precededBy } = props

  return (
    <div className={cn("flex flex-col")}>
      {children.map(child => {
        if (isMessageSectionSelectorNode(child)) {
          return (
            <MessageSectionsViewer
              data-precededby={precededBy}
              key={child.key}
              node={child}
            />
          )
        }
        return null
      })}
    </div>
  )
}
