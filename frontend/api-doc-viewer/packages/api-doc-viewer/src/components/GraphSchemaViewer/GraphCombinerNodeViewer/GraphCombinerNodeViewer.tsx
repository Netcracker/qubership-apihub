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

import type { FC } from 'react'
import { useMemo, useState } from 'react'
import { DiffNodeMeta } from '@netcracker/qubership-apihub-api-data-model'
import { isCombinerItemNode } from '../../../utils/nodes'
import { GraphCombinerNodePropsWithState } from '../../../types/internal/PropsWithState'
import { PropsWithChanges } from '../../../types/internal/PropsWithChanges'
import { useLayoutMode } from '../../../contexts/LayoutModeContext'
import { NodeTypeData } from '../../../types/NodeTypeData'
import { buildNodeTypeData } from '../../../builders/nodes'
import { SelectNestedNodeRow } from '../../common/SelectNestedNodeRow'
import { DOCUMENT_LAYOUT_MODE } from '../../../types/LayoutMode'
import { useLevelContext } from '../../../contexts/LevelContext'
import { ArrayUtils } from '../../../utils/common/arrays'
import { PropsWithoutChangesSummary } from '../../../types/PropsWithoutChangesSummary'
import { useSetNoSubHeaderSide } from '../../../contexts/NoSubHeaderContext'

export type GraphCombinerNodeViewerProps = PropsWithoutChangesSummary<
  GraphCombinerNodePropsWithState &
  { onGlobalSelectNestedNode: (nodeId: string) => void } &
  PropsWithChanges
>

// TODO 16.11.23 // De-duplicate!
export const GraphCombinerNodeViewer: FC<GraphCombinerNodeViewerProps> = (props) => {
  const {
    state,
    onGlobalSelectNestedNode,
    $nodeChange,
  } = props

  const setNoSubHeaderSide = useSetNoSubHeaderSide()

  const nested = state.nested
  const [selectedNodeId, setSelectedNodeId] = useState(state.selected)
  const onSelect = (nodeId?: string) => {
    if (nodeId) {
      state.select(nodeId)
      setSelectedNodeId(nodeId)
      onGlobalSelectNestedNode(nodeId)

      const selectedNode = nested.find(nestedNode => nestedNode.id === nodeId)
      setNoSubHeaderSide?.(selectedNode)
    }
  }

  // Because combiner should be displayed for one more level deeper than it is
  const level = useLevelContext() + 1

  const layoutMode = useLayoutMode()

  const nodesTypeData = useMemo(() => {
    const result: Record<string, NodeTypeData> = {}
    nested.forEach(nestedNode => {
      if (nestedNode?.id) {
        const nodeTypeData = buildNodeTypeData({ node: nestedNode })
        // Just guard, but null is impossible
        nodeTypeData && (result[nestedNode.id] = nodeTypeData)
      }
    })
    return result
  }, [nested])

  if (ArrayUtils.isEmpty(nested)) {
    return null
  }

  const selectedNode = nested.find(node => node?.id === selectedNodeId)
  const combinerType = isCombinerItemNode(selectedNode) ? selectedNode?.kind : ''

  return (
    <SelectNestedNodeRow
      nodesTypeData={nodesTypeData}
      selectedNodeId={selectedNodeId}
      combiner={combinerType}
      onSelect={onSelect}
      layoutMode={layoutMode}
      level={level}
      $nodeChange={$nodeChange ?? (state.node.meta as DiffNodeMeta)?.$nodeChange}
      $nestedChanges={(state.node.meta as DiffNodeMeta)?.$nestedChanges}
      $nestedChangesSummary={layoutMode !== DOCUMENT_LAYOUT_MODE
        ? state.$nestedChangesSummary
        : undefined}
    />
  )
}
