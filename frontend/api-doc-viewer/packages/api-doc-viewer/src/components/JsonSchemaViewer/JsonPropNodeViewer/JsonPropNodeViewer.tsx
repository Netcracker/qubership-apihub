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
import { useEffect, useState } from 'react'
import { JsonPropNodeBody } from './JsonPropNodeBody'
import { JsonPropNodeChildren } from './JsonPropNodeChildren'
import { DiffNodeMeta, DiffNodeValue, IModelTreeNode } from '@netcracker/qubership-apihub-api-data-model'
import {
  findNoSubHeaderSide,
  isArrayValue,
  isExpandableStateNode,
  isObjectValue,
  isRootNode,
  onToggleExpander,
  onToggleSort
} from '../../../utils/nodes'
import { JsonPropNodePropsWithState, PropsWithOverriddenKind } from '../../../types/internal/PropsWithState'
import { PropsWithChanges } from '../../../types/internal/PropsWithChanges'
import { ExpandingMode } from '../../../types/internal/ExpandingMode'
import { buildNodeTypeData } from '../../../builders/nodes'
import { takeNodeChangeIfAllChildrenChanged } from '../../../utils/common/changes'
import { LevelContext, useLevelContext } from '../../../contexts/LevelContext'
import { isCombinerNodeState } from '../types/nodes.guards'
import { PropsWithoutChangesSummary } from '../../../types/PropsWithoutChangesSummary'
import { LayoutSide } from '../../../types/internal/LayoutSide'
import { NoSubHeaderSideProvider } from '../../../contexts/NoSubHeaderContext'

// TODO 05.10.23 // Overriding kind has been added until REST API operation is rendered by ADV
export type JsonPropNodeViewerProps = PropsWithoutChangesSummary<
  JsonPropNodePropsWithState
  & PropsWithOverriddenKind
  & PropsWithChanges
>

export const JsonPropNodeViewer: FC<JsonPropNodeViewerProps> = (props) => {
  const {
    state,
    overriddenKind,
    $nodeChange,
  } = props
  const node = state.node
  const nodeValue = state.value
  const nodeChildren = state.children
  const nodeLeafChildren = nodeChildren.filter(n => !isCombinerNodeState(n))
  const $nodeValue = nodeValue as DiffNodeValue
  const $nodeMeta = state.meta as DiffNodeMeta

  const isRoot = isRootNode(node)
  const isObjectVal = isObjectValue(nodeValue)
  const isArrayVal = isArrayValue(nodeValue)
  const lastLevel = useLevelContext()
  const isNextDataLevel = state.node.newDataLevel
  const currentLevel = !isRoot && isNextDataLevel ? lastLevel + 1 : lastLevel

  const isExpandable = isExpandableStateNode(state)
  const [expanded, setExpanded] = useState(false)
  const [, setSorted] = useState(0)
  useEffect(() => {
    setExpanded(state.expanded)
    setSorted(state.sorted)
  }, [state.expanded, state.sorted])

  const [, setSelectedNestedNodeId] = useState<string>()
  const setGlobalSelectedNestedNodeId = (nodeId?: string) => {
    if (nodeId) {
      state.setSelected(nodeId)
      setSelectedNestedNodeId(state.selected)
    }
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

  // TODO 05.10.23 // This has been added until REST API operation is rendered by ADV
  const disableNestingHeader = overriddenKind === 'parameters' && isRoot && (isObjectVal || isArrayVal)

  const nodeTypeData = buildNodeTypeData({ node, nodeValue })
  delete nodeTypeData?.combiner
  const nestingIndicatorTitleData =
    nodeTypeData
      ? {
        nodeTypeData: nodeTypeData,
        nodeDepth: currentLevel + 1,
        $nodeChange: actualNodeChange ?? inferredNodeChange,
        $changes: $nodeValue?.$changes,
      }
      : undefined

  return (
    <LevelContext.Provider value={currentLevel}>
      <NoSubHeaderSideProvider value={noSubHeaderSide} setValue={setGlobalNoSubHeaderSide}>
        <div
          data-name="JsonNode"
          className="flex flex-col grow"
        >
          <JsonPropNodeBody
            state={state}
            disableNestingHeader={disableNestingHeader}
            onToggleExpander={(mode?: ExpandingMode) => onToggleExpander(state, setExpanded, mode)}
            onToggleSort={() => onToggleSort(state, setSorted)}
            $nodeChange={actualNodeChange}
          />
          {isExpandable && expanded && (
            <JsonPropNodeChildren
              disableNestingHeader={disableNestingHeader}
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
