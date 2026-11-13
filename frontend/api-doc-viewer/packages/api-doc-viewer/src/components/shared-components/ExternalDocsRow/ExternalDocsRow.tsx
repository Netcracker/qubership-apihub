import { cn } from "@apihub/utils/common/cn"
import { useLayoutMode } from "@apihub/contexts/LayoutModeContext"
import { CHANGED_LAYOUT_SIDE, LayoutSide, ORIGIN_LAYOUT_SIDE } from "@apihub/types/internal/LayoutSide"
import { SIDE_BY_SIDE_DIFFS_LAYOUT_MODE } from "@apihub/types/LayoutMode"
import { buildDiffCauseByPathCausedAt } from "@apihub/utils/common/changes"
import { DiffsClassesBuilder } from "@netcracker/qubership-apihub-next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/utilities"
import {
  ChangedPropertyMetaData,
  NodeDiffsSeverities,
  NodeDiffsSeverityPlacemennt,
} from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/tree-node.interface"
import { FC, memo, useMemo } from "react"
import { ArrowUpRightIcon } from "../../kit/icons/ArrowUpRightIcon"
import { UxTooltip } from "../../kit/ux/UxTooltip/UxTooltip"
import { X_AXIS_PADDING_ROWS } from "../../shared-styles/tailwind-classnames"
import { DiffFloatingBadgeWrapper } from "../DiffFloatingBadgeWrapper/DiffFloatingBadgeWrapper"
import { OneSideLayout } from "../Layout/OneSideLayout"
import { SideBySideLayout } from "../Layout/SideBySideLayout"
import { ATTRIBUTE_PRECEDED_BY, WithPrecededByProps } from "../WithPrecededByProps"
import "./ExternalDocsRow.css"

export const EXTERNAL_DOCS_LINK_TEXT = 'View external documentation'

export type ExternalDocsSide = {
  url: string
  description?: string
}

export type ExternalDocsRowProps = WithPrecededByProps & {
  /** URL and description shown on a side; `null` = nothing on that side. */
  resolveSide: (layoutSide: LayoutSide) => ExternalDocsSide | null
  diff?: ChangedPropertyMetaData
  diffsSeverities?: NodeDiffsSeverities
}

/**
 * One link with a static text and an up-right arrow; the description is a hover tooltip.
 * Design: docs/design/openapi/entities/operation.md -> "External docs row".
 */
export const ExternalDocsRow: FC<ExternalDocsRowProps> = memo<ExternalDocsRowProps>((props) => {
  const layoutMode = useLayoutMode()
  const { diffsSeverities } = props

  const severity = useMemo(() => diffsSeverities?.[NodeDiffsSeverityPlacemennt.ExternalDocsRow], [diffsSeverities])
  const diffTypeCause = useMemo(() => buildDiffCauseByPathCausedAt(severity?.causedAt), [severity])

  if (layoutMode === SIDE_BY_SIDE_DIFFS_LAYOUT_MODE) {
    return (
      <DiffFloatingBadgeWrapper diffType={severity?.type} diffTypeCause={diffTypeCause} hidden={false}>
        <SideBySideLayout
          left={<ExternalDocsRowContent {...props} layoutSide={ORIGIN_LAYOUT_SIDE} />}
          right={<ExternalDocsRowContent {...props} layoutSide={CHANGED_LAYOUT_SIDE} />}
        />
      </DiffFloatingBadgeWrapper>
    )
  }
  return <OneSideLayout content={<ExternalDocsRowContent {...props} layoutSide={CHANGED_LAYOUT_SIDE} />} />
})

type ExternalDocsRowContentProps = ExternalDocsRowProps & {
  layoutSide: LayoutSide
}

const ExternalDocsRowContent: FC<ExternalDocsRowContentProps> = (props) => {
  const { resolveSide, diff, layoutSide, [ATTRIBUTE_PRECEDED_BY]: precededBy } = props
  const side = resolveSide(layoutSide)
  const styles = diff ? (layoutSide === ORIGIN_LAYOUT_SIDE ? diff.styles.before : diff.styles.after) : undefined
  const backgroundClass = styles ? DiffsClassesBuilder.background(styles.backgroundColor) : ''
  const highlighterClass = styles && side ? DiffsClassesBuilder.highlighter(styles.textHighlighterColor) : ''

  const link = side ? (
    <a
      className={cn("external-docs-row-link inline-flex items-center gap-1")}
      href={side.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={side.description ? `${EXTERNAL_DOCS_LINK_TEXT}: ${side.description}` : EXTERNAL_DOCS_LINK_TEXT}
    >
      <span className={cn(highlighterClass)}>{EXTERNAL_DOCS_LINK_TEXT}</span>
      <ArrowUpRightIcon />
    </a>
  ) : null

  return (
    <div
      data-precededby={precededBy}
      data-testid="external-docs-row"
      className={cn(`external-docs-row-content flex w-full h-full items-center ${X_AXIS_PADDING_ROWS} ${backgroundClass}`)}
    >
      {link && side?.description
        ? <UxTooltip text={side.description} maxWidthClass="max-w-sm">{link}</UxTooltip>
        : link}
    </div>
  )
}
