import { cn } from "@apihub/utils/common/cn"
import { RequiredMark } from "../RequiredMark/RequiredMark"
import { useLayoutMode } from "@apihub/contexts/LayoutModeContext"
import { CHANGED_LAYOUT_SIDE, LayoutSide, ORIGIN_LAYOUT_SIDE } from "@apihub/types/internal/LayoutSide"
import { SIDE_BY_SIDE_DIFFS_LAYOUT_MODE } from "@apihub/types/LayoutMode"
import { buildDiffCauseByPathCausedAt } from "@apihub/utils/common/changes"
import { DiffsClassesBuilder } from "@netcracker/qubership-apihub-next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/utilities"
import {
  ChangedPropertyMetaData,
  NodeDiffsSeverity,
} from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/tree-node.interface"
import { LayoutFrameRow } from "@netcracker/qubership-apihub-next-data-model/model/abstract/layout"
import { FC, memo, ReactElement, ReactNode } from "react"
import { TagsWithDiffs } from "../diffs/TagsWithDiffs"
import { DiffFloatingBadgeWrapper } from "../DiffFloatingBadgeWrapper/DiffFloatingBadgeWrapper"
import { Expander } from "../Expander"
import { WithFramePositionProps } from "../Frame/types"
import { OneSideLayout } from "../Layout/OneSideLayout"
import { SideBySideLayout } from "../Layout/SideBySideLayout"
import { BadgeStub } from "../Separator/BadgeStub"
import { NODE_TITLE_TEXT_CLASSES, X_AXIS_PADDING_ROWS } from "../../shared-styles/tailwind-classnames"
import { ATTRIBUTE_PRECEDED_BY, WithPrecededByProps } from "../WithPrecededByProps"
import "../../shared-styles/frame.css"
import "../SubheaderValue/SubheaderValue.css"
import "./SecurityRows.css"

/**
 * Building blocks of a security scheme card: one per-side row frame plus the contents that go into
 * it (label / value prop, flow header, scopes toggle, scope row). Shared by every security section
 * (OpenAPI operations now, AsyncAPI servers later); containers pass precomputed diffs only.
 * Design: docs/design/openapi/entities/security.md -> "Scheme card".
 */

type SecurityRowProps = WithPrecededByProps & WithFramePositionProps & {
  /** Content of one side; called only on a side where the row has content. */
  renderSide: (layoutSide: LayoutSide) => ReactNode
  /** Row background; a whole add / remove leaves the absent side empty and gray. */
  diff?: ChangedPropertyMetaData
  /** Floating severity badge of this row (own changes only, never an inherited block diff). */
  severity?: NodeDiffsSeverity
  testId?: string
}

/**
 * One card row on both sides. Vertical spacing is padding inside the row only (`data-precededby`;
 * never margins between rows), so neighbouring highlighted rows join into one colored block without
 * white seams.
 */
export const SecurityRow: FC<SecurityRowProps> = (props) => {
  const { renderSide, diff, severity, framePosition, testId } = props
  const { [ATTRIBUTE_PRECEDED_BY]: precededBy } = props
  const layoutMode = useLayoutMode()

  const renderContent = (layoutSide: LayoutSide): ReactElement => {
    const styles = layoutSide === ORIGIN_LAYOUT_SIDE ? diff?.styles.before : diff?.styles.after
    const visible = styles?.isContentVisible ?? true
    return (
      <div
        data-testid={testId}
        data-precededby={precededBy}
        data-frame-position={framePosition?.(layoutSide)}
        className={cn(`security-row flex w-full h-full items-center ${X_AXIS_PADDING_ROWS} ${styles ? DiffsClassesBuilder.background(styles.backgroundColor) : ''}`)}
      >
        {visible && renderSide(layoutSide)}
      </div>
    )
  }

  if (layoutMode === SIDE_BY_SIDE_DIFFS_LAYOUT_MODE) {
    return (
      <DiffFloatingBadgeWrapper diffType={severity?.type} diffTypeCause={buildDiffCauseByPathCausedAt(severity?.causedAt)} hidden={false}>
        <SideBySideLayout left={renderContent(ORIGIN_LAYOUT_SIDE)} right={renderContent(CHANGED_LAYOUT_SIDE)} />
      </DiffFloatingBadgeWrapper>
    )
  }
  return <OneSideLayout content={renderContent(CHANGED_LAYOUT_SIDE)} />
}

