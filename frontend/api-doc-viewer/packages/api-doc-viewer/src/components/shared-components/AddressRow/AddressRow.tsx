import { cn } from "@apihub/utils/common/cn"
import { TextColors } from "../../shared-styles/colors/text-colors"
import { DiffFloatingBadgeWrapper } from "@apihub/components/shared-components/DiffFloatingBadgeWrapper/DiffFloatingBadgeWrapper"
import { ATTRIBUTE_PRECEDED_BY, WithPrecededByProps } from "@apihub/components/shared-components/WithPrecededByProps"
import { X_AXIS_PADDING_ROWS } from "@apihub/components/shared-styles/tailwind-classnames"
import { useLayoutMode } from "@apihub/contexts/LayoutModeContext"
import { CHANGED_LAYOUT_SIDE, LayoutSide, ORIGIN_LAYOUT_SIDE } from "@apihub/types/internal/LayoutSide"
import { SIDE_BY_SIDE_DIFFS_LAYOUT_MODE } from "@apihub/types/LayoutMode"
import { buildDiffCauseByPathCausedAt } from "@apihub/utils/common/changes"
import { isDiffAdd, isDiffRemove, isDiffReplace } from "@netcracker/qubership-apihub-api-diff"
import { DiffsClassesBuilder } from "@netcracker/qubership-apihub-next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/utilities"
import { ChangedPropertyMetaData, NodeDescendantDiffs, NodeDiffsSeverities, NodeDiffsSeverityPlacemennt } from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/tree-node.interface"
import { ADDRESS_VALUE_FONT_SIZE, AddressValueFit, AddressValueMeasurement } from "@apihub/utils/common/address-value-fit"
import { FC, Fragment, ReactElement, ReactNode, useCallback, useLayoutEffect, useMemo, useRef, useState } from "react"
import { OneSideLayout } from "../Layout/OneSideLayout"
import { SideBySideLayout } from "../Layout/SideBySideLayout"
import { TextValue } from "../TextValue/TextValue"
import { TextValueVariant } from "../TextValue/types"
import "./AddressRow.css"

/** Badge before the address: AsyncAPI action (SEND / RECEIVE), OpenAPI HTTP method. */
export type AddressRowBadge = {
  text: string
  /** Background class from the caller's color config (`components/shared-styles/colors/`). */
  colorClass: string
}

export type AddressRowProps = WithPrecededByProps & {
  badge: AddressRowBadge | null
  address: string
  /** Content after the address, per side (OpenAPI: the deprecated tag when there is no title row). */
  trailing?: (layoutSide: LayoutSide) => ReactElement | null
  // diffs
  diff?: ChangedPropertyMetaData
  descendantDiffs?: NodeDescendantDiffs
  diffsSeverities?: NodeDiffsSeverities
  /** Placement of this row's severity; the address row's own by default. */
  diffsSeverityPlacement?: NodeDiffsSeverityPlacemennt
}

export const AddressRow: FC<AddressRowProps> = (props) => {
  const layoutMode = useLayoutMode()

  // diffs
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { diff, descendantDiffs, diffsSeverities, diffsSeverityPlacement = NodeDiffsSeverityPlacemennt.AddressRow } = props

  const diffSeverityRecord = useMemo(() => diffsSeverities?.[diffsSeverityPlacement], [diffsSeverities, diffsSeverityPlacement])
  const diffType = useMemo(() => diff?.data.type, [diff])
  const diffTypeCause = useMemo(
    () => buildDiffCauseByPathCausedAt(diffSeverityRecord?.causedAt),
    [diffSeverityRecord]
  )

  // Address value fitting: each side reports its measurement, both sides use the smallest fitted size.
  const [measurements, setMeasurements] = useState<Partial<Record<LayoutSide, AddressValueMeasurement>>>({})
  const onMeasure = useCallback((layoutSide: LayoutSide, measurement: AddressValueMeasurement) => {
    setMeasurements(previous => (
      AddressValueFit.isSame(previous[layoutSide], measurement) ? previous : { ...previous, [layoutSide]: measurement }
    ))
  }, [])
  const isSideBySide = layoutMode === SIDE_BY_SIDE_DIFFS_LAYOUT_MODE
  const fontSize = AddressValueFit.sharedSize(
    isSideBySide ? [measurements[ORIGIN_LAYOUT_SIDE], measurements[CHANGED_LAYOUT_SIDE]] : [measurements[CHANGED_LAYOUT_SIDE]],
  )
  const fitProps = (layoutSide: LayoutSide): AddressValueFitProps => ({
    layoutSide,
    fontSize,
    wraps: AddressValueFit.wraps(measurements[layoutSide], fontSize),
    onMeasure,
  })

  switch (layoutMode) {
    case SIDE_BY_SIDE_DIFFS_LAYOUT_MODE:
      return (
        <DiffFloatingBadgeWrapper
          diffType={diffType}
          diffTypeCause={diffTypeCause}
          hidden={false} // TODO: Implement diffs severities filters
        >
          <SideBySideLayout
            left={<AddressRowContent {...props} {...fitProps(ORIGIN_LAYOUT_SIDE)} />}
            right={<AddressRowContent {...props} {...fitProps(CHANGED_LAYOUT_SIDE)} />}
          />
        </DiffFloatingBadgeWrapper>
      )
    default:
      return (
        <OneSideLayout
          content={<AddressRowContent {...props} {...fitProps(CHANGED_LAYOUT_SIDE)} />}
        />
      )
  }
}

