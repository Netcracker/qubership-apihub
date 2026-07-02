import { ChangedPropertyMetaData, DiffHighlightingApplicationMode, HighlightVariant } from "@apihub/next-data-model/model/abstract/tree-with-diffs/tree-node.interface";
import { CHANGED_LAYOUT_SIDE, LayoutSide, ORIGIN_LAYOUT_SIDE } from "@apihub/types/internal/LayoutSide";
import { ArrayUtils } from "@apihub/utils/common/arrays";
import { isDiffAdd, isDiffRemove, isDiffRename, isDiffReplace } from "@netcracker/qubership-apihub-api-diff";
import { DiffsClassesBuilder } from "@netcracker/qubership-apihub-next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/utilities";
import { Dispatch, FC, memo, ReactNode, SetStateAction, useCallback, useMemo, useState } from "react";
import { TitleRowUsage } from "../TitleRow/types";
import './TextValue.css';
import { TextValueVariant } from "./types";

type TextValueProps = {
  value?: string
  variant: TextValueVariant
  layoutSide: LayoutSide
  onClick?: () => void
  labelFontWeight?: 'normal' | 'medium' | 'bold'
  textFontWeight?: 'normal' | 'medium' | 'bold'
  labelColor?: string
  textColor?: string
  label?: string
  // diffs
  diff?: ChangedPropertyMetaData
  usage?: TitleRowUsage
  highlightingMode?: DiffHighlightingApplicationMode
}

export type TextExpanderProps = Partial<{
  isExpandable: boolean
  expanded: boolean
  setExpanded: Dispatch<SetStateAction<boolean>>
  variant: TextValueVariant
}>

const Expander: FC<TextExpanderProps> = props => {
  const { isExpandable, expanded, setExpanded, variant } = props

  const onClick = useCallback(() => {
    setExpanded?.(prev => !prev)
  }, [setExpanded])

  return <>
    {isExpandable && (
      <div className="mt-1">
        <a
          className={`text-value-expander ${getExpanderFontSizeClass(variant)} text-blue-600 hover:text-blue-500 hover:cursor-pointer`.trim()}
          onClick={onClick}
        >
          {!expanded ? 'Show more' : 'Show less'}
        </a>
      </div>
    )}
  </>
}

