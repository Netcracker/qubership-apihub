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

import { isDiff, isDiffMetaRecord } from '@netcracker/qubership-apihub-api-data-model'
import { DiffAction } from '@netcracker/qubership-apihub-api-diff'
import type { FC, ReactNode } from 'react'
import {
  BLOCK_CONTENT_DIFF_COLOR_MAP,
  DEFAULT_STRIKETHROUGH_VALUE_CLASS,
  NODE_DIFF_COLOR_MAP
} from '../../consts/changes'
import {
  DEFAULT_LAYOUT_MODE,
  DEFAULT_ROW_DEPTH,
  DEFAULT_ROW_PADDING_LEFT,
  DEFAULT_SERIES_ITEM,
  DEFAULT_SERIES_ITEM_TEXT_COLOR,
  SHIFTED_ROW_PADDING_LEFT
} from '../../consts/configuration'
import { useChangeSeverityFilters } from '../../contexts/ChangeSeverityFiltersContext'
import '../../index.css'
import { ContentProps } from '../../types/internal/ContentProps'
import { CHANGED_LAYOUT_SIDE, ORIGIN_LAYOUT_SIDE } from '../../types/internal/LayoutSide'
import { PropsWithChanges } from '../../types/internal/PropsWithChanges'
import { PropsWithShift } from '../../types/internal/PropsWithShift'
import { PropsWithoutChangesSummary } from "../../types/PropsWithoutChangesSummary"
import {
  DEFAULT_DIFF_TYPE_AND_CAUSE_PAIR,
  diffAdd,
  diffRemove,
  diffReplace,
  filterChangesList,
  getLayoutModeFlags,
  getLayoutSideFlags,
  inferRowChange,
  isDiffTypeIncluded,
  maxDiffType
} from '../../utils/common/changes'
import { isDefined } from '../../utils/common/checkers'
import { isSeriesItemEmpty, stringifyItem } from '../../utils/common/rows'
import { COLOR_SCHEMAS } from '../kit/ux/consts'
import { BADGE_KIND_DEFAULT } from '../kit/ux/types'
import { UxBadge } from '../kit/ux/UxBadge'
import { UxDiffFloatingBadge } from '../kit/ux/UxFloatingBadge/UxDiffFloatingBadge'
import { EmptyContent } from './diffs/EmptyContent'
import { UnsupportedContent } from './diffs/UnsupportedContent'
import { NestingIndicator } from './NestingIndicator'

export type AdditionalInfoArrayRowProps = PropsWithoutChangesSummary<
  PropsWithShift &
  {
    $changesKey: string
    title: string
    items: unknown[]
  } &
  PropsWithChanges
>