type AddressValueFitProps = {
  layoutSide: LayoutSide
  /** Address value font size (px), shared by both sides. */
  fontSize: number
  /** The value does not fit on one line even at the minimum size: it wraps. */
  wraps: boolean
  onMeasure: (layoutSide: LayoutSide, measurement: AddressValueMeasurement) => void
}

type AddressRowContentProps = AddressRowProps & AddressValueFitProps

function widthOf(element: Element | null): number {
  return element ? element.getBoundingClientRect().width : 0
}

function horizontalPaddingOf(element: Element): number {
  const style = getComputedStyle(element)
  return (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0)
}

/** Line-break opportunities after each `/`: a wrapped address breaks between its segments, not inside one. */
function renderAddressText(text: string): ReactNode {
  const segments = text.split('/')
  return segments.map((segment, index) => (
    <Fragment key={index}>{segment}{index < segments.length - 1 && <>/<wbr /></>}</Fragment>
  ))
}

/** The text a side shows: a replaced address shows its own side's value. */
function resolveSideAddress(address: string, diff: ChangedPropertyMetaData | undefined, layoutSide: LayoutSide): string {
  if (diff && isDiffReplace(diff.data)) {
    const sideValue = layoutSide === ORIGIN_LAYOUT_SIDE ? diff.data.beforeValue : diff.data.afterValue
    if (typeof sideValue === 'string') {
      return sideValue
    }
  }
  return address
}

