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

import { DiffRecord, isDiff } from '@netcracker/qubership-apihub-api-data-model'
import {
  ActionType,
  breaking,
  Diff,
  DiffAction,
  DiffAdd,
  DiffMetaRecord,
  DiffRemove,
  DiffReplace,
  DiffType
} from '@netcracker/qubership-apihub-api-diff'
import { JsonPath } from '@netcracker/qubership-apihub-json-crawl'
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
import { PropsWithoutChangesSummary } from '../../types/PropsWithoutChangesSummary'
import { ArrayUtils } from '../../utils/common/arrays'
import {
  compareDiffTypes,
  DEFAULT_DIFF_TYPE_AND_CAUSE_PAIR,
  diffAdd,
  diffRemove,
  diffReplace,
  getLayoutModeFlags,
  getLayoutSideFlags,
  hasAfterDeclarationPaths,
  hasBeforeDeclarationPaths,
  isDiffTypeIncluded,
  maxDiffType
} from '../../utils/common/changes'
import { isDefined } from '../../utils/common/checkers'
import { handleSeriesItem, isSeriesItemEmpty, stringifyItem } from '../../utils/common/rows'
import { COLOR_SCHEMAS } from '../kit/ux/consts'
import { BADGE_KIND_DEFAULT } from '../kit/ux/types'
import { UxBadge } from '../kit/ux/UxBadge'
import { UxDiffFloatingBadge } from '../kit/ux/UxFloatingBadge/UxDiffFloatingBadge'
import { EmptyContent } from './diffs/EmptyContent'
import { UnsupportedContent } from './diffs/UnsupportedContent'
import { NestingIndicator } from './NestingIndicator'

export type AdditionalInfoObjectRowProps = PropsWithoutChangesSummary<
  PropsWithShift &
  {
    title: string
    items: Record<string | number, unknown>
    $changesKeys: string[]
  } &
  PropsWithChanges
>

