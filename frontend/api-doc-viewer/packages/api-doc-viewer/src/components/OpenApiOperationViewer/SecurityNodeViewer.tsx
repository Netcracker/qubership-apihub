import { cn } from "@apihub/utils/common/cn"
import { SECURITY_SECTION_TITLE } from "@netcracker/qubership-apihub-next-data-model/model/security/display/labels"
import { OPENAPI_SECURITY_OPTIONAL_BADGE_COLOR_SCHEMA, OPENAPI_SECURITY_OPTIONAL_BADGE_SIZE_CLASS } from "../../consts/tags"
import { useLayoutMode } from "@apihub/contexts/LayoutModeContext"
import { LayoutSide } from "@apihub/types/internal/LayoutSide"
import { OpenApiViewSelection } from "@apihub/utils/openapi/view-selection"
import { OPENAPI_SECURITY_DISPLAY_LABELS } from "@netcracker/qubership-apihub-next-data-model/model/openapi/security-presentation"
import { SECURITY_OPTIONAL_BADGE_TEXT } from "@netcracker/qubership-apihub-next-data-model/model/security/display/labels"
import { SecurityRowDiffs } from "@netcracker/qubership-apihub-next-data-model/model/security/tree-with-diffs/row-diffs"
import { OpenApiTreeNode } from "@netcracker/qubership-apihub-next-data-model/model/openapi/types/aliases"
import { OpenApiTreeNodeKinds } from "@netcracker/qubership-apihub-next-data-model/model/openapi/types/node-kind"
import { FC, ReactElement, useCallback } from "react"
import { BadgeWithDiffs } from "../shared-components/diffs/BadgeWithDiffs"
import { SecurityAlternativesNode, SecurityToolbarRow } from "../shared-components/Security/SecuritySectionBase"
import { TextValueVariant } from "../shared-components/TextValue/types"
import { TitleRow } from "../shared-components/TitleRow/TitleRow"
import { PrecededBy } from "../shared-components/WithPrecededByProps"
import { takeOpenApiSeverities } from "./diff-state"
import { StackBlock, StackLayout } from "../shared-components/Layout/StackLayout"
import { useOpenApiViewState } from "./OpenApiViewStateContext"

export type SecurityNode = OpenApiTreeNode<typeof OpenApiTreeNodeKinds.SECURITY>

type SecurityNodeViewerProps = {
  blocks: readonly StackBlock[]
}

type SecuritySectionRowProps = {
  node: SecurityNode
}

/**
 * "Security" (h2), the security toolbar (alternatives, OR, always shown), framed scheme cards (AND).
 * Layout block: `security-blocks.tsx`.
 */
export const SecurityNodeViewer: FC<SecurityNodeViewerProps> = ({ blocks }) => (
  <div data-testid="openapi-security-section" className={cn("flex flex-col")}>
    <StackLayout blocks={blocks} level="security" />
  </div>
)

/** "Security" (h2) with the `Optional` badge when anonymous access (`{}`) is allowed on that side. */
export const SecurityTitleRow: FC<SecuritySectionRowProps> = ({ node }) => {
  const layoutMode = useLayoutMode()
  const badgeDiff = SecurityRowDiffs.Security.takeOptionalBadgeDiff(node)
  const renderOptionalBadge = useCallback((layoutSide: LayoutSide): ReactElement => (
    badgeDiff || SecurityRowDiffs.Security.isAnonymousAllowedOnSide(node, layoutSide)
      ? (
        <BadgeWithDiffs
          label={SECURITY_OPTIONAL_BADGE_TEXT}
          colorSchema={OPENAPI_SECURITY_OPTIONAL_BADGE_COLOR_SCHEMA}
          sizeClassName={OPENAPI_SECURITY_OPTIONAL_BADGE_SIZE_CLASS}
          layoutMode={layoutMode}
          layoutSide={layoutSide}
          diff={badgeDiff?.data}
        />
      )
      : <></>
  ), [badgeDiff, layoutMode, node])
  return (
    <TitleRow
      data-precededby={PrecededBy.SEPARATOR_LAYOUT_ROW}
      value={SECURITY_SECTION_TITLE}
      expandable={false}
      variant={TextValueVariant.h2}
      subheader={renderOptionalBadge}
      diff={SecurityRowDiffs.Security.takeTitleRowDiff(node)}
      diffsSeverities={takeOpenApiSeverities(node)}
    />
  )
}

/** The alternatives toolbar; the selection lives in the operation view state. */
export const OpenApiSecurityToolbarRow: FC<SecuritySectionRowProps & { toolbar: SecurityAlternativesNode }> = ({ node, toolbar }) => {
  const { selection, select } = useOpenApiViewState()
  return (
    <SecurityToolbarRow
      toolbar={toolbar}
      labels={OPENAPI_SECURITY_DISPLAY_LABELS}
      selected={OpenApiViewSelection.alternative(node, selection)}
      onSelect={(alternative) => select(node.id, alternative.id)}
    />
  )
}