const AddressRowContent: FC<AddressRowContentProps> = (props) => {
  const { badge, address, trailing, layoutSide, diff, fontSize, wraps, onMeasure } = props

  const rowRef = useRef<HTMLDivElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const badgeRef = useRef<HTMLDivElement>(null)
  const trailingRef = useRef<HTMLDivElement>(null)
  const probeRef = useRef<HTMLSpanElement>(null)

  const sideAddress = useMemo(() => resolveSideAddress(address, diff, layoutSide), [address, diff, layoutSide])

  // indent-specific
  const { [ATTRIBUTE_PRECEDED_BY]: precededBy } = props

  const renderAddressValue = useCallback(() => {
    const partialReplaceCase = diff && detectPartialReplaceCase(diff)
    if (!partialReplaceCase) {
      return (
        <TextValue
          value={address}
          variant={TextValueVariant.h4}
          layoutSide={layoutSide}
          diff={diff}
          textFontWeight='normal'
          textColor={TextColors.SECONDARY}
          renderText={renderAddressText}
        />
      )
    }
    const { prefix, beforeSuffix, afterSuffix, diff: partialReplaceDiff } = partialReplaceCase
    const suffix = layoutSide === ORIGIN_LAYOUT_SIDE ? beforeSuffix : afterSuffix
    return (
      <div className={cn('flex flex-row flex-wrap min-w-0')}>
        <TextValue
          value={prefix}
          variant={TextValueVariant.h4}
          layoutSide={layoutSide}
          textFontWeight='normal'
          textColor={TextColors.SECONDARY}
          renderText={renderAddressText}
        />
        <TextValue
          value={suffix}
          variant={TextValueVariant.h4}
          layoutSide={layoutSide}
          diff={partialReplaceDiff}
          textFontWeight='normal'
          textColor={TextColors.SECONDARY}
          renderText={renderAddressText}
        />
      </div>
    )
  }, [address, diff, layoutSide])

  const isBadgeShown = useMemo(() => {
    if (!badge) {
      return false
    }
    if (diff && isDiffAdd(diff.data) && layoutSide === ORIGIN_LAYOUT_SIDE) {
      return false
    }
    return !(diff && isDiffRemove(diff.data) && layoutSide === CHANGED_LAYOUT_SIDE)
  }, [badge, diff, layoutSide])

  const trailingElement = trailing?.(layoutSide) ?? null
  const hasTrailing = trailingElement !== null

  // Width left for the address value: the row's content box minus the trailing content, the grey
  // container's padding, and the badge with its gap. The probe holds the value on one line at the
  // base size; it is observed too, so a late web font re-measures.
  const measure = useCallback(() => {
    const row = rowRef.current
    const box = boxRef.current
    const probe = probeRef.current
    if (!row || !box || !probe) {
      return
    }
    const badgeWidth = widthOf(badgeRef.current)
    const gap = badgeWidth > 0 ? parseFloat(getComputedStyle(box).columnGap) || 0 : 0
    const available = widthOf(row) - horizontalPaddingOf(row) - widthOf(trailingRef.current)
      - horizontalPaddingOf(box) - badgeWidth - gap
    onMeasure(layoutSide, { natural: widthOf(probe), available })
  }, [layoutSide, onMeasure])

  useLayoutEffect(() => {
    measure()
    if (typeof ResizeObserver === 'undefined') {
      return
    }
    const observer = new ResizeObserver(() => measure())
    for (const element of [rowRef.current, badgeRef.current, trailingRef.current, probeRef.current]) {
      if (element) {
        observer.observe(element)
      }
    }
    return () => observer.disconnect()
  }, [measure, sideAddress, isBadgeShown, hasTrailing])

  const diffStyles = useMemo(() => {
    const diffStyles: Set<string> = new Set()
    if (diff) {
      const { styles } = diff
      if (layoutSide === ORIGIN_LAYOUT_SIDE) {
        diffStyles.add(DiffsClassesBuilder.background(styles.before.backgroundColor))
      } else {
        diffStyles.add(DiffsClassesBuilder.background(styles.after.backgroundColor))
      }
    }
    return Array.from(diffStyles)
  }, [diff, layoutSide])

  return (
    <div
      ref={rowRef}
      data-precededby={precededBy}
      className={cn(`address-row address-row-content font-inter-medium flex w-full h-full min-w-0 ${X_AXIS_PADDING_ROWS} ${diffStyles.join(' ')}`)}
    >
      <div
        ref={boxRef}
        className={cn('flex flex-row items-center min-w-0 max-w-full py-2 bg-slate-100 rounded-md gap-3')}
        style={{ paddingLeft: 10, paddingRight: 10 }}
      >
        {isBadgeShown && badge && (
          <div ref={badgeRef} className={cn(`shrink-0 whitespace-nowrap font-bold px-1 py-0 ${badge.colorClass} text-white rounded-md`)}>
            {badge.text}
          </div>
        )}
        <div
          className={cn('address-row-value')}
          data-wrapped={wraps || undefined}
          style={{ '--address-value-font-size': `${fontSize}px` }}
        >
          {renderAddressValue()}
          <span className={cn('address-row-value-probe-frame')} aria-hidden={true}>
            <span
              ref={probeRef}
              className={cn('address-row-value-probe text-value font-normal')}
              style={{ fontSize: ADDRESS_VALUE_FONT_SIZE.base }}
            >
              {sideAddress}
            </span>
          </span>
        </div>
      </div>
      {trailingElement && <div ref={trailingRef} className={cn("flex shrink-0 items-center pl-2")}>{trailingElement}</div>}
    </div>
  )
}

type PartialReplaceCase = {
  prefix: string
  beforeSuffix: string
  afterSuffix: string
  diff: ChangedPropertyMetaData
}

function detectPartialReplaceCase(
  changedPropertyMetaData: ChangedPropertyMetaData,
): false | PartialReplaceCase {
  const { data } = changedPropertyMetaData
  if (!isDiffReplace(data)) {
    return false
  }
  const { beforeValue, afterValue } = data
  if (typeof beforeValue !== 'string' || typeof afterValue !== 'string') {
    return false
  }
  const beforeBraceIndex = beforeValue.indexOf('{')
  const afterBraceIndex = afterValue.indexOf('{')
  const prefix = beforeBraceIndex === -1 ? beforeValue : beforeValue.slice(0, beforeBraceIndex)
  const afterPrefix = afterBraceIndex === -1 ? afterValue : afterValue.slice(0, afterBraceIndex)
  if (prefix !== afterPrefix) {
    return false
  }
  const newDiffData = {
    ...data,
    beforeValue: beforeValue.replace(prefix, ''),
    afterValue: afterValue.replace(prefix, ''),
  }
  return {
    prefix,
    beforeSuffix: beforeBraceIndex === -1 ? '' : beforeValue.slice(beforeBraceIndex),
    afterSuffix: afterBraceIndex === -1 ? '' : afterValue.slice(afterBraceIndex),
    diff: {
      ...changedPropertyMetaData,
      data: newDiffData,
    },
  }
}