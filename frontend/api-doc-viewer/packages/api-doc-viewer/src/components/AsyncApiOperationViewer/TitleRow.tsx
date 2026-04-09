import { useLayoutMode } from "@apihub/contexts/LayoutModeContext"
import { useLevelContext } from "@apihub/contexts/LevelContext"
import { CHANGED_LAYOUT_SIDE, LayoutSide, ORIGIN_LAYOUT_SIDE } from "@apihub/types/internal/LayoutSide"
import { INLINE_DIFFS_LAYOUT_MODE, SIDE_BY_SIDE_DIFFS_LAYOUT_MODE } from "@apihub/types/LayoutMode"
import type { Diff } from "@netcracker/qubership-apihub-api-diff"
import { FC, memo, ReactElement, useMemo } from "react"
import { Expander } from "./Expander"
import { LevelIndicator } from "./LevelIndicator"

export const TitleVariant = {
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  h5: 'h5',
  h6: 'h6',
  body: 'body',
} as const
export type TitleVariant = typeof TitleVariant[keyof typeof TitleVariant]

type TitleRowProps = {
  value?: string // Document Mode
  diff?: Diff  // Comparison Mode
  expandable: boolean
  expanded?: boolean
  onClickExpander?: () => void
  variant: TitleVariant
  enableMainHeader?: boolean
  subheader?: (layoutSide: LayoutSide) => ReactElement
}

export const TitleRow: FC<TitleRowProps> = memo<TitleRowProps>(props => {
  const layoutMode = useLayoutMode()

  if (layoutMode === INLINE_DIFFS_LAYOUT_MODE) {
    return (
      <div style={{ fontSize: 12, marginTop: 4, marginBottom: 4 }}>
        This layout mode ({layoutMode}) is not supported.
      </div>
    )
  }

  return <TitleRowContainer {...props} />
})

type TitleRowContentProps = TitleRowProps & {
  layoutSide: LayoutSide
}

const TITLE_ROW_MIN_HEIGHT = 18 + 4 + 4 // font size + padding top + padding bottom

const TitleRowContent: FC<TitleRowContentProps> = memo<TitleRowContentProps>((props) => {
  const { expandable, expanded, onClickExpander, layoutSide, enableMainHeader = true, subheader } = props

  const level = useLevelContext()

  const layoutMode = useLayoutMode()
  const isSideBySideDiffsLayoutMode = layoutMode === SIDE_BY_SIDE_DIFFS_LAYOUT_MODE

  const width = isSideBySideDiffsLayoutMode ? 'w-1/2' : 'w-full'

  const showLevelAndExpanderGroup = level > 0 || expandable

  return (
    <div className={`flex flex-row items-center gap-2 ${width}`} style={{ minHeight: TITLE_ROW_MIN_HEIGHT }}>
      {showLevelAndExpanderGroup && (
        <div className='flex flex-row items-stretch h-full'>
          <LevelIndicator level={level} />
          <Expander
            expandable={expandable}
            expanded={expanded}
            onClick={onClickExpander}
            level={level}
          />
        </div>
      )}
      {enableMainHeader && <TitleRowValue {...props} />}
      {subheader?.(layoutSide)}
    </div>
  )
})

const TitleRowValue: FC<TitleRowContentProps> = memo<TitleRowContentProps>((props) => {
  const { value, diff, variant, expandable, onClickExpander } = props

  const resolvedValue = useMemo(
    () => resolveValue(value, diff),
    [diff, value],
  )

  const styledResolvedValue = useMemo(() => {
    const commonStyles = `title-row font-Inter-Medium text-black ${expandable ? 'hover:cursor-pointer' : ''}`
    const commonProps = { className: commonStyles, onClick: onClickExpander }
    switch (variant) {
      case TitleVariant.h1:
        return <h1 {...commonProps}>{resolvedValue}</h1>
      case TitleVariant.h2:
        return <h2 {...commonProps}>{resolvedValue}</h2>
      case TitleVariant.h3:
        return <h3 {...commonProps}>{resolvedValue}</h3>
      case TitleVariant.h4:
        return <h4 {...commonProps}>{resolvedValue}</h4>
      case TitleVariant.h5:
        return <h5 {...commonProps}>{resolvedValue}</h5>
      case TitleVariant.h6:
        return <h6 {...commonProps}>{resolvedValue}</h6>
      case TitleVariant.body:
        return <span {...commonProps}>{resolvedValue}</span>
    }
  }, [resolvedValue, variant, expandable, onClickExpander])

  return styledResolvedValue
})

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function resolveValue(currentValue?: string, diff?: Diff): string | ReactElement | undefined {
  return currentValue
}

const TitleRowContainer: FC<TitleRowProps> = memo<TitleRowProps>((props) => {
  const layoutMode = useLayoutMode()

  const sideBySideLayout = layoutMode === SIDE_BY_SIDE_DIFFS_LAYOUT_MODE

  if (sideBySideLayout) {
    return (
      <div className='flex flex-row'>
        <TitleRowContent {...props} layoutSide={ORIGIN_LAYOUT_SIDE} />
        <TitleRowContent {...props} layoutSide={CHANGED_LAYOUT_SIDE} />
      </div>
    )
  }

  return (
    <div className='flex flex-row'>
      <TitleRowContent {...props} layoutSide={CHANGED_LAYOUT_SIDE} />
    </div>
  )
})
