import { cn } from "@apihub/utils/common/cn"
import { Selector, SelectorOption } from "@apihub/components/shared-components/Selector/Selector"
import { SelectorVariant } from "@apihub/components/shared-components/Selector/types"
import { NestingIndicatorTitleRow } from "@apihub/components/shared-components/NestingIndicatorTitleRow/NestingIndicatorTitleRow"
import { NestingIndicatorTitleRowUsage } from "@apihub/components/shared-components/NestingIndicatorTitleRow/types"
import { X_AXIS_PADDING_ROWS_JSO } from "@apihub/components/shared-styles/tailwind-classnames"
import { useLayoutMode } from "@apihub/contexts/LayoutModeContext"
import { useEffectiveLevel } from "@apihub/contexts/AsyncLevelContext/useEffectiveLevel"
import { applyLevelReduction } from "@apihub/contexts/AsyncLevelContext/applyLevelReduction"
import { CHANGED_LAYOUT_SIDE, LayoutSide, ORIGIN_LAYOUT_SIDE } from "@apihub/types/internal/LayoutSide"
import { DOCUMENT_LAYOUT_MODE, SIDE_BY_SIDE_DIFFS_LAYOUT_MODE } from "@apihub/types/LayoutMode"
import { buildDiffCauseByPathCausedAt } from "@apihub/utils/common/changes"
import { DiffsClassesBuilder } from "@netcracker/qubership-apihub-next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/utilities"
import {
  ChangedPropertyMetaData,
  NodeDiffsSeverities,
  NodeDiffsSeverityPlacemennt,
} from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/tree-node.interface"
import { JsonSchemaTreeNode } from "@netcracker/qubership-apihub-next-data-model/model/json-schema/types/aliases"
import { DiffAction } from "@netcracker/qubership-apihub-api-diff"
import { memo, useMemo } from "react"
import { DiffFloatingBadgeWrapper } from "../../shared-components/DiffFloatingBadgeWrapper/DiffFloatingBadgeWrapper"
import { LevelIndicator } from "../../shared-components/LevelIndicator"
import { OneSideLayout } from "../../shared-components/Layout/OneSideLayout"
import { SideBySideLayout } from "../../shared-components/Layout/SideBySideLayout"

export type CombinerSelectorRowProps<N extends JsonSchemaTreeNode = JsonSchemaTreeNode> = {
  combinerKindLabel?: string
  showSelector?: boolean
  options: SelectorOption<N>[]
  selectedOption: SelectorOption<N> | null
  onSelectOption: (option: SelectorOption<N>) => void
  selectorRowDiff?: ChangedPropertyMetaData
  diffsSeverities?: NodeDiffsSeverities
  levelReductionAction?: typeof DiffAction.add | typeof DiffAction.remove
}

type CombinerSelectorControlsRowContentProps<N extends JsonSchemaTreeNode = JsonSchemaTreeNode> = CombinerSelectorRowProps<N> & {
  layoutSide: LayoutSide
}

function resolveRowBackgroundClass(
  selectorRowDiff: ChangedPropertyMetaData | undefined,
  layoutSide: LayoutSide,
): string {
  if (!selectorRowDiff) {
    return ""
  }
  const backgroundColor = layoutSide === ORIGIN_LAYOUT_SIDE
    ? selectorRowDiff.styles.before.backgroundColor
    : selectorRowDiff.styles.after.backgroundColor
  return DiffsClassesBuilder.background(backgroundColor)
}