export const AdditionalInfoObjectRow: FC<AdditionalInfoObjectRowProps> = (props) => {
  const {
    shift = false,
    title,
    items,
    layoutMode = DEFAULT_LAYOUT_MODE,
    level = DEFAULT_ROW_DEPTH,
    $changesKeys,
    $nodeChange,
    $changes,
  } = props

  const filters = useChangeSeverityFilters()

  const $rowChanges = getRowChanges($changes, $changesKeys)

  const {
    isDocumentLayoutMode,
    isInlineDiffsLayoutMode,
    isSideBySideDiffsLayoutMode,
  } = getLayoutModeFlags(layoutMode)

  const isNodeChanged = !isDocumentLayoutMode && !!$nodeChange
  const isRowChanged = !isDocumentLayoutMode && checkRowChanged($changes, $changesKeys) && isDiff($rowChanges)

  const { nodeAdded, nodeRemoved, nodeReplaced } = {
    nodeAdded: isNodeChanged && $nodeChange.action === DiffAction.add || isRowChanged && $rowChanges.action === DiffAction.add,
    nodeRemoved: isNodeChanged && $nodeChange.action === DiffAction.remove || isRowChanged && $rowChanges.action === DiffAction.remove,
    nodeReplaced: isRowChanged && $rowChanges.action === DiffAction.replace,
  }

  const [diffType, diffTypeCause] =
    isNodeChanged
      ? maxDiffType($nodeChange)
      : isRowChanged
        ? maxDiffType($rowChanges)
        : DEFAULT_DIFF_TYPE_AND_CAUSE_PAIR
  const diffTypeIncluded = isDiffTypeIncluded(diffType, filters)

  const diffBackground =
    isNodeChanged
      ? NODE_DIFF_COLOR_MAP[$nodeChange.action]
      : isRowChanged
        ? NODE_DIFF_COLOR_MAP[$rowChanges.action]
        : NODE_DIFF_COLOR_MAP[DiffAction.replace]

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
          {Object.entries(items).map(([itemKey, item], index) => {
            const $itemChange = isRowChanged && diffReplace($rowChanges)
              ? $changes?.[itemKey]
              : undefined

            const itemSingleDiff = isDiff($itemChange)
            const itemAdded = itemSingleDiff && diffAdd($itemChange)
            const itemRemoved = itemSingleDiff && diffRemove($itemChange)
            const itemReplaced = itemSingleDiff && diffReplace($itemChange)

            const itemDefined = isDefined(item)
            const replacedItemDefined = itemReplaced && isDefined($itemChange.beforeValue)

            const diffActionForItem = itemSingleDiff ? $itemChange.action : undefined
            const diffTypeForItem = itemSingleDiff ? $itemChange.type : undefined
            const diffTypeForItemIncluded = isDiffTypeIncluded(diffTypeForItem, filters)

            if (
              !itemDefined && !replacedItemDefined ||
              itemRemoved && changedSide ||
              itemAdded && originSide
            ) {
              return null
            }

            const handledItem =
              !itemDefined ? '' : stringifyItem(handleSeriesItem(itemKey, item))
            const handledReplacedItem =
              !replacedItemDefined ? '' : stringifyItem(handleSeriesItem(itemKey, $itemChange.beforeValue))
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
                const diffSchemaForContainer =
                  `${DEFAULT_STRIKETHROUGH_VALUE_CLASS} ${isEmptyItem ? DEFAULT_SERIES_ITEM_TEXT_COLOR : ''}`
                itemView = <>
                  <div className={`inline mr-1 ${diffTypeForItemIncluded ? diffSchemaForContainer : ''}`}>
                    {handledReplacedItem || DEFAULT_SERIES_ITEM}
                  </div>
                  {itemView}
                </>
              }
            }

            const diffColorSchemaForItem = [
              COLOR_SCHEMAS[BADGE_KIND_DEFAULT],
              diffTypeForItemIncluded && diffActionForItem ? BLOCK_CONTENT_DIFF_COLOR_MAP[diffActionForItem] : ''
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
    if (!isNodeChanged && !isRowChanged) {
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
    if (!isNodeChanged && !isRowChanged) {
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
        {(isNodeChanged || isRowChanged) && (nodeRemoved || nodeReplaced)
          ? <Content layoutSide={ORIGIN_LAYOUT_SIDE}/>
          : <EmptyContent level={$nodeChange?.depth ?? level}/>}
        {(isNodeChanged || isRowChanged) && (nodeAdded || nodeReplaced)
          ? <Content layoutSide={CHANGED_LAYOUT_SIDE}/>
          : <EmptyContent level={$nodeChange?.depth ?? level}/>}
      </div>
    )
  }

  return <UnsupportedContent layoutMode={layoutMode}/>
}

function checkRowChanged($changes: DiffRecord | undefined, $keys: string[]): boolean {
  if (!$changes) {
    return false
  }

  return Object.keys($changes).some($key => $keys.includes($key))
}

// TODO 02.11.23 // Can we get rid of this WA?
// FIXME 22.11.23 // Or maybe at least move it into view model to apply filters correctly?
function getRowChanges($changes: Partial<DiffRecord> | undefined, $keys: string[]): Diff | DiffMetaRecord | undefined {
  if (!$changes || ArrayUtils.isEmpty($keys)) {
    return undefined
  }

  const filteredChanges =
    Object
      .entries($changes)
      .reduce((result, [k, v]) => {
        isDiff(v) && (result[k] = v)
        return result
      }, {} as Partial<Record<string, Diff>>)

  if (ArrayUtils.isEmpty(Object.keys(filteredChanges))) {
    return undefined
  }

  let diffType: DiffType | undefined = undefined
  let diffAction: ActionType | undefined = undefined

  const initialPaths = {
    beforeDeclarationPaths: [] as JsonPath[],
    afterDeclarationPaths: [] as JsonPath[],
  }

  const paths: Partial<Record<DiffType, { beforeDeclarationPaths: JsonPath[], afterDeclarationPaths: JsonPath[] }>> = {}

  for (const $key of $keys) {
    const currentChange = filteredChanges[$key]
    const currentDiffType = currentChange?.type ?? breaking
    if (compareDiffTypes(currentDiffType, diffType) > 0) {
      diffType = currentDiffType
    }
    paths[currentDiffType] ??= initialPaths
    if (!currentChange) {
      diffAction = DiffAction.replace
    }
    if (diffAdd(currentChange) && !diffAction) {
      diffAction = DiffAction.add
    }
    if (diffRemove(currentChange) && !diffAction) {
      diffAction = DiffAction.remove
    }
    if (diffReplace(currentChange) && !diffAction) {
      diffAction = DiffAction.replace
    }
    if (currentChange) {
      if (hasBeforeDeclarationPaths(currentChange)) {
        paths[currentDiffType]?.beforeDeclarationPaths.push(...(currentChange?.beforeDeclarationPaths ?? []))
      }
      if (hasAfterDeclarationPaths(currentChange)) {
        paths[currentDiffType]?.afterDeclarationPaths.push(...(currentChange?.afterDeclarationPaths ?? []))
      }
    }
  }

  if (!diffType || !diffAction) {
    return undefined
  }

  const diffFragment = {
    type: diffType,
    action: diffAction,
    beforeDeclarationPaths: paths[diffType]?.beforeDeclarationPaths ?? [],
    afterDeclarationPaths: paths[diffType]?.afterDeclarationPaths ?? []
  }

  // TODO 11.09.24 // Check is is possible to provide not mocked values?

  if (diffAction === DiffAction.add) {
    return {
      ...diffFragment,
      path: [],
      afterValue: null,
      afterNormalizedValue: null,
      scope: '',
    } as DiffAdd
  }

  if (diffAction === DiffAction.remove) {
    return {
      ...diffFragment,
      path: [],
      beforeValue: null,
      beforeNormalizedValue: null,
      scope: '',
    } as DiffRemove
  }

  return {
    ...diffFragment,
    path: [],
    beforeValue: null,
    beforeNormalizedValue: null,
    afterValue: null,
    afterNormalizedValue: null,
    scope: '',
  } as DiffReplace
}