type SecurityFrameRowProps = {
  /** Height (the card's inner inset), whole-card tones and badge (next-data-model `LayoutPlanner.frameRow`). */
  frameRow: LayoutFrameRow
  /** `first`: the card's opening row (border at its top), `last`: its closing row (border at its bottom). */
  position: 'first' | 'last'
  /** Whether the card exists on a side: no frame on the side where it was wholly added / removed. */
  presence: { readonly before: boolean, readonly after: boolean }
}

/**
 * A card's content-less opening / closing row inside the border: the border runs along its outer
 * edge, the row is the space between the border and the first / last content row's own half-gap.
 * Painted with the whole-card diff only. Memoised on its values (cards re-render on scope toggles).
 * Design: docs/design/openapi/features/vertical-gaps.md -> "Security cards".
 */
export const SecurityFrameRow: FC<SecurityFrameRowProps> = memo<SecurityFrameRowProps>((props) => {
  const { frameRow, position, presence } = props
  const layoutMode = useLayoutMode()
  const { height, tones } = frameRow

  const renderSide = (layoutSide: LayoutSide): ReactElement => (
    <div
      data-testid={`security-frame-${position === 'first' ? 'start' : 'end'}`}
      data-frame-position={(layoutSide === ORIGIN_LAYOUT_SIDE ? presence.before : presence.after) ? position : undefined}
      className={cn(`security-frame-row flex w-full ${DiffsClassesBuilder.background(layoutSide === ORIGIN_LAYOUT_SIDE ? tones.before : tones.after)}`)}
      style={{ height }}
    />
  )

  if (layoutMode === SIDE_BY_SIDE_DIFFS_LAYOUT_MODE) {
    // A wholly added / removed card: a decorative stub keeps its badge line unbroken (no hover, no text).
    return (
      <div className={cn("relative flex w-full flex-row items-stretch")}>
        <BadgeStub segments={[{ height, type: frameRow.badge }]} />
        <SideBySideLayout left={renderSide(ORIGIN_LAYOUT_SIDE)} right={renderSide(CHANGED_LAYOUT_SIDE)} />
      </div>
    )
  }
  return <OneSideLayout content={renderSide(CHANGED_LAYOUT_SIDE)} />
}, (previous, next) => (
  previous.position === next.position
  && previous.presence.before === next.presence.before
  && previous.presence.after === next.presence.after
  && previous.frameRow.height === next.frameRow.height
  && previous.frameRow.badge === next.frameRow.badge
  && previous.frameRow.tones.before === next.frameRow.tones.before
  && previous.frameRow.tones.after === next.frameRow.tones.after
))

type SecurityPropContentProps = {
  /** Plain text, or composed text with its own highlighted segments (apiKey `<Place> parameter name`). */
  label: ReactNode
  value: ReactNode
}

/**
 * Grid of every security prop (1st and 2nd level): label column = 30% of the card, then a 20px gap
 * and the value. Cells align to the top. One template for both levels, so all values of a card
 * start at the same x.
 */
const SECURITY_PROP_GRID_CLASSES = 'grid w-full grid-cols-[30%_minmax(0,1fr)] items-start gap-x-5'

/**
 * 1st-level security prop: `label <20px> value`. The label uses the JSON Schema property-title text
 * (`NODE_TITLE_TEXT_CLASSES`) and wraps inside its column when longer than 30% of the card.
 */
