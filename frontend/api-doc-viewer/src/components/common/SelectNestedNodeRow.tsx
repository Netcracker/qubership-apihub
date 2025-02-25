/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { DiffNodeValue, isDiff } from '@netcracker/qubership-apihub-api-data-model'
import { Diff, DiffAction, DiffType } from '@netcracker/qubership-apihub-api-diff'
import type { FC } from 'react'
import { NODE_DIFF_COLOR_MAP } from '../../consts/changes'
import { DEFAULT_LAYOUT_MODE, DEFAULT_ROW_PADDING_LEFT } from '../../consts/configuration'
import { useChangeSeverityFilters } from '../../contexts/ChangeSeverityFiltersContext'
import { useItemChangedFlags } from '../../hooks/changes'
import '../../index.css'
import { NodeId } from '../../types/aliases/nodes'
import { ContentProps } from '../../types/internal/ContentProps'
import { CHANGED_LAYOUT_SIDE, LayoutSide, ORIGIN_LAYOUT_SIDE } from '../../types/internal/LayoutSide'
import { PropsWithChanges } from '../../types/internal/PropsWithChanges'
import { PropsWithNestedChangesSummary } from '../../types/internal/PropsWithChangesSummary'
import { LayoutMode } from '../../types/LayoutMode'
import { NodeTypeData } from '../../types/NodeTypeData'
import { PropsWithoutChangesSummary } from '../../types/PropsWithoutChangesSummary'
import { ArrayUtils } from '../../utils/common/arrays'
import {
  DEFAULT_DIFF_TYPE_AND_CAUSE_PAIR,
  filterChangesList,
  getLayoutModeFlags,
  getLayoutSideFlags,
  isDiffTypeIncluded,
  maxDiffType,
  maxDiffTypeFromNodeSummary
} from '../../utils/common/changes'
import { UxFloatingBadge } from '../kit/ux/UxFloatingBadge/UxFloatingBadge'
import { EmptyContent } from './diffs/EmptyContent'
import { UnsupportedContent } from './diffs/UnsupportedContent'
import { NestingIndicator, NestingIndicatorTitle } from './NestingIndicator'
import { NodeType } from './NodeType'
import { UxDiffMarker } from '../kit/ux/UxMarker/UxDiffMarker'

export type SelectNestedNodeRowProps = PropsWithoutChangesSummary<
  {
    nodesTypeData: Record<NodeId, NodeTypeData & Pick<DiffNodeValue, '$changes'>>
    selectedNodeId?: NodeId
    combiner?: string
    onSelect: (newSelectedNodeId?: NodeId) => void
  } &
  PropsWithChanges &
  PropsWithNestedChangesSummary
>