export const AdditionalInfoArrayRow: FC<AdditionalInfoArrayRowProps> = (props) => {
  const {
    shift = false,
    $changesKey,
    title,
    items,
    layoutMode = DEFAULT_LAYOUT_MODE,
    level = DEFAULT_ROW_DEPTH,
    $nodeChange,
    $changes,
  } = props

  const filters = useChangeSeverityFilters()

  const $rowChanges = $changes?.[$changesKey]
  const $inferredRowChange = inferRowChange(items.length, $rowChanges)

  const {
    isDocumentLayoutMode,
    isInlineDiffsLayoutMode,
    isSideBySideDiffsLayoutMode,
  } = getLayoutModeFlags(layoutMode)

  const isNodeChanged = !isDocumentLayoutMode && !!$nodeChange
  const isWholeRowChangedSynthetically = !isDocumentLayoutMode && !!$inferredRowChange
  const isWholeRowChangedNaturally = !isDocumentLayoutMode && !isWholeRowChangedSynthetically && isDiff($rowChanges)
  const isRowContentChanged = !isDocumentLayoutMode && isDiffMetaRecord($rowChanges) && !isWholeRowChangedSynthetically

  const { rowAdded, rowRemoved, rowReplaced } = {
    rowAdded:
      isNodeChanged && diffAdd($nodeChange) ||
      isWholeRowChangedNaturally && diffAdd($rowChanges) ||
      isWholeRowChangedSynthetically && diffAdd($inferredRowChange),
    rowRemoved:
      isNodeChanged && diffRemove($nodeChange) ||
      isWholeRowChangedNaturally && diffRemove($rowChanges) ||
      isWholeRowChangedSynthetically && diffRemove($inferredRowChange),
    rowReplaced:
      isWholeRowChangedNaturally && diffReplace($rowChanges) ||
      isWholeRowChangedSynthetically && diffReplace($inferredRowChange),
  }

  const rowContentChangesList = filterChangesList(
    isRowContentChanged ? Object.values($rowChanges).filter(isDiff) : [],
    filters
  )

  const [diffType, diffTypeCause] =
    isNodeChanged
      ? maxDiffType($nodeChange)
      : isWholeRowChangedNaturally
        ? maxDiffType($rowChanges)
        : isWholeRowChangedSynthetically
          ? maxDiffType($inferredRowChange)
          : isRowContentChanged
            ? maxDiffType(...rowContentChangesList)
            : DEFAULT_DIFF_TYPE_AND_CAUSE_PAIR
  const diffTypeIncluded = isDiffTypeIncluded(diffType, filters)

  const diffBackground =
    isNodeChanged || isWholeRowChangedNaturally || isWholeRowChangedSynthetically
      // FIXME 29.05.24
      // @ts-expect-error Temporarily incompatible types
      ? NODE_DIFF_COLOR_MAP[
        isNodeChanged
          ? $nodeChange.action
          : isWholeRowChangedNaturally
            ? $rowChanges.action
            : isWholeRowChangedSynthetically
              ? $inferredRowChange.action
              : 'test'
        ]
      : isRowContentChanged
        ? NODE_DIFF_COLOR_MAP[DiffAction.replace]
        : ''

  const Content: FC<ContentProps> = ({ layoutSide }) => {
    const width = isSideBySideDiffsLayoutMode ? 'w-1/2' : 'w-full'

    const { originSide, changedSide } = getLayoutSideFlags(layoutSide)

    return (
      <div className={`flex flex-row gap-5 ${shift ? SHIFTED_ROW_PADDING_LEFT : DEFAULT_ROW_PADDING_LEFT} ${width}`}>
        <NestingIndicator level={level}/>
        <div className="flex flex-row flex-wrap items-start gap-2 py-1">
          <div className="inline text-xs font-normal text-slate-500">
            {title}:
          </div>
          {items.map((item, index) => {
            const $itemChange = (isRowContentChanged
              ? $rowChanges[index]
              : isWholeRowChangedNaturally && rowReplaced
                ? $rowChanges
                : undefined)
            const $itemAction = $itemChange?.action

            const itemAdded = diffAdd($itemChange)
            const itemRemoved = diffRemove($itemChange)
            const itemReplaced = diffReplace($itemChange)

            const itemDefined = isDefined(item)
            const replacedItemDefined = itemReplaced && isDefined($itemChange.beforeValue)

            const diffTypeForItem = $itemChange?.type
            const diffTypeForItemIncluded = isDiffTypeIncluded(diffTypeForItem, filters)

            if (
              !itemDefined && !replacedItemDefined ||
              itemRemoved && changedSide ||
              itemAdded && originSide
            ) {
              return null
            }

            const handledItem =
              !itemDefined ? '' : stringifyItem(item)
            const handledReplacedItem =
              !replacedItemDefined ? '' : stringifyItem($itemChange.beforeValue)
            const isEmptyItem = isSeriesItemEmpty(handledItem, handledReplacedItem)

            let itemView: string | ReactNode = handledItem === ''
              ? <span className={DEFAULT_SERIES_ITEM_TEXT_COLOR}>{DEFAULT_SERIES_ITEM}</span>
              : handledItem

            if (isSideBySideDiffsLayoutMode) {
              if (itemRemoved) {
                if (originSide) {
                  const diffSchemaForContainer = isEmptyItem
                    ? DEFAULT_SERIES_ITEM_TEXT_COLOR
                    : DEFAULT_STRIKETHROUGH_VALUE_CLASS
                  itemView =
                    <div className={`inline ${diffTypeForItemIncluded ? diffSchemaForContainer : ''}`}>
                      {itemView}
                    </div>
                }
              }
              if (itemReplaced) {
                if (originSide) {
                  const diffSchemaForContainer = isEmptyItem
                    ? DEFAULT_SERIES_ITEM_TEXT_COLOR
                    : DEFAULT_STRIKETHROUGH_VALUE_CLASS
                  itemView =
                    <div className={`inline ${diffTypeForItemIncluded ? diffSchemaForContainer : ''}`}>
                      {handledReplacedItem || DEFAULT_SERIES_ITEM}
                    </div>
                }
              }
            }

            if (isInlineDiffsLayoutMode) {
              if (itemRemoved) {
                const diffSchemaForContainer = isEmptyItem
                  ? DEFAULT_SERIES_ITEM_TEXT_COLOR
                  : DEFAULT_STRIKETHROUGH_VALUE_CLASS
                itemView =
                  <div className={`inline ${diffTypeForItemIncluded ? diffSchemaForContainer : ''}`}>
                    {itemView}
                  </div>
              }
              if (itemReplaced) {
                const diffSchemaForContainerBefore =
                  `${DEFAULT_STRIKETHROUGH_VALUE_CLASS} ${isEmptyItem ? DEFAULT_SERIES_ITEM_TEXT_COLOR : ''}`
                itemView = <>
                  <div className={`inline mr-1 ${diffTypeForItemIncluded ? diffSchemaForContainerBefore : ''}`}>
                    {handledReplacedItem || DEFAULT_SERIES_ITEM}
                  </div>
                  {itemView}
                </>
              }
            }

            const diffColorSchemaForItem = [
              COLOR_SCHEMAS[BADGE_KIND_DEFAULT],
              diffTypeForItemIncluded && $itemAction ? BLOCK_CONTENT_DIFF_COLOR_MAP[$itemAction] : ''
            ].join(' ')

            return (
              <UxBadge
                key={`value-${index}`}
                text={itemView}
                colorSchema={diffColorSchemaForItem}
              />
            )
          })}
        </div>
      </div>
    )
  }

  if (isDocumentLayoutMode) {
    return (
      <div className="flex flex-row">
        <Content layoutSide={CHANGED_LAYOUT_SIDE}/>
      </div>
    )
  }

  if (isInlineDiffsLayoutMode) {
    if (!isNodeChanged && !isWholeRowChangedNaturally && !isWholeRowChangedSynthetically && !isRowContentChanged) {
      return (
        <div className="flex flex-row">
          <Content layoutSide={ORIGIN_LAYOUT_SIDE}/>
        </div>
      )
    }

    return (
      <div className={`flex flex-row relative ${diffTypeIncluded ? diffBackground : ''}`}>
        {diffType && diffTypeIncluded && <UxDiffFloatingBadge variant={diffType} message={diffTypeCause}/>}
        <Content layoutSide={ORIGIN_LAYOUT_SIDE}/>
      </div>
    )
  }

  if (isSideBySideDiffsLayoutMode) {
    if (!isNodeChanged && !isWholeRowChangedNaturally && !isWholeRowChangedSynthetically && !isRowContentChanged) {
      return (
        <div className="flex flex-row">
          <Content layoutSide={ORIGIN_LAYOUT_SIDE}/>
          <Content layoutSide={CHANGED_LAYOUT_SIDE}/>
        </div>
      )
    }

    return (
      <div className={`flex flex-row relative ${diffTypeIncluded ? diffBackground : ''}`}>
        {diffType && diffTypeIncluded && <UxDiffFloatingBadge variant={diffType} message={diffTypeCause}/>}
        {isRowContentChanged || (isNodeChanged || isWholeRowChangedNaturally || isWholeRowChangedSynthetically) && (rowRemoved || rowReplaced)
          ? <Content layoutSide={ORIGIN_LAYOUT_SIDE}/>
          : <EmptyContent level={$nodeChange?.depth ?? level}/>}
        {isRowContentChanged || (isNodeChanged || isWholeRowChangedNaturally || isWholeRowChangedSynthetically) && (rowAdded || rowReplaced)
          ? <Content layoutSide={CHANGED_LAYOUT_SIDE}/>
          : <EmptyContent level={$nodeChange?.depth ?? level}/>}
      </div>
    )
  }

  return <UnsupportedContent layoutMode={layoutMode}/>
}