export const TextValue: FC<TextValueProps> = memo<TextValueProps>((props) => {
  const { value, variant, layoutSide, onClick, diff, usage, highlightingMode = DiffHighlightingApplicationMode.Default } = props

  const isDefaultDiffHighlighting = highlightingMode === DiffHighlightingApplicationMode.Default
  const isInvisibleDiffHighlighting = highlightingMode === DiffHighlightingApplicationMode.Invisible

  // value/font specific
  const { textFontWeight, labelFontWeight, labelColor, textColor, label } = props

  const [expanded, setExpanded] = useState(false)

  const renderElement = useCallback((
    resolvedValue: string | undefined,
    diffsStyleClasses: string[],
    isInvisible: boolean,
  ) => {
    if (isInvisible) {
      return null
    }
    const diffsStyles = isInvisibleDiffHighlighting ? '' : diffsStyleClasses.join(' ')
    const commonStylesWithoutDiffs = `text-value ${onClick ? 'hover:cursor-pointer' : ''} ${textFontWeight ? `font-${textFontWeight}` : ''}`.trim()
    const commonStyles = `${commonStylesWithoutDiffs} ${diffsStyles}`.trim()
    const commonProps = {
      onClick: onClick,
      ...textColor?.trim() ? { style: { color: textColor } } : {},
    }
    resolvedValue = expanded ? resolvedValue : shortenValue(resolvedValue)

    const renderByVariant = (content: ReactNode, className: string) => {
      const variantProps = {
        ...commonProps,
        className,
      }
      switch (variant) {
        case TextValueVariant.h1:
          return <h1 {...variantProps}>{content}</h1>
        case TextValueVariant.h2:
          return <h2 {...variantProps}>{content}</h2>
        case TextValueVariant.h3:
          return <h3 {...variantProps}>{content}</h3>
        case TextValueVariant.h4:
          return <h4 {...variantProps}>{content}</h4>
        case TextValueVariant.h5:
          return <h5 {...variantProps}>{content}</h5>
        case TextValueVariant.h6:
          return <h6 {...variantProps}>{content}</h6>
        case TextValueVariant.body1:
          return <span {...variantProps} className={`${className} text-value-body1`.trim()}>{content}</span>
        case TextValueVariant.body2:
          return <span {...variantProps} className={`${className} text-value-body2`.trim()}>{content}</span>
      }
    }

    if (label) {
      return renderByVariant(
        <>
          <span
            className={labelFontWeight ? `font-${labelFontWeight}` : 'font-bold'}
            style={labelColor?.trim() ? { color: labelColor } : {}}
          >
            {`${label}: `}
          </span>
          <span className={diffsStyles}>{resolvedValue}</span>
        </>,
        commonStylesWithoutDiffs,
      )
    }

    return renderByVariant(resolvedValue, commonStyles)
  }, [expanded, isInvisibleDiffHighlighting, label, labelColor, labelFontWeight, onClick, textColor, textFontWeight, variant])

  const renderValue = useCallback((value: string | undefined): [string | undefined, string[], boolean] => {
    const diffsStyleClasses: string[] = []
    let resolvedValue: string | undefined = value
    let isInvisible = false
    if (diff) {
      const { data, styles } = diff
      switch (layoutSide) {
        case ORIGIN_LAYOUT_SIDE:
          diffsStyleClasses.push(DiffsClassesBuilder.highlighter(styles.before.textHighlighterColor))
          if (isDefaultDiffHighlighting) {
            if (isDiffRemove(data)) {
              /*
              TODO 09.06.26:
              This handling was added to fix the issue when, for example, we display diff in header of Message Node when it was wholly added/removed,
              but provided `value` is just a string (title or node key) and `beforeValue/afterValue` from diff is an object.
              
              Disadvantages of this approach:
              - Here we insist on assumption that in that case `value` is always appropriate value and is always a string. But technically it can be wrong.
              - This approach misleads new concept of ADV that `api-doc-viewer` package is just a renderer, it doesn't have any data handling logic.
              - It requires additional responsibility of users of the component (e.g. MessageNodeViewer) which MUST NOT know about internal TextValue logic. 
              They must guarantee that provided `value` is always appropriate value and is always a string.

              So, first attempt to refactor this approach is failed because simple solution (blocking this logic of resolving value from diff) broke
              TextValue usages where this case is not applicable.

              The best solution is re-synthesize diffs with synthetic `beforeValue/afterValue` values, but it breaks other concept: as less data as possible.
              We do not want to store a lot of synthetic data which is almost the same as original data.

              This comment is related to all the logic of reassigning `resolvedValue` from `data` below.
              */
              resolvedValue = isString(data.beforeValue) ? data.beforeValue : resolvedValue
            }
            if (isDiffReplace(data)) {
              if (usage === TitleRowUsage.JsoProperty && !isInvisibleDiffHighlighting) {
                diffsStyleClasses.push(DiffsClassesBuilder.highlighter(HighlightVariant.Yellow))
              }
              resolvedValue = isString(data.beforeValue) ? data.beforeValue : resolvedValue
            }
            if (isDiffRename(data)) {
              resolvedValue = isString(data.beforeKey) ? data.beforeKey : resolvedValue
            }
          }
          if (isDiffAdd(data)) {
            isInvisible = true
          }
          break
        case CHANGED_LAYOUT_SIDE:
          diffsStyleClasses.push(DiffsClassesBuilder.highlighter(styles.after.textHighlighterColor))
          if (isDefaultDiffHighlighting) {
            if (isDiffAdd(data)) {
              resolvedValue = isString(data.afterValue) ? data.afterValue : resolvedValue
            }
            if (isDiffReplace(data)) {
              if (usage === TitleRowUsage.JsoProperty && !isInvisibleDiffHighlighting) {
                diffsStyleClasses.push(DiffsClassesBuilder.highlighter(HighlightVariant.Yellow))
              }
              resolvedValue = isString(data.afterValue) ? data.afterValue : resolvedValue
            }
            if (isDiffRename(data)) {
              resolvedValue = isString(data.afterKey) ? data.afterKey : resolvedValue
            }
          }
          if (isDiffRemove(data)) {
            isInvisible = true
          }
          break
      }
    }
    return [resolvedValue, diffsStyleClasses, isInvisible]
  }, [diff, isDefaultDiffHighlighting, isInvisibleDiffHighlighting, layoutSide, usage])

  const [resolvedValue, diffsStyleClasses, isInvisible] = renderValue(value)

  const content = useMemo(() => <div className="flex flex-col items-start gap-1">
    {renderElement(resolvedValue, diffsStyleClasses, isInvisible)}
    {!isInvisible && (
      <Expander
        isExpandable={isExpandable(resolvedValue)}
        expanded={expanded}
        setExpanded={setExpanded}
        variant={variant}
      />
    )}
  </div>, [renderElement, resolvedValue, diffsStyleClasses, isInvisible, expanded, setExpanded, variant])

  return content
})

const OVERFLOW_LINES_AMOUNT = 5
const OVERFLOW_CHARACTERS_AMOUNT = 300

function isExpandable(value: string | undefined): boolean {
  if (!value) {
    return false
  }
  return (
    value.length > OVERFLOW_CHARACTERS_AMOUNT ||
    ArrayUtils.trim(value.split('\n')).length > OVERFLOW_LINES_AMOUNT
  )
}

function shortenValue(value: string | undefined): string | undefined {
  if (!value) {
    return undefined
  }
  if (value.length > OVERFLOW_CHARACTERS_AMOUNT) {
    return value.slice(0, OVERFLOW_CHARACTERS_AMOUNT) + '...'
  }
  const lines = ArrayUtils.trim(value.split('\n'))
  if (lines.length > OVERFLOW_LINES_AMOUNT) {
    return lines.slice(0, OVERFLOW_LINES_AMOUNT).join('\n') + '...'
  }
  return value
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function getExpanderFontSizeClass(variant: TextValueVariant | undefined): string {
  switch (variant) {
    case TextValueVariant.h1:
      return 'text-value-expander--h1'
    case TextValueVariant.h2:
      return 'text-value-expander--h2'
    case TextValueVariant.h3:
      return 'text-value-expander--h3'
    case TextValueVariant.h4:
      return 'text-value-expander--h4'
    case TextValueVariant.h5:
      return 'text-value-expander--h5'
    case TextValueVariant.h6:
      return 'text-value-expander--h6'
    case TextValueVariant.body1:
      return 'text-value-expander--body1'
    case TextValueVariant.body2:
      return 'text-value-expander--body2'
    default:
      return 'text-value-expander--body2'
  }
}