export const SelectNestedNodeRow: FC<SelectNestedNodeRowProps> = (props) => {
  const {
    nodesTypeData,
    selectedNodeId,
    combiner,
    onSelect,
    layoutMode = DEFAULT_LAYOUT_MODE,
    level = 1,
    $nodeChange,
    $nestedChanges = {},
    $nestedChangesSummary = {},
  } = props

  const filters = useChangeSeverityFilters()

  const {
    isDocumentLayoutMode,
    isInlineDiffsLayoutMode,
    isSideBySideDiffsLayoutMode,
  } = getLayoutModeFlags(layoutMode)

  const isNodeChanged = !isDocumentLayoutMode && !!$nodeChange
  const isContentChanged = !isDocumentLayoutMode && !isNodeChanged &&
    ArrayUtils.isNotEmpty(Object.keys($nestedChanges))
  const isDescendantsChanged = !isDocumentLayoutMode && !isNodeChanged && !isContentChanged &&
    ArrayUtils.isNotEmpty(Object.keys($nestedChangesSummary))

  const { nodeAdded, nodeRemoved, nodeReplaced } = {
    nodeAdded: isNodeChanged && $nodeChange.action === DiffAction.add,
    nodeRemoved: isNodeChanged && $nodeChange.action === DiffAction.remove,
    nodeReplaced: isNodeChanged && $nodeChange.action === DiffAction.replace,
  }

  const rowContentChangesList = filterChangesList(
    Object.values($nestedChanges).filter(isDiff),
    filters
  )

  const [diffType, diffTypeCause] =
    isNodeChanged
      ? maxDiffType($nodeChange)
      : isContentChanged
        ? maxDiffType(...rowContentChangesList)
        : DEFAULT_DIFF_TYPE_AND_CAUSE_PAIR
  const diffTypeIncluded = !!diffType && isDiffTypeIncluded(diffType, filters)

  const diffBackground = diffType && (
    isNodeChanged
      ? NODE_DIFF_COLOR_MAP[$nodeChange.action]
      : isContentChanged || isDescendantsChanged
        ? NODE_DIFF_COLOR_MAP[DiffAction.replace]
        : ''
  )

  const Content: FC<ContentProps> = ({ layoutSide }) => {
    const width = isSideBySideDiffsLayoutMode ? 'w-1/2' : 'w-full'

    return (
      <div className={`flex flex-col ${DEFAULT_ROW_PADDING_LEFT} ${width}`}>
        <div className="flex flex-row">
          <NestingIndicator level={level} lastInvisible={true} />
          <NestingIndicatorTitle>{combiner}</NestingIndicatorTitle>
        </div>
        <div className="flex flex-row gap-5">
          <NestingIndicator level={level} />
          <div className="flex flex-row flex-wrap gap-2 my-2">
            {Object.entries(nodesTypeData).map(([id, data]) => {
              const nestedNodeChangesSummary = $nestedChangesSummary?.[id]
              const diffTypeBySummary = maxDiffTypeFromNodeSummary(nestedNodeChangesSummary)
              const diffTypeBySummaryIncluded = isDiffTypeIncluded(diffTypeBySummary, filters)

              return (
                <DiffButton
                  key={`nestedNode-${id}`}
                  currentNodeId={id}
                  selectedNodeId={selectedNodeId!}
                  data={data}
                  onSelect={onSelect}
                  // diffs
                  layoutMode={layoutMode}
                  layoutSide={layoutSide}
                  $changes={data.$changes}
                  $nodeChange={$nestedChanges[id] as Diff}
                  diffsByNodeEnabled={diffTypeIncluded}
                  diffTypeByDescendants={diffTypeBySummary}
                  diffsByDescendantsEnabled={diffTypeBySummaryIncluded}
                />
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  if (isDocumentLayoutMode) {
    return (
      <div className="flex flex-row">
        <Content layoutSide={CHANGED_LAYOUT_SIDE} />
      </div>
    )
  }

  if (isInlineDiffsLayoutMode) {
    if (!isNodeChanged && !isContentChanged && !isDescendantsChanged) {
      return (
        <div className="flex flex-row">
          <Content layoutSide={ORIGIN_LAYOUT_SIDE} />
        </div>
      )
    }

    return (
      <div className={`flex flex-row relative ${diffTypeIncluded ? diffBackground : ''}`}>
        {diffTypeIncluded && <UxFloatingBadge variant={diffType!} message={diffTypeCause} />}
        <Content layoutSide={ORIGIN_LAYOUT_SIDE} />
      </div>
    )
  }

  if (isSideBySideDiffsLayoutMode) {
    if (!isNodeChanged && !isContentChanged && !isDescendantsChanged) {
      return (
        <div className="flex flex-row">
          <Content layoutSide={ORIGIN_LAYOUT_SIDE} />
          <Content layoutSide={CHANGED_LAYOUT_SIDE} />
        </div>
      )
    }

    return (
      <div className={`flex flex-row relative ${diffTypeIncluded ? diffBackground : ''}`}>
        {diffTypeIncluded && <UxFloatingBadge variant={diffType!} message={diffTypeCause} />}
        {isContentChanged || isDescendantsChanged || isNodeChanged && nodeRemoved
          ? <Content layoutSide={ORIGIN_LAYOUT_SIDE} />
          : <EmptyContent level={$nodeChange?.depth ?? level} />}
        {isContentChanged || isDescendantsChanged || isNodeChanged && (nodeAdded || nodeReplaced)
          ? <Content layoutSide={CHANGED_LAYOUT_SIDE} />
          : <EmptyContent level={$nodeChange?.depth ?? level} />}
      </div>
    )
  }

  return <UnsupportedContent layoutMode={layoutMode} />
}

type DiffButtonProps = {
  currentNodeId: NodeId
  selectedNodeId: NodeId
  data: NodeTypeData
  onSelect: (newSelectedNodeId?: NodeId) => void
  // diffs
  layoutMode: LayoutMode
  layoutSide?: LayoutSide
  $changes?: DiffNodeValue['$changes']
  $nodeChange?: Diff,
  diffsByNodeEnabled: boolean
  diffTypeByDescendants?: DiffType
  diffsByDescendantsEnabled?: boolean
}

const DiffButton: FC<DiffButtonProps> = (props) => {
  const {
    currentNodeId,
    selectedNodeId,
    data,
    onSelect,
    // diffs
    diffsByNodeEnabled,
    diffTypeByDescendants,
    diffsByDescendantsEnabled,
    layoutMode,
    layoutSide,
    $changes,
    $nodeChange,
  } = props

  const { isDocumentLayoutMode, isSideBySideDiffsLayoutMode } = getLayoutModeFlags(layoutMode)
  const { originSide, changedSide } = getLayoutSideFlags(layoutSide)
  const { itemAdded, itemRemoved, itemReplaced } = useItemChangedFlags($nodeChange?.action)

  let diffColorSchema = 'ring-1 ring-slate-300'
  if (diffsByNodeEnabled && !isDocumentLayoutMode) {
    if (itemRemoved) {
      diffColorSchema = 'ring-1 ring-red-500'
      if (originSide) {
        diffColorSchema = `${diffColorSchema} line-through`
      }
    }
    if (itemAdded) {
      diffColorSchema = 'ring-1 ring-green-500'
    }
    if (itemReplaced) {
      diffColorSchema = 'ring-1 ring-amber-500'
      if (originSide) {
        diffColorSchema = `${diffColorSchema} line-through`
      }
    }
  }

  const selectedColorSchema = currentNodeId === selectedNodeId ? 'bg-slate-300' : 'bg-white'

  if (
    isSideBySideDiffsLayoutMode && (
      itemRemoved && changedSide ||
      itemAdded && originSide
    )
  ) return null

  return (
    <div className="relative">
      <button
        key={`nested-${currentNodeId}`}
        className={`rounded-md text-slate-600 text-xs px-2 pb-1 pt-0.5 ${diffColorSchema} ${selectedColorSchema}`}
        onClick={() => onSelect(currentNodeId)}
      >
        <NodeType
          {...data}
          // diffs
          contentChangesColorizing={false}
          $changes={$changes}
          layoutMode={layoutMode}
          layoutSide={layoutSide}
        />
      </button>
      {diffsByDescendantsEnabled && diffTypeByDescendants && (
        <UxDiffMarker
          variant={diffTypeByDescendants}
          tooltip={diffTypeByDescendants}
          floating="top-right"
        />
      )}
    </div>
  )
}
