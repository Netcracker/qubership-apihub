import { GraphApiDiffTreeNode, GraphApiTreeNode } from '@netcracker/qubership-apihub-api-data-model'
import type { FC } from 'react'
import { IModelStateNode } from '@netcracker/qubership-apihub-api-state-model'
import { useLayoutMode } from '../../../contexts/LayoutModeContext'
import { isCombinerNodeState, isPropNodeState } from '../../../types/guards/nodes'
import { GraphSchemaNestingIndicatorTitleData } from '../../../types/internal/NestingIndicatorTitleData'
import { PropsWithChanges } from '../../../types/internal/PropsWithChanges'
import { PropsWithoutChangesSummary } from '../../../types/PropsWithoutChangesSummary'
import { isArgumentNode, isDirectiveUsageNode } from '../../../utils/nodes'
import { NodeType } from '../../common/NodeType'
import { GraphCombinerNodeViewer } from '../GraphCombinerNodeViewer/GraphCombinerNodeViewer'
import { NestingIndicatorTitleRow } from '../internal/layout/HeaderRow/NestingIndicatorTitleRow'
import { GraphPropNodeViewer } from './GraphPropNodeViewer'

export type GraphPropNodeChildrenProps = PropsWithoutChangesSummary<
  {
    items: IModelStateNode<GraphApiDiffTreeNode>[] | IModelStateNode<GraphApiTreeNode>[]
    onGlobalSelectNestedNode: (nodeId: string) => void
  } &
  PropsWithChanges &
  {
    nestingIndicatorTitleData?: GraphSchemaNestingIndicatorTitleData
  }
>

export const GraphPropNodeChildren: FC<GraphPropNodeChildrenProps> = (props) => {
  const {
    items,
    onGlobalSelectNestedNode,
    $nodeChange,
    nestingIndicatorTitleData
  } = props

  const layoutMode = useLayoutMode()

  return (
    <>
      {items.map((item, index) => {
        if (isPropNodeState(item)) {
          const isArgument = isArgumentNode(item.node)
          const isDirective = isDirectiveUsageNode(item.node)
          return (
            <div key={`prop-${index}`}>
              {nestingIndicatorTitleData && item.first && (
                <NestingIndicatorTitleRow
                  shift={false}
                  NodeType={NodeType}
                  nodeTypeData={
                    isArgument
                      ? { type: 'arguments' }
                      : isDirective
                        ? { type: 'directives' }
                        : nestingIndicatorTitleData.nodeTypeData
                  }
                  depth={nestingIndicatorTitleData.nodeDepth}
                  layoutMode={layoutMode}
                  $nodeChange={
                    isArgument
                      ? nestingIndicatorTitleData.$argsChange
                      : nestingIndicatorTitleData.$nodeChange
                  }
                  $changes={nestingIndicatorTitleData.$changes}
                />
              )}
              <GraphPropNodeViewer
                state={item}
                $nodeChange={$nodeChange}
              />
            </div>
          )
        }

        if (isCombinerNodeState(item)) {
          return (
            <GraphCombinerNodeViewer
              key={`combiner-${index}`}
              state={item}
              onGlobalSelectNestedNode={onGlobalSelectNestedNode}
              $nodeChange={$nodeChange}
            />
          )
        }

        return null
      })}
    </>
  )
}
