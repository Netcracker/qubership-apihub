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

import { DiffNodeMeta, DiffNodeValue, isDiff } from '@netcracker/qubership-apihub-api-data-model'
import { Diff, DiffAction } from '@netcracker/qubership-apihub-api-diff'
import type { FC, PropsWithChildren } from 'react'
import { NODE_DIFF_COLOR_MAP } from '../../../../../consts/changes'
import { DEFAULT_ROW_PADDING_LEFT, SHIFTED_ROW_PADDING_LEFT } from '../../../../../consts/configuration'
import { useChangeSeverityFilters } from '../../../../../contexts/ChangeSeverityFiltersContext'
import { ContentProps } from '../../../../../types/internal/ContentProps'
import { CHANGED_LAYOUT_SIDE, ORIGIN_LAYOUT_SIDE } from '../../../../../types/internal/LayoutSide'
import { PropsWithShift } from '../../../../../types/internal/PropsWithShift'
import { LayoutMode } from '../../../../../types/LayoutMode'
import { NodeTypeData } from '../../../../../types/NodeTypeData'
import {
  diffReplace,
  filterChangesList,
  getLayoutModeFlags,
  getLayoutSideFlags,
  isDiffTypeIncluded,
  maxDiffType
} from '../../../../../utils/common/changes'
import { isDefined } from '../../../../../utils/common/checkers'
import { EmptyContent } from '../../../../common/diffs/EmptyContent'
import { UnsupportedContent } from '../../../../common/diffs/UnsupportedContent'
import { NestingIndicator } from '../../../../common/NestingIndicator'
import { NodeTypeProps } from '../../../../common/NodeType'
import { UxDiffFloatingBadge } from '../../../../kit/ux/UxFloatingBadge/UxDiffFloatingBadge'

export type NestingIndicatorTitleRowProps = PropsWithShift & {
  layoutMode: LayoutMode
  depth: number
  // diffs
  NodeType: FC<NodeTypeProps>
  nodeTypeData: NodeTypeData
  $nodeChange: DiffNodeMeta['$nodeChange']
  $changes: DiffNodeValue['$changes']
}

const CONTENT_CHANGES_COLORIZING = false
const CONTENT_CHANGES_STRIKETHROUGH = false

export const NestingIndicatorTitleRow: FC<NestingIndicatorTitleRowProps> = (props) => {
  const {
    shift = false,
    layoutMode,
    depth,
    NodeType,
    nodeTypeData,
    $nodeChange,
    $changes
  } = props

  const filters = useChangeSeverityFilters()

  const {
    isDocumentLayoutMode,
    isSideBySideDiffsLayoutMode,
    isInlineDiffsLayoutMode
  } = getLayoutModeFlags(layoutMode)

  const { nodeAdded, nodeRemoved, nodeRenamed } = {
    nodeAdded: $nodeChange?.action === DiffAction.add,
    nodeRemoved: $nodeChange?.action === DiffAction.remove,
    nodeRenamed: $nodeChange?.action === DiffAction.rename
  }

  const beforeOrAfterTypeComplex = isBeforeOrAfterTypeComplex(nodeTypeData, $changes)
  const beforeAndAfterTypesComplex = isBeforeAndAfterTypesComplex(nodeTypeData, $changes)

  const isNodeChanged = !isDocumentLayoutMode && !!$nodeChange
  const isContentChanged = !!($changes?.type || $changes?.title || $changes?.format) && beforeOrAfterTypeComplex

  const rowContentChangesList = filterChangesList(
    getTypeChangesList($nodeChange, $changes),
    filters
  )
  const [diffType, diffTypeCause] = maxDiffType(...rowContentChangesList)
  const diffTypeIncluded = isDiffTypeIncluded(diffType, filters)
  const diffBackground =
    isNodeChanged
      ? NODE_DIFF_COLOR_MAP[$nodeChange?.action]
      : isContentChanged
        ? NODE_DIFF_COLOR_MAP[DiffAction.replace]
        : ''

  if (isDocumentLayoutMode) {
    const layoutSide = CHANGED_LAYOUT_SIDE
    return (
      <Content
        shift={shift}
        layoutSide={layoutSide}
        layoutMode={layoutMode}
        level={depth}
      >
        <NodeType
          {...nodeTypeData}
          layoutMode={layoutMode}
          layoutSide={layoutSide}
          contentChangesColorizing={CONTENT_CHANGES_COLORIZING}
          contentChangesStrikethrough={CONTENT_CHANGES_STRIKETHROUGH}
          $changes={$changes}
        />
      </Content>
    )
  }

  if (isInlineDiffsLayoutMode) {
    const layoutSide = CHANGED_LAYOUT_SIDE
    return (
      <div className={`flex flex-row relative ${diffTypeIncluded ? diffBackground : ''}`}>
        {diffType && diffTypeIncluded && (isNodeChanged || isContentChanged) && (
          <UxDiffFloatingBadge variant={diffType} message={diffTypeCause}/>
        )}
        <Content
          shift={shift}
          layoutSide={layoutSide}
          layoutMode={layoutMode}
          level={depth}
        >
          <NodeType
            {...nodeTypeData}
            layoutMode={layoutMode}
            layoutSide={layoutSide}
            contentChangesColorizing={CONTENT_CHANGES_COLORIZING}
            contentChangesStrikethrough={CONTENT_CHANGES_STRIKETHROUGH}
            $changes={isContentChanged ? $changes : undefined}
          />
        </Content>
      </div>
    )
  }

  if (isSideBySideDiffsLayoutMode) {
    if (!isNodeChanged || nodeRenamed && !isContentChanged) {
      return (
        <div className="flex flex-row relative">
          <Content
            shift={shift}
            layoutSide={ORIGIN_LAYOUT_SIDE}
            layoutMode={layoutMode}
            level={depth}
          >
            <NodeType
              {...nodeTypeData}
              layoutMode={layoutMode}
              layoutSide={ORIGIN_LAYOUT_SIDE}
            />
          </Content>
          <Content
            shift={shift}
            layoutSide={CHANGED_LAYOUT_SIDE}
            layoutMode={layoutMode}
            level={depth}
          >
            <NodeType
              {...nodeTypeData}
              layoutMode={layoutMode}
              layoutSide={CHANGED_LAYOUT_SIDE}
            />
          </Content>
        </div>
      )
    }

    return (
      <div className={`flex flex-row relative ${diffTypeIncluded ? diffBackground : ''}`}>
        {diffType && diffTypeIncluded && (isNodeChanged || isContentChanged) && (
          <UxDiffFloatingBadge variant={diffType} message={diffTypeCause}/>
        )}
        {isContentChanged && beforeAndAfterTypesComplex || isNodeChanged && nodeRemoved
          ? (
            <Content
              shift={shift}
              layoutSide={ORIGIN_LAYOUT_SIDE}
              layoutMode={layoutMode}
              level={depth}
            >
              <NodeType
                {...nodeTypeData}
                layoutMode={layoutMode}
                layoutSide={ORIGIN_LAYOUT_SIDE}
                contentChangesColorizing={CONTENT_CHANGES_COLORIZING}
                contentChangesStrikethrough={CONTENT_CHANGES_STRIKETHROUGH}
                $changes={isContentChanged ? $changes : undefined}
              />
            </Content>
          )
          : <EmptyContent level={$nodeChange?.depth ?? depth}/>}
        {isContentChanged && beforeAndAfterTypesComplex || isNodeChanged && nodeAdded
          ? (
            <Content
              shift={shift}
              layoutSide={CHANGED_LAYOUT_SIDE}
              layoutMode={layoutMode}
              level={depth}
            >
              <NodeType
                {...nodeTypeData}
                layoutMode={layoutMode}
                layoutSide={CHANGED_LAYOUT_SIDE}
                contentChangesColorizing={CONTENT_CHANGES_COLORIZING}
                contentChangesStrikethrough={CONTENT_CHANGES_STRIKETHROUGH}
                $changes={isContentChanged ? $changes : undefined}
              />
            </Content>
          )
          : <EmptyContent level={$nodeChange?.depth ?? depth}/>}
      </div>
    )
  }

  return <UnsupportedContent layoutMode={layoutMode}/>
}

