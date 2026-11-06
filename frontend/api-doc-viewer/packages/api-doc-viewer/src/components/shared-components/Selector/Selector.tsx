import { cn } from "@apihub/utils/common/cn"
import { CHANGED_LAYOUT_SIDE, LayoutSide, ORIGIN_LAYOUT_SIDE } from "@apihub/types/internal/LayoutSide"
import { maxDiffType } from "@apihub/utils/common/changes"
import { DiffAction, DiffType } from "@netcracker/qubership-apihub-api-diff"
import { DiffsClassesBuilder } from "@netcracker/qubership-apihub-next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/utilities"
import { ITreeNode } from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree/tree-node.interface"
import { NODE_LEVEL_DIFF_KEY, NodeDescendantDiffsSummary, NodeDiffs, NodeDiffsSummary } from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/tree-node.interface"
import { ReactNode } from "react"
import { SelectorVariant } from "./types"
import "./Selector.css"

const EMPTY_DIFFS_SUMMARY = new Set<DiffType>()

export type SelectorOption<
  N extends ITreeNode,
  V extends object | null = object | null,
> = {
  /** Plain content, or a `(layoutSide) => ReactNode` for content that differs per diff side (see `NestingIndicatorTitleRow`'s `title` prop for the same pattern). */
  title: ReactNode | ((layoutSide: LayoutSide) => ReactNode)
  node: N
  testId?: string
  /**
   * Option color class from the caller's color config (`components/shared-styles/colors/`, e.g.
   * `openapi-response-code_2xx`); omitted = the neutral grey look (unchanged markup).
   */
  toneClass?: string
  diffs?: NodeDiffs<V>
  diffsSummary?: NodeDiffsSummary
  descendantDiffsSummary?: NodeDescendantDiffsSummary
}

type SelectorProps<
  N extends ITreeNode,
  V extends object | null = object | null,
> = {
  options: SelectorOption<N, V>[]
  selectedOption: SelectorOption<N, V> | null
  onSelectOption: (option: SelectorOption<N, V>) => void
  variant: SelectorVariant
  layoutSide?: LayoutSide
  /**
   * One non-wrapping line of options for an `ArrowScrollStrip` (security toolbar, response codes); each option is
   * cropped with an ellipsis down to one character. Omitted = today's wrapping layout.
   */
  noWrap?: boolean
}

export function Selector<
  N extends ITreeNode,
  V extends object | null = object | null,
>(props: SelectorProps<N, V>): JSX.Element | null {
  const { options, selectedOption, onSelectOption, variant, layoutSide = CHANGED_LAYOUT_SIDE, noWrap = false } = props

  if (options.length === 0) {
    return null
  }

  return (
    <div className={cn(noWrap ? 'flex flex-row flex-nowrap gap-2' : 'flex flex-row flex-wrap gap-2')}>
      {options.map((option) => {
        const { diffsRelatedClassesList, isInvisible } = resolveOptionDiffPresentation({
          diffs: option.diffs,
          diffsSummary: option.diffsSummary,
          descendantDiffsSummary: option.descendantDiffsSummary,
          layoutSide,
        })
        if (isInvisible) {
          return null
        }
        const diffsRelatedClasses = diffsRelatedClassesList.join(' ')
        const resolvedTitle = typeof option.title === "function" ? option.title(layoutSide) : option.title
        // Neutral options keep their markup byte-identical (no tone class), so existing selectors do not move.
        const toneClass = option.toneClass ? ` ${option.toneClass}` : ''
        const croppedClass = noWrap ? ' button-selector-option-cropped' : ''
        return (
          <button
            key={option.node.id}
            data-testid={option.testId}
            className={cn(`button-selector-option button-selector-option-${variant}${toneClass}${croppedClass} ${selectedOption === option ? 'selected' : ''} ${diffsRelatedClasses}`)}
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              onSelectOption(option)
            }}
          >
            {noWrap ? <span className={cn("button-selector-option-label")}>{resolvedTitle}</span> : resolvedTitle}
          </button>
        )
      })}
    </div>
  )
}

type ResolveOptionDiffPresentationParams<V extends object | null = object | null> = {
  diffs?: NodeDiffs<V>
  diffsSummary?: NodeDiffsSummary
  descendantDiffsSummary?: NodeDescendantDiffsSummary
  layoutSide: LayoutSide
}

type ResolveOptionDiffPresentationResult = {
  diffsRelatedClassesList: string[]
  isInvisible: boolean
}

function resolveOptionDiffPresentation<V extends object | null = object | null>(
  params: ResolveOptionDiffPresentationParams<V>,
): ResolveOptionDiffPresentationResult {
  const { diffs, diffsSummary, descendantDiffsSummary, layoutSide } = params
  const diffsRelatedClassesList: string[] = []
  let isInvisible = false
  if (diffs || diffsSummary || descendantDiffsSummary) {
    const diffWholeNode = diffs?.[NODE_LEVEL_DIFF_KEY]
    if (diffWholeNode) {
      const { styles } = diffWholeNode
      switch (layoutSide) {
        case ORIGIN_LAYOUT_SIDE:
          if (!diffWholeNode.inherited) {
            diffsRelatedClassesList.push(DiffsClassesBuilder.borderShadow(styles.before.borderShadowColor))
          }
          isInvisible = diffWholeNode.data.action === DiffAction.add
          break
        case CHANGED_LAYOUT_SIDE:
          if (!diffWholeNode.inherited) {
            diffsRelatedClassesList.push(DiffsClassesBuilder.borderShadow(styles.after.borderShadowColor))
          }
          isInvisible = diffWholeNode.data.action === DiffAction.remove
          break
      }
    }
    if (!diffWholeNode?.inherited && (diffsSummary || descendantDiffsSummary)) {
      const safeDiffsSummary = diffsSummary ?? EMPTY_DIFFS_SUMMARY
      const safeDescendantDiffsSummary = descendantDiffsSummary ?? EMPTY_DIFFS_SUMMARY
      const combinedDiffsSummary = new Set([...safeDiffsSummary, ...safeDescendantDiffsSummary])
      const resolvedDiffType = maxDiffType(combinedDiffsSummary)
      diffsRelatedClassesList.push(resolvedDiffType ? DiffsClassesBuilder.roundMarker(resolvedDiffType) : '')
    }
  }
  return { diffsRelatedClassesList, isInvisible }
}
