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

import { isDiff, isObject } from '@netcracker/qubership-apihub-api-data-model'
import { DiffAction, DiffType } from '@netcracker/qubership-apihub-api-diff'
import type { FC } from 'react'
import { useCallback, useState } from 'react'
import { NODE_DIFF_COLOR_MAP } from '../../../../consts/changes'
import { DEFAULT_LAYOUT_MODE, DEFAULT_ROW_PADDING_LEFT } from '../../../../consts/configuration'
import {
  COLLAPSE_ALL_MENU_ITEM,
  EXPAND_ALL_MENU_ITEM,
  SORT_ASC_MENU_ITEM,
  SORT_ORIGINAL_MENU_ITEM,
} from '../../../../consts/menuItems'
import { CIRCULAR_REF_TOOLTIP } from '../../../../consts/tooltips'
import { useChangeSeverityFilters } from '../../../../contexts/ChangeSeverityFiltersContext'
import { useNoSubHeaderSide } from '../../../../contexts/NoSubHeaderContext'
import { useTopLevelPropsMediaTypes } from '../../../../contexts/TopLevelPropsMediaTypesContext'
import { NodeTitleData } from '../../../../types/NodeTitleData'
import { NodeTypeData } from '../../../../types/NodeTypeData'
import { ContentProps } from '../../../../types/internal/ContentProps'
import { CHANGED_LAYOUT_SIDE, ORIGIN_LAYOUT_SIDE } from '../../../../types/internal/LayoutSide'
import { PropsWithChanges } from '../../../../types/internal/PropsWithChanges'
import { ArrayUtils } from '../../../../utils/common/arrays'
import {
  API_TYPE_REST,
  DEFAULT_DIFF_TYPE_AND_CAUSE_PAIR,
  filterChangesList,
  getDiffTypesFromSummary,
  getLayoutModeFlags,
  isDiffTypeIncluded,
  maxDiffType,
  toChangesList
} from '../../../../utils/common/changes'
import { defaultOnContextMenu } from '../../../../utils/common/event-handlers'
import { NestingIndicator } from '../../../common/NestingIndicator'
import { NodeTitle } from '../../../common/NodeTitle'
import { NodeType } from '../../../common/NodeType'
import { DiffBadge } from '../../../common/diffs/DiffBadge'
import { DiffTags } from '../../../common/diffs/DiffTags'
import { EmptyContent } from '../../../common/diffs/EmptyContent'
import { UnsupportedContent } from '../../../common/diffs/UnsupportedContent'
import { Expander } from '../../../common/layout/Expander/Expander'
import { CircularRefIcon } from '../../../kit/icons/CircularRefIcon'
import { UxContextMenu } from '../../../kit/ux/UxContextMenu/UxContextMenu'
import { ToggleContextMenuHandlerOptions } from '../../../kit/ux/UxContextMenu/types/ToggleContextMenuHandler'
import { UxDiffFloatingBadge } from '../../../kit/ux/UxFloatingBadge/UxDiffFloatingBadge'
import { UxMarkerPanel } from '../../../kit/ux/UxMarkerPanel/UxMarkerPanel'
import { UxTooltip } from '../../../kit/ux/UxTooltip/UxTooltip'
import { COLOR_SCHEMAS } from '../../../kit/ux/consts'
import { BADGE_KIND_DEFAULT_OUTLINE } from '../../../kit/ux/types'

export type HeaderRowState = {
  isExpandable?: boolean
  expanded: boolean
  sorted: number
  isRoot: boolean
  onToggleExpander: () => void
  onToggleSort: () => void
}

export type HeaderRowProps = {
  nodeTitleData: NodeTitleData
  nodeTypeData: NodeTypeData | null
  isCircularRef: boolean
  readOnly?: boolean
  writeOnly?: boolean
  deprecated?: boolean
} & HeaderRowState & PropsWithChanges

const TRACKED_KEYS_VALUES_CHANGES: string[] = ['type', 'nullable', 'title', 'format']
const TRACKED_KEYS_META_CHANGES: string[] = ['required', 'readOnly', 'writeOnly', 'deprecated']

