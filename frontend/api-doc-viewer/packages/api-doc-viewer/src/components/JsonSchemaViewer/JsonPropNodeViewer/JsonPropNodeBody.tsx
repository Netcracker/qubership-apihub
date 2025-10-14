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

import { DiffNodeMeta, DiffNodeValue } from '@netcracker/qubership-apihub-api-data-model'
import type { FC } from 'react'
import { useEffect, useState } from 'react'
import { isExpandableTreeNode } from '@netcracker/qubership-apihub-api-state-model'
import { buildNodeTitleData, buildNodeTypeData } from '../../../builders/nodes'
import { useLayoutMode } from '../../../contexts/LayoutModeContext'
import { useLevelContext } from '../../../contexts/LevelContext'
import { useIsDetailedDisplayMode } from '../../../types/guards/displayMode'
import { ExpandingMode } from '../../../types/internal/ExpandingMode'
import { PropsWithChanges } from '../../../types/internal/PropsWithChanges'
import {
  JsonPropNodePropsWithState,
  PropsWithDisabledNestingIndicatorTitle,
} from '../../../types/internal/PropsWithState'
import { PropsWithoutChangesSummary } from '../../../types/PropsWithoutChangesSummary'
import {
  hasNoContent,
  hasNoValidationsAndAnnotations,
  isExpandableStateNode,
  isRootNode
} from '../../../utils/nodes'
import { Annotations } from '../../common/annotations/Annotations'
import { HeaderRow } from '../internal/layout/HeaderRow'
import { Validations } from '../internal/validations/Validations'
import { isPropNodeState } from '../types/nodes.guards'

export type JsonPropNodeBodyProps = PropsWithoutChangesSummary<
  JsonPropNodePropsWithState &
  PropsWithDisabledNestingIndicatorTitle &
  {
    onToggleExpander: (mode?: ExpandingMode) => void
    onToggleSort: () => void
  } &
  PropsWithChanges
>

export const JsonPropNodeBody: FC<JsonPropNodeBodyProps> = (props) => {
  const {
    state,
    disableNestingHeader,
    onToggleExpander,
    onToggleSort,
    $nodeChange
  } = props
  const node = state.node
  const nodeDepth = useLevelContext()
  const nodeMeta = state.meta
  const $nodeMeta = nodeMeta as unknown as DiffNodeMeta
  const nodeValue = state.value
  const $nodeValue = nodeValue as DiffNodeValue

  const isDetailedDisplayMode = useIsDetailedDisplayMode()
  const layoutMode = useLayoutMode()

  const isExpandable = isExpandableStateNode(state)

  const [expanded, setExpanded] = useState<boolean>(false)
  const [sorted, setSorted] = useState<number>(0)

  useEffect(
    () => {
      const emptyStructure = state.children.filter(isPropNodeState).length === 0
      const alwaysExpanded = !isExpandableTreeNode(node) || state.expanded && emptyStructure
      alwaysExpanded && !node.isCycle
        ? setExpanded(true)
        : setExpanded(state.expanded)
      setSorted(state.sorted)
    },
    [node, node.isCycle, state, state.expanded, state.sorted]
  )

  const hasContent = !hasNoContent(node)
  const hasValidationsOrAnnotations = !hasNoValidationsAndAnnotations(node)

  // Common data
  const isRoot = isRootNode(node)

  return (
    <div className="flex flex-col">
      {!disableNestingHeader && (
        <HeaderRow
          nodeTitleData={buildNodeTitleData({ node, nodeValue, nodeMeta })}
          nodeTypeData={buildNodeTypeData({ node, nodeValue })}
          isCircularRef={node.isCycle}
          readOnly={nodeMeta?.readOnly}
          writeOnly={nodeMeta?.writeOnly}
          deprecated={nodeMeta?.deprecated}
          isExpandable={isExpandable}
          expanded={state.expanded}
          sorted={sorted}
          isRoot={isRoot}
          onToggleExpander={onToggleExpander}
          onToggleSort={onToggleSort}
          layoutMode={layoutMode}
          level={nodeDepth}
          $changes={$nodeValue?.$changes}
          $metaChanges={$nodeMeta?.$metaChanges}
          $nodeChange={$nodeChange ?? $nodeMeta?.$nodeChange}
          $nodeChangesSummary={$nodeMeta?.$nodeChangesSummary}
        />
      )}

      {/* Content */}
      {isDetailedDisplayMode && expanded && hasContent && (
        <div data-name="Body" className="flex flex-col grow">
          {hasValidationsOrAnnotations && (
            <div data-name="Content" className="flex flex-col">
              {/* TODO 01.11.23 // "shift" is a WA, find way better */}
              <Annotations
                shift={isExpandable && isRoot}
                state={state}
                $nodeChange={$nodeChange}
              />
              <Validations
                shift={isExpandable && isRoot}
                state={state}
                $nodeChange={$nodeChange}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
