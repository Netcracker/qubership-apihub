import { cn } from "@apihub/utils/common/cn"
import { useLayoutMode } from "@apihub/contexts/LayoutModeContext"
import { CHANGED_LAYOUT_SIDE, LayoutSide, ORIGIN_LAYOUT_SIDE } from "@apihub/types/internal/LayoutSide"
import { SIDE_BY_SIDE_DIFFS_LAYOUT_MODE } from "@apihub/types/LayoutMode"
import { buildDiffCauseByPathCausedAt } from "@apihub/utils/common/changes"
import { DiffsClassesBuilder } from "@netcracker/qubership-apihub-next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/utilities"
import { ITreeNode } from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree/tree-node.interface"
import {
  ChangedPropertyMetaData,
  NodeDiffsSeverity,
} from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/tree-node.interface"
import { ReactElement } from "react"
import { ArrowScrollStrip } from "../ArrowScrollStrip/ArrowScrollStrip"
import { DiffFloatingBadgeWrapper } from "../DiffFloatingBadgeWrapper/DiffFloatingBadgeWrapper"
import { OneSideLayout } from "../Layout/OneSideLayout"
import { SideBySideLayout } from "../Layout/SideBySideLayout"
import { Selector, SelectorOption } from "../Selector/Selector"
import { SelectorVariant } from "../Selector/types"
import { ATTRIBUTE_PRECEDED_BY, WithPrecededByProps } from "../WithPrecededByProps"
import { X_AXIS_PADDING_ROWS } from "../../shared-styles/tailwind-classnames"

type SecurityToolbarProps<N extends ITreeNode> = WithPrecededByProps & {
  options: SelectorOption<N>[]
  selectedOption: SelectorOption<N> | null
  onSelectOption: (option: SelectorOption<N>) => void
  /** Row background: a whole section add / remove, or `replace` when an option was added / removed. */
  diff?: ChangedPropertyMetaData
  severity?: NodeDiffsSeverity
  /** Whether a side shows the options and arrows (`SecurityRowDiffs.Security.isToolbarShownOnSide`). */
  isShownOnSide: (layoutSide: LayoutSide) => boolean
}

/**
 * Security toolbar: `‹ [option] [option] … ›`. The options form one non-wrapping line in the shared
 * `ArrowScrollStrip` (each arrow scrolls by one option and is disabled at its edge).
 * Shared by every security section (OpenAPI operations now, AsyncAPI servers later).
 * Design: docs/design/openapi/entities/security.md -> "Security toolbar".
 */
export function SecurityToolbar<N extends ITreeNode>(props: SecurityToolbarProps<N>): ReactElement {
  const { diff, severity, isShownOnSide, [ATTRIBUTE_PRECEDED_BY]: precededBy } = props
  const layoutMode = useLayoutMode()

  const renderSide = (layoutSide: LayoutSide): ReactElement => {
    const styles = diff ? (layoutSide === ORIGIN_LAYOUT_SIDE ? diff.styles.before : diff.styles.after) : undefined
    return (
      <div
        data-precededby={precededBy}
        data-testid="security-toolbar"
        className={cn(`security-toolbar flex w-full h-full items-center gap-1 ${X_AXIS_PADDING_ROWS} ${styles ? DiffsClassesBuilder.background(styles.backgroundColor) : ''}`)}
      >
        {isShownOnSide(layoutSide) && <SecurityOptionsStrip {...props} layoutSide={layoutSide} />}
      </div>
    )
  }

  if (layoutMode === SIDE_BY_SIDE_DIFFS_LAYOUT_MODE) {
    return (
      <DiffFloatingBadgeWrapper diffType={severity?.type} diffTypeCause={buildDiffCauseByPathCausedAt(severity?.causedAt)} hidden={false}>
        <SideBySideLayout left={renderSide(ORIGIN_LAYOUT_SIDE)} right={renderSide(CHANGED_LAYOUT_SIDE)} />
      </DiffFloatingBadgeWrapper>
    )
  }
  return <OneSideLayout content={renderSide(CHANGED_LAYOUT_SIDE)} />
}

function SecurityOptionsStrip<N extends ITreeNode>(props: SecurityToolbarProps<N> & { layoutSide: LayoutSide }): ReactElement {
  const { options, selectedOption, onSelectOption, layoutSide } = props
  return (
    <ArrowScrollStrip testIdPrefix="security-toolbar">
      <Selector
        options={options}
        selectedOption={selectedOption}
        onSelectOption={onSelectOption}
        variant={SelectorVariant.Secondary}
        layoutSide={layoutSide}
        noWrap={true}
      />
    </ArrowScrollStrip>
  )
}