type NestingIndicatorTitleRowContentProps = PropsWithShift & ContentProps & {
  layoutMode: LayoutMode
  level: number
} & PropsWithChildren

const Content: FC<NestingIndicatorTitleRowContentProps> = (props) => {
  const {
    shift,
    layoutSide,
    layoutMode,
    level,
    children
  } = props

  const { isSideBySideDiffsLayoutMode } = getLayoutModeFlags(layoutMode)
  // eslint-disable-next-line
  const { originSide, changedSide } = getLayoutSideFlags(layoutSide)

  const width = isSideBySideDiffsLayoutMode ? 'w-1/2' : 'w-full'

  return (
    <div className={`flex flex-row ${shift ? SHIFTED_ROW_PADDING_LEFT : DEFAULT_ROW_PADDING_LEFT} ${width}`}>
      <NestingIndicator level={level} lastInvisible={true}/>
      <div className="text-xs text-slate-400 border-b border-slate-400 w-max pt-1"
           style={{ marginLeft: '-1px' }}
      >
        {children}
      </div>
    </div>
  )
}

const COMPLEX_TYPES = ['object', 'array', 'arguments']

function isBeforeOrAfterTypeComplex(
  nodeTypeData: NodeTypeData,
  $changes: DiffNodeValue['$changes']
): boolean {
  if ($changes?.type) {
    const typeChange = $changes.type
    const isTypeReplaced = isDiff(typeChange) && diffReplace(typeChange)
    return isTypeReplaced && (
      COMPLEX_TYPES.some(complexType => typeChange.beforeValue === complexType) ||
      COMPLEX_TYPES.some(complexType => typeChange.afterValue === complexType)
    )
  }
  return isTypeComplex(nodeTypeData)
}

function isBeforeAndAfterTypesComplex(
  nodeTypeData: NodeTypeData,
  $changes: DiffNodeValue['$changes']
): boolean {
  if ($changes?.type) {
    const typeChange = $changes.type
    const isTypeReplaced = isDiff(typeChange) && diffReplace(typeChange)
    return isTypeReplaced && (
      COMPLEX_TYPES.some(complexType => typeChange.beforeValue === complexType) &&
      COMPLEX_TYPES.some(complexType => typeChange.afterValue === complexType)
    )
  }
  return isTypeComplex(nodeTypeData)
}

function isTypeComplex(nodeTypeData: NodeTypeData) {
  return (
    isDefined(nodeTypeData.type) &&
    COMPLEX_TYPES.some(complexType => nodeTypeData.type === complexType)
  )
}

function getTypeChangesList(
  $nodeChange: DiffNodeMeta['$nodeChange'],
  $changes: DiffNodeValue['$changes'],
): Diff[] {
  const list: Diff[] = []

  if ($changes) {
    for (const [key, value] of Object.entries($changes)) {
      if (isDiff(value) && (key === 'type' || key === 'format' || key === 'title')) {
        list.push(value)
      }
    }
  }

  if (isDiff($nodeChange)) {
    list.push($nodeChange)
  }

  return list
}