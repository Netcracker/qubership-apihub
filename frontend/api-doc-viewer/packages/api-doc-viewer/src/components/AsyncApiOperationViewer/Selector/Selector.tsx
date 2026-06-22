import { CHANGED_LAYOUT_SIDE, LayoutSide, ORIGIN_LAYOUT_SIDE } from "@apihub/types/internal/LayoutSide"
import { maxDiffType } from "@apihub/utils/common/changes"
import { DiffAction, DiffType } from "@netcracker/qubership-apihub-api-diff"
import { DiffsClassesBuilder } from "@netcracker/qubership-apihub-next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/utilities"
import { NODE_LEVEL_DIFF_KEY, NodeDescendantDiffsSummary, NodeDiffs, NodeDiffsSummary } from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/tree-node.interface"
import { AsyncApiTreeNode } from "@netcracker/qubership-apihub-next-data-model/model/async-api/types/aliases"
import { FC } from "react"
import { SizeVariant } from "../types/SizeVariant"
import "./Selector.css"

const EMPTY_DIFFS_SUMMARY = new Set<DiffType>()

export type SelectorOption<V extends object | null = object | null> = {
  title: string
  node: AsyncApiTreeNode
  testId?: string
  // diifs
  diffs?: NodeDiffs<V>
  diffsSummary?: NodeDiffsSummary
  descendantDiffsSummary?: NodeDescendantDiffsSummary
}

type SelectorProps<V extends object | null = object | null> = {
  options: SelectorOption<V>[]
  selectedOption: SelectorOption<V> | null
  onSelectOption: (option: SelectorOption<V>) => void
  variant: SizeVariant
  layoutSide?: LayoutSide
}

export const Selector: FC<SelectorProps> = (props) => {
  const { options, selectedOption, onSelectOption, variant, layoutSide = CHANGED_LAYOUT_SIDE } = props

  if (options.length === 0) {
    return null
  }

  return (
    <div className='flex flex-row gap-2'>
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
        return (
          <button
            key={option.node.id}
            data-testid={option.testId}
            className={`button-selector-option button-selector-option_${variant} ${selectedOption === option ? 'selected' : ''} ${diffsRelatedClasses}`}
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              onSelectOption(option)
            }}
          >
            {option.title}
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