const CombinerSelectorControlsRowContent = memo(<N extends JsonSchemaTreeNode>(props: CombinerSelectorControlsRowContentProps<N>) => {
  const {
    options,
    selectedOption,
    onSelectOption,
    selectorRowDiff,
    layoutSide,
    levelReductionAction,
  } = props

  const baseLevel = useEffectiveLevel(layoutSide)
  const level = useMemo(
    () => applyLevelReduction(baseLevel, layoutSide, levelReductionAction),
    [baseLevel, layoutSide, levelReductionAction],
  )
  const rowBackgroundClass = useMemo(
    () => resolveRowBackgroundClass(selectorRowDiff, layoutSide),
    [layoutSide, selectorRowDiff],
  )

  return (
    <div
      data-testid="json-schema-combiner-selector-row-content"
      className={cn(`json-schema-combiner-selector-row-content flex w-full items-stretch gap-2 ${X_AXIS_PADDING_ROWS_JSO} ${rowBackgroundClass}`.trim())}
    >
      <div className={cn("level-indicator-column flex items-stretch self-stretch")}>
        <LevelIndicator level={level} />
        <div className={cn("w-4")} aria-hidden="true" />
      </div>
      <div className={cn("json-schema-property-row-body flex min-w-0 flex-1 items-center")}>
        <Selector
          options={options}
          selectedOption={selectedOption}
          onSelectOption={onSelectOption}
          variant={SelectorVariant.Secondary}
          layoutSide={layoutSide}
        />
      </div>
    </div>
  )
}) as <N extends JsonSchemaTreeNode>(props: CombinerSelectorControlsRowContentProps<N>) => JSX.Element

const CombinerSelectorControlsRow = memo(<N extends JsonSchemaTreeNode>(props: CombinerSelectorRowProps<N>) => {
  const { diffsSeverities } = props
  const layoutMode = useLayoutMode()

  const diffSeverityRecord = useMemo(
    () => diffsSeverities?.[NodeDiffsSeverityPlacemennt.TitleRow],
    [diffsSeverities],
  )
  const diffType = useMemo(() => diffSeverityRecord?.type, [diffSeverityRecord])
  const diffTypeCause = useMemo(
    () => buildDiffCauseByPathCausedAt(diffSeverityRecord?.causedAt),
    [diffSeverityRecord],
  )

  switch (layoutMode) {
    case SIDE_BY_SIDE_DIFFS_LAYOUT_MODE:
      return (
        <DiffFloatingBadgeWrapper
          diffType={diffType}
          diffTypeCause={diffTypeCause}
          hidden={false}
        >
          <SideBySideLayout
            left={<CombinerSelectorControlsRowContent {...props} layoutSide={ORIGIN_LAYOUT_SIDE} />}
            right={<CombinerSelectorControlsRowContent {...props} layoutSide={CHANGED_LAYOUT_SIDE} />}
          />
        </DiffFloatingBadgeWrapper>
      )
    case DOCUMENT_LAYOUT_MODE:
      return (
        <OneSideLayout
          content={<CombinerSelectorControlsRowContent {...props} layoutSide={CHANGED_LAYOUT_SIDE} />}
        />
      )
  }

  return (
    <div style={{ fontSize: 12, marginTop: 4, marginBottom: 4 }}>
      This layout mode ({layoutMode}) is not supported.
    </div>
  )
}) as <N extends JsonSchemaTreeNode>(props: CombinerSelectorRowProps<N>) => JSX.Element

/**
 * Renders the combiner kind label (`oneOf`, `anyOf`, or `allOf`) and the option buttons as two
 * separate rows. As in every other row component, the element directly under each layout side
 * paints the diff background, so the background also fills the indent that an OpenAPI section adds.
 * Both rows show the same floating badge.
 */
export const CombinerSelectorRow = memo(<N extends JsonSchemaTreeNode>(props: CombinerSelectorRowProps<N>) => {
  const {
    combinerKindLabel,
    showSelector = true,
    selectorRowDiff,
    diffsSeverities,
    levelReductionAction,
  } = props

  if (!showSelector && !combinerKindLabel) {
    return null
  }

  return (
    <>
      {combinerKindLabel && (
        <NestingIndicatorTitleRow
          title={combinerKindLabel}
          usage={NestingIndicatorTitleRowUsage.JsonSchema}
          lastInvisible
          diff={selectorRowDiff}
          diffsSeverities={diffsSeverities}
          diffsSeverityPlacement={NodeDiffsSeverityPlacemennt.TitleRow}
          levelReductionAction={levelReductionAction}
        />
      )}
      {showSelector && (
        <CombinerSelectorControlsRow {...props} />
      )}
    </>
  )
}) as <N extends JsonSchemaTreeNode>(props: CombinerSelectorRowProps<N>) => JSX.Element