export const HeaderRow: FC<HeaderRowProps> = (props) => {
  const {
    nodeTitleData,
    nodeTypeData,
    isCircularRef,
    readOnly,
    writeOnly,
    deprecated,
    isExpandable,
    expanded,
    sorted,
    isRoot,
    onToggleExpander,
    onToggleSort,
    layoutMode = DEFAULT_LAYOUT_MODE,
    level = 0,
    $changes,
    $metaChanges,
    $nodeChange,
    // $nodeChangesSummary,
  } = props

  const isNodeChanged = !!$nodeChange

  const filters = useChangeSeverityFilters()

  const propsMediaTypes = useTopLevelPropsMediaTypes()
  const propMediaType =
    isObject(propsMediaTypes) && nodeTitleData?.title && propsMediaTypes[nodeTitleData.title]
      ? propsMediaTypes[nodeTitleData.title]
      : undefined

  const diffTypesFromNodeChangesSummary = getDiffTypesFromSummary(!isNodeChanged ? /* $nodeChangesSummary */undefined : undefined)
  const diffTypesFromNodeChangesSummaryFilter = useCallback((key: DiffType) => filters.length === 0 || filters.includes(key), [filters])

  const { isDocumentLayoutMode, isInlineDiffsLayoutMode, isSideBySideDiffsLayoutMode } = getLayoutModeFlags(layoutMode)

  const isContentChanged =
    !!$changes && TRACKED_KEYS_VALUES_CHANGES.some(key => isDiff($changes[key])) ||
    !!$metaChanges && TRACKED_KEYS_META_CHANGES.some(key => isDiff($metaChanges[key]))

  // TODO 26.10.23 // Move to generalize hook with memoization because this is really frequent calculations
  const { nodeAdded, nodeRemoved, nodeReplaced, nodeRenamed } = {
    nodeAdded: isNodeChanged && $nodeChange.action === DiffAction.add,
    nodeRemoved: isNodeChanged && $nodeChange.action === DiffAction.remove,
    nodeReplaced: isNodeChanged && $nodeChange.action === DiffAction.replace,
    nodeRenamed: isNodeChanged && $nodeChange.action === DiffAction.rename,
  }

  const rowContentChangesList = filterChangesList(toChangesList($changes, $metaChanges, API_TYPE_REST), filters)
  const [diffType, diffTypeCause] =
    isNodeChanged
      ? maxDiffType($nodeChange)
      : isContentChanged
        ? maxDiffType(...rowContentChangesList)
        : DEFAULT_DIFF_TYPE_AND_CAUSE_PAIR
  const diffTypeIncluded = isDiffTypeIncluded(diffType, filters)

  const diffBackground =
    isNodeChanged
      ? NODE_DIFF_COLOR_MAP[$nodeChange?.action]
      : isContentChanged
        ? NODE_DIFF_COLOR_MAP[DiffAction.replace]
        : ''

  const Content: FC<ContentProps> = ({ layoutSide }) => {
    const [contextMenuOpen, setContextMenuOpen] = useState<boolean>(false)
    const contextMenuItems = [
      {
        label: expanded ? COLLAPSE_ALL_MENU_ITEM : EXPAND_ALL_MENU_ITEM,
        onClick: onToggleExpander
      },
      {
        label: sorted ? SORT_ORIGINAL_MENU_ITEM : SORT_ASC_MENU_ITEM,
        onClick: onToggleSort
      }
    ]
    // TODO 26.10.23 // Simplify when deprecated components are removed
    const onToggleContextMenu = (options: ToggleContextMenuHandlerOptions) => setContextMenuOpen(options.open)

    // Changes
    const width = isSideBySideDiffsLayoutMode ? 'w-1/2' : 'w-full'
    const requiredChanged = !isDocumentLayoutMode && !isNodeChanged && isContentChanged && !!$metaChanges?.required
    // ---

    const noSubHeaderSide = useNoSubHeaderSide()
    const noSubHeader = noSubHeaderSide && noSubHeaderSide === layoutSide

    const SubHeader: FC = () => <>
      {nodeTypeData && (
        <div className="text-xs font-normal text-slate-500">
          <NodeType
            {...nodeTypeData}
            showNullable={true}
            layoutMode={layoutMode}
            layoutSide={layoutSide}
            $changes={$changes}
          />
        </div>
      )}
      {(
        ArrayUtils.isNotEmpty(diffTypesFromNodeChangesSummary) &&
        !isDocumentLayoutMode &&
        isExpandable && !expanded
      ) && (
          <div className="text-xs font-normal text-slate-500">
            <UxMarkerPanel
              values={diffTypesFromNodeChangesSummary}
              filter={diffTypesFromNodeChangesSummaryFilter}
            />
          </div>
        )}
      {isCircularRef && (
        <UxTooltip text={CIRCULAR_REF_TOOLTIP}>
          <CircularRefIcon />
        </UxTooltip>
      )}
      <DiffTags
        requiredChanged={requiredChanged}
        readOnly={readOnly}
        writeOnly={writeOnly}
        deprecated={deprecated}
        layoutSide={layoutSide}
        isNodeChanged={isNodeChanged}
        isContentChanged={isContentChanged}
        $nodeChange={$nodeChange}
        $metaChanges={$metaChanges}
      />
      {propMediaType && (
        <DiffBadge
          label={propMediaType}
          colorSchema={COLOR_SCHEMAS[BADGE_KIND_DEFAULT_OUTLINE]}
          layoutMode={layoutMode}
          layoutSide={layoutSide}
          isNodeChanged={false}
          isContentChanged={false}
        />
      )}
    </>

    return (
      <div className={`flex flex-col ${DEFAULT_ROW_PADDING_LEFT} ${width}`}>
        <div className="flex flex-row relative">
          <NestingIndicator level={level} />
          <Expander
            isRoot={isRoot}
            isExpandable={isExpandable}
            expanded={expanded}
            onToggleExpander={onToggleExpander}
            onToggleContextMenu={onToggleContextMenu}
          />
          <div className="flex flex-row items-center gap-2 pt-2 pb-1">
            <div
              className={`text-xs text-black font-Inter-Medium ${isExpandable ? 'hover:cursor-pointer' : ''}`}
              onClick={isExpandable ? onToggleExpander : undefined}
              onContextMenu={defaultOnContextMenu(isExpandable, onToggleContextMenu)}
            >
              <NodeTitle
                {...nodeTitleData}
                showRequired={true} // to BWC with GraphQL
                // diffs
                layoutMode={layoutMode}
                layoutSide={layoutSide}
                requiredChange={$metaChanges?.required}
                titleChange={$nodeChange}
              />
            </div>
            {!noSubHeader && <SubHeader />}
            <UxContextMenu
              visible={contextMenuOpen}
              onClickAway={() => onToggleContextMenu({ open: false })}
              menuItems={contextMenuItems}
            />
          </div>
        </div>
      </div>
    )
  }

  if (isDocumentLayoutMode) {
    return (
      <div className="flex flex-row">
        <Content {...props} layoutSide={CHANGED_LAYOUT_SIDE} />
      </div>
    )
  }

  if (isInlineDiffsLayoutMode) {
    if (!isNodeChanged && !isContentChanged) {
      return (
        <div className="flex flex-row">
          <Content {...props} layoutSide={ORIGIN_LAYOUT_SIDE} />
        </div>
      )
    }

    return (
      <div className={`flex flex-row relative ${diffTypeIncluded ? diffBackground : ''}`}>
        {diffType && diffTypeIncluded && <UxDiffFloatingBadge variant={diffType} message={diffTypeCause} />}
        <Content {...props} layoutSide={ORIGIN_LAYOUT_SIDE} />
      </div>
    )
  }

  if (isSideBySideDiffsLayoutMode) {
    if (!isNodeChanged && !isContentChanged) {
      return (
        <div className="flex flex-row">
          <Content {...props} layoutSide={ORIGIN_LAYOUT_SIDE} />
          <Content {...props} layoutSide={CHANGED_LAYOUT_SIDE} />
        </div>
      )
    }

    return (
      <div className={`flex flex-row relative ${diffTypeIncluded ? diffBackground : ''}`}>
        {diffType && diffTypeIncluded && <UxDiffFloatingBadge variant={diffType} message={diffTypeCause} />}
        {!isNodeChanged && isContentChanged || isNodeChanged && (nodeRemoved || nodeReplaced || nodeRenamed)
          ? <Content {...props} layoutSide={ORIGIN_LAYOUT_SIDE} />
          : <EmptyContent level={$nodeChange?.depth ?? level} />}
        {!isNodeChanged && isContentChanged || isNodeChanged && (nodeAdded || nodeRenamed || nodeReplaced)
          ? <Content {...props} layoutSide={CHANGED_LAYOUT_SIDE} />
          : <EmptyContent level={$nodeChange?.depth ?? level} />}
      </div>
    )
  }

  return <UnsupportedContent layoutMode={layoutMode} />
}
