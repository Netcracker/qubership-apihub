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

import { DiffNodeValue, JsonSchemaDiffNodeMeta } from '@netcracker/qubership-apihub-api-data-model'
import type { FC } from 'react'
import { useMemo, useState } from 'react'
import { buildNodeTypeData } from '../../../builders/nodes'
import { useLayoutMode } from '../../../contexts/LayoutModeContext'
import { LevelContext, useLevelContext } from '../../../contexts/LevelContext'
import { useSetNoSubHeaderSide } from '../../../contexts/NoSubHeaderContext'
import { NodeId } from '../../../types/aliases/nodes'
import { PropsWithChanges } from '../../../types/internal/PropsWithChanges'
import { JsonCombinerNodePropsWithState } from '../../../types/internal/PropsWithState'
import { DOCUMENT_LAYOUT_MODE } from '../../../types/LayoutMode'
import { NodeTypeData } from '../../../types/NodeTypeData'
import { PropsWithoutChangesSummary } from '../../../types/PropsWithoutChangesSummary'
import { takeNodeChangeIfWholeNodeChanged } from '../../../utils/common/changes'
import { isCombinerItemNode } from '../../../utils/nodes'
import { SelectNestedNodeRow } from '../../common/SelectNestedNodeRow'

export type JsonCombinerNodeViewerProps = PropsWithoutChangesSummary<
  JsonCombinerNodePropsWithState &
  { onGlobalSelectNestedNode: (nodeId?: string) => void } &
  PropsWithChanges
>

// TODO 16.11.23 // De-duplicate!
export const JsonCombinerNodeViewer: FC<JsonCombinerNodeViewerProps> = (props) => {
  const {
    state,
    onGlobalSelectNestedNode,
    $nodeChange,
  } = props

  const setNoSubHeaderSide = useSetNoSubHeaderSide()

  const lastLevel = useLevelContext()
  const isNextDataLevel = state.node.newDataLevel
  const currentLevel = isNextDataLevel ? lastLevel + 1 : lastLevel

  const $nodeMeta = state.node.meta as JsonSchemaDiffNodeMeta

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

  const layoutMode = useLayoutMode()

  const nodesTypeData = useMemo(() => {
    const result: Record<NodeId, NodeTypeData & Pick<DiffNodeValue, '$changes'>> = {}
    nested.forEach(nestedNode => {
      const $changes = nestedNode.value().$changes ?? {}
      const nodeTypeData = buildNodeTypeData({ node: nestedNode })
      if (!nodeTypeData) {
        // Just guard, null is impossible here
        return
      }
      result[nestedNode.id] = {
        ...nodeTypeData,
        ...Object.keys($changes).length ? { $changes } : {},
      }
    })
    return result
  }, [nested])

  // Because combiner should be displayed for one more level deeper than it is
  const level = useLevelContext() + 1

  const selectedNode = nested.find(node => node?.id === selectedNodeId)
  const combinerType = isCombinerItemNode(selectedNode) ? selectedNode?.kind : ''

  const $appliedNodeChange = takeNodeChangeIfWholeNodeChanged($nodeChange ?? $nodeMeta?.$nodeChange)

  return (
    <LevelContext.Provider value={currentLevel}>
      <SelectNestedNodeRow
        nodesTypeData={nodesTypeData}
        selectedNodeId={selectedNodeId}
        combiner={combinerType}
        onSelect={onSelect}
        layoutMode={layoutMode}
        level={level}
        $nodeChange={$appliedNodeChange}
        $nestedChanges={$nodeMeta?.$nestedChanges}
        $nestedChangesSummary={layoutMode !== DOCUMENT_LAYOUT_MODE
          ? state.$nestedChangesSummary
          : undefined}
      />
    </LevelContext.Provider>
  )
}
