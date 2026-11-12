import type { FC } from 'react'
import { useMemo, useState } from 'react'
import { DiffNodeMeta, GraphApiDiffTreeNode, GraphApiTreeNode } from '@netcracker/qubership-apihub-api-data-model'
import { isCombinerItemNode } from '../../../utils/nodes'
import { GraphCombinerNodePropsWithState } from '../../../types/internal/PropsWithState'
import { PropsWithChanges } from '../../../types/internal/PropsWithChanges'
import { useLayoutMode } from '../../../contexts/LayoutModeContext'
import { NodeTypeData } from '../../../types/NodeTypeData'
import { buildNodeTypeData } from '../../../builders/nodes'
import { SelectNestedNodeRow } from '../../common/SelectNestedNodeRow/SelectNestedNodeRow'
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
        const nodeTypeData = buildNodeTypeData({ node: nestedNode as GraphApiDiffTreeNode | GraphApiTreeNode })
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