export const SecurityPropContent: FC<SecurityPropContentProps> = ({ label, value }) => (
  <div className={cn(`security-prop ${SECURITY_PROP_GRID_CLASSES}`)}>
    <div className={cn("security-prop-label min-w-0 break-words")}>
      <span className={cn(NODE_TITLE_TEXT_CLASSES)}>{label}</span>
    </div>
    <div className={cn("security-prop-value min-w-0 break-words")}>{value}</div>
  </div>
)

type SecurityPropValueProps = {
  text: string
  /** Renders the value as a link (URLs). */
  href?: boolean
  highlighterClass?: string
}

export const SecurityPropValue: FC<SecurityPropValueProps> = ({ text, href = false, highlighterClass = '' }) => (
  href
    ? <a className={cn(`security-prop-link ${highlighterClass}`)} href={text} target="_blank" rel="noopener noreferrer">{text}</a>
    : <span className={cn(`security-prop-text ${highlighterClass}`)}>{text}</span>
)

/** Flow part header: `Flow type **Authorization Code**` on a light-gray plate. */
type SecurityFlowHeaderContentProps = {
  prefix: string
  name: string
}

export const SecurityFlowHeaderContent: FC<SecurityFlowHeaderContentProps> = ({ prefix, name }) => (
  <span className={cn("security-flow-header")}>
    {prefix} <span className={cn("security-flow-header-name")}>{name}</span>
  </span>
)

/**
 * `Scopes ▾` - label and expander only (no value), JSON Schema title pattern: the text and the
 * expander are both clickable; the expander comes after the text.
 */
type SecurityScopesToggleContentProps = {
  label: string
  expanded: boolean
  onToggle: () => void
}

export const SecurityScopesToggleContent: FC<SecurityScopesToggleContentProps> = (props) => {
  const { label, expanded, onToggle } = props
  return (
    <div data-testid="security-scopes-toggle" className={cn("security-scopes-toggle flex items-center gap-1")}>
      <span className={cn(`inline-flex hover:cursor-pointer ${NODE_TITLE_TEXT_CLASSES}`)} onClick={onToggle}>
        {label}
      </span>
      <Expander expandable={true} expanded={expanded} onClick={onToggle} level={0} />
    </div>
  )
}

type SecurityScopeContentProps = {
  name: string
  /** Omitted in `simple` display mode (an annotation). */
  description?: string
  required: boolean
  /** Text highlighter of a replaced description. */
  descriptionHighlighterClass: string
  /** Diffs mode: the `required` badge after the description when the required status changed. */
  requiredDiff?: ChangedPropertyMetaData
  layoutSide: LayoutSide
}

/**
 * 2nd-level security prop (one scope): `<20px offset> name * <20px> description [required]`. Same
 * grid as 1st-level props; the 20px offset is padding inside the first cell, so the name gets 30% of
 * the card minus the offset and the description starts where 1st-level values start.
 */
export const SecurityScopeContent: FC<SecurityScopeContentProps> = (props) => {
  const { name, description, required, descriptionHighlighterClass, requiredDiff, layoutSide } = props
  return (
    <div className={cn(`security-scope ${SECURITY_PROP_GRID_CLASSES}`)}>
      <div className={cn("min-w-0 break-words pl-5")}>
        <span className={cn(NODE_TITLE_TEXT_CLASSES)}>{name}</span>
        {required && <RequiredMark />}
      </div>
      <div className={cn("flex min-w-0 flex-wrap items-start gap-2")}>
        {description !== undefined && (
          <span className={cn(`title-row-subheader-value subheader text ${descriptionHighlighterClass}`)}>{description}</span>
        )}
        {requiredDiff && (
          <TagsWithDiffs requiredChanged={true} requiredDiff={requiredDiff} readOnly={false} writeOnly={false} layoutSide={layoutSide} />
        )}
      </div>
    </div>
  )
}
