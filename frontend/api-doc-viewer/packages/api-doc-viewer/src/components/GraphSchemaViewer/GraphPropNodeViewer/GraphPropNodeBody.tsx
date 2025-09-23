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

import {
  DiffNodeMeta,
  DiffNodeValue,
  GraphApiDiffTreeNode,
  GraphApiDirectiveNodeData,
  graphSchemaNodeKind,
  isObject
} from '@netcracker/qubership-apihub-api-data-model'
import type { FC } from 'react'
import { useEffect, useState } from 'react'
import { GraphSchemaStatePropNode, isExpandableTreeNode } from '@netcracker/qubership-apihub-api-state-model'
import { buildNodeTitleData, buildNodeTypeData } from '../../../builders/nodes'
import { useLayoutMode } from '../../../contexts/LayoutModeContext'
import { useLevelContext } from '../../../contexts/LevelContext'
import { useIsDetailedDisplayMode } from '../../../types/guards/displayMode'
import { ExpandingMode } from '../../../types/internal/ExpandingMode'
import { PropsWithChanges } from '../../../types/internal/PropsWithChanges'
import { GraphPropNodePropsWithState } from '../../../types/internal/PropsWithState'
import { PropsWithoutChangesSummary } from '../../../types/PropsWithoutChangesSummary'
import { listContainsNodeKind, listContainsNodeParentKind } from '../../../utils/common/rows'
import {
  hasNoContent,
  hasNoValidationsAndAnnotations,
  isArgumentNode,
  isArgumentsNode,
  isDirectiveUsageNode,
  isExpandableStateNode,
  isOutputNode,
  isRootNode
} from '../../../utils/nodes'
import { Annotations } from '../../common/annotations/Annotations'
import { isPropNodeState } from '../../GraphQLOperationViewer/types/nodes.guards'
import {
  isDirectiveNode,
  isOperationNode,
  isPropertyNode
} from '../../GraphQLOperationViewer/utils/nodes'
import { HeaderRow, NULLABILITY_POSITION_NODE, NULLABILITY_POSITION_TYPE } from '../internal/layout/HeaderRow/HeaderRow'
import { Validations } from '../internal/validations/Validations'

export type GraphPropNodeBodyProps = PropsWithoutChangesSummary<
  GraphPropNodePropsWithState &
  {
    onToggleExpander: (mode?: ExpandingMode) => void
    onToggleSort: () => void
  } &
  PropsWithChanges
>

export const GraphPropNodeBody: FC<GraphPropNodeBodyProps> = (props) => {
  const {
    state,
    onToggleExpander,
    onToggleSort,
    $nodeChange
  } = props
  const node = state.node
  const nodeDepth = useLevelContext()
  const nodeMeta = state.meta
  const $nodeMeta = nodeMeta as DiffNodeMeta
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
  const isDisabledHeaderRow =
    listContainsNodeKind(node, graphSchemaNodeKind.output) &&
    listContainsNodeParentKind(node, graphSchemaNodeKind.property)

  // GraphQL specific data
  // for operations
  const isOperation = isOperationNode(node)
  const isProperty = isPropertyNode(node)
  const isOutput = isOutputNode(node)
  const isDirectiveDefinition = isDirectiveNode(node)
  const isDirectiveUsage = isDirectiveUsageNode(node)
  const isArgument = isArgumentNode(node)
  const hasArgs = node.nested.length === 0 && node.children().some(isArgumentsNode)
  const operationKind = isOperationNode(node) ? node.kind : undefined
  const usedDirectives = Object.keys(nodeMeta?.directives ?? {})
  const directiveLocations = (nodeMeta as GraphApiDirectiveNodeData)?.locations ?? []
  // TODO 21.11.23 // Maybe we need to return to receiving not interface in props?
  const args = (state as GraphSchemaStatePropNode<GraphApiDiffTreeNode>).args
  const isNullable = isNullableValue(nodeValue)
  // ---

  // TODO 29.11.24 // isNullable and nullable in nodeTitleData - not synchronized!!!
  const nodeTitleData = buildNodeTitleData({ node, nodeValue, nodeMeta })
  const nodeTypeData = buildNodeTypeData({ node, nodeValue })

  return (
    <div className="flex flex-col">
      {!isDisabledHeaderRow && (
        <HeaderRow
          shift={isOperation}
          nodeTitleData={nodeTitleData}
          nodeTypeData={nodeTypeData}
          isCircularRef={node.isCycle}
          deprecationReason={nodeMeta?.deprecationReason}
          // GraphQL
          // operation
          isOperation={isOperation}
          method={operationKind}
          nullable={isNullable}
          nullabilityPosition={
            hasArgs && (isArgument || isProperty) || isOperation || isOutput ?
              NULLABILITY_POSITION_TYPE :
              NULLABILITY_POSITION_NODE
          }
          // other
          isDirective={isDirectiveDefinition || isDirectiveUsage}
          isArgument={isArgument}
          usedDirectives={usedDirectives}
          directiveLocations={directiveLocations}
          args={args}
          // -------
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
          // $nodeChangesSummary={$nodeMeta?.$nodeChangesSummary}
        />
      )}

      {/* Content */}
      {isDetailedDisplayMode && expanded && hasContent && (
        <div data-name="Body" className="flex flex-col grow">
          {hasValidationsOrAnnotations && (
            <div data-name="Content" className="flex flex-col">
              {/* TODO 01.11.23 // "shift" is a WA, find way better */}
              <Annotations
                shift={isExpandable && isRoot || isOperation}
                state={state}
                $nodeChange={$nodeChange}
              />
              <Validations
                shift={isExpandable && isRoot || isOperation}
                level={nodeDepth}
                nodeValue={nodeValue}
                $nodeChange={$nodeChange ?? $nodeMeta.$nodeChange}
                $changes={$nodeValue?.$changes}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function isNullableValue(value: unknown): boolean {
  return isObject(value) && (!('nullable' in value) || value.nullable === true)
}
