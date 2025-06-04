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

import { DiffNodeMeta, DiffNodeValue, IModelTreeNode } from '@netcracker/qubership-apihub-api-data-model'
import type { FC } from 'react'
import { useEffect, useState } from 'react'
import { buildNodeTypeData } from '../../../builders/nodes'
import { LevelContext, useLevelContext } from '../../../contexts/LevelContext'
import { NoSubHeaderSideProvider } from '../../../contexts/NoSubHeaderContext'
import { PropsWithoutChangesSummary } from '../../../types/PropsWithoutChangesSummary'
import { ExpandingMode } from '../../../types/internal/ExpandingMode'
import { LayoutSide } from '../../../types/internal/LayoutSide'
import { GraphSchemaNestingIndicatorTitleData } from '../../../types/internal/NestingIndicatorTitleData'
import { PropsWithChanges } from '../../../types/internal/PropsWithChanges'
import { GraphPropNodePropsWithState } from '../../../types/internal/PropsWithState'
import { takeNodeChangeIfAllChildrenChanged } from '../../../utils/common/changes'
import {
  findNoSubHeaderSide,
  isCombinerNode,
  isExpandableStateNode,
  isPrimitiveValue,
  isRootNode,
  onToggleExpander,
  onToggleSort
} from '../../../utils/nodes'
import { isOperationNode } from '../../GraphQLOperationViewer/utils/nodes'
import { isCombinerNodeState } from '../../JsonSchemaViewer/types/nodes.guards'
import { GraphPropNodeBody } from './GraphPropNodeBody'
import { GraphPropNodeChildren } from './GraphPropNodeChildren'

export type GraphPropNodeViewerProps = PropsWithoutChangesSummary<
  GraphPropNodePropsWithState &
  PropsWithChanges
>

export const GraphPropNodeViewer: FC<GraphPropNodeViewerProps> = (props) => {
  const {
    state,
    $nodeChange,
  } = props
  const node = state.node
  const nodeValue = state.value
  const nodeChildren = state.children
  const nodeLeafChildren = nodeChildren.filter(n => !isCombinerNodeState(n))
  const $nodeValue = nodeValue as DiffNodeValue
  const $nodeMeta = node.meta as DiffNodeMeta

  const isOperation = isOperationNode(node)
  const isRoot = isRootNode(node)
  const lastLevel = useLevelContext()
  const isNextDataLevel = state.node.newDataLevel
  const currentLevel = !isRoot && !isOperation && isNextDataLevel ? lastLevel + 1 : lastLevel

  const isExpandable = isExpandableStateNode(state)
  const alwaysExpanded = !isCombinerNode(node) && isPrimitiveValue(nodeValue)
  const [expanded, setExpanded] = useState(false)
  const [, setSorted] = useState(0)
  useEffect(() => {
    alwaysExpanded && state.expand()
    setExpanded(state.expanded)
    setSorted(state.sorted)
  }, [alwaysExpanded, state, state.expanded, state.sorted])

  const [, setSelectedNestedNodeId] = useState<string>()
  const setGlobalSelectedNestedNodeId = (nodeId: string) => {
    state.setSelected(nodeId)
    setSelectedNestedNodeId(state.selected)
  }

  const [
    noSubHeaderSide,
    setNoSubHeaderSide,
  ] = useState<LayoutSide | undefined>(undefined)
  const setGlobalNoSubHeaderSide = (node?: IModelTreeNode<any, any, any>) => {
    if (node) {
      const noSubHeaderSide = findNoSubHeaderSide(node)
      setNoSubHeaderSide(noSubHeaderSide)
    }
  }

  const actualNodeChange = $nodeChange ?? $nodeMeta?.$nodeChange
  const inferredNodeChange = takeNodeChangeIfAllChildrenChanged(nodeLeafChildren)

  const nodeTypeData = buildNodeTypeData({ node, nodeValue })
  delete nodeTypeData?.combiner
  const nestingIndicatorTitleData: GraphSchemaNestingIndicatorTitleData | undefined =
    nodeTypeData
      ? {
        nodeTypeData: nodeTypeData,
        nodeDepth: currentLevel + 1,
        $argsChange: inferredNodeChange,
        $nodeChange: actualNodeChange ?? inferredNodeChange,
        $changes: $nodeValue?.$changes,
      }
      : undefined

  return (
    <LevelContext.Provider value={currentLevel}>
      <NoSubHeaderSideProvider value={noSubHeaderSide} setValue={setGlobalNoSubHeaderSide}>
        <div
          data-name="GraphNode"
          className="flex flex-col grow"
        >
          <GraphPropNodeBody
            state={state}
            onToggleExpander={(mode?: ExpandingMode) => onToggleExpander(state, setExpanded, mode)}
            onToggleSort={() => onToggleSort(state, setSorted)}
            $nodeChange={actualNodeChange}
          />
          {(isOperation || isExpandable && expanded) && (
            <GraphPropNodeChildren
              items={nodeChildren}
              onGlobalSelectNestedNode={setGlobalSelectedNestedNodeId}
              $nodeChange={actualNodeChange}
              nestingIndicatorTitleData={nestingIndicatorTitleData}
            />
          )}
        </div>
      </NoSubHeaderSideProvider>
    </LevelContext.Provider>
  )
}
