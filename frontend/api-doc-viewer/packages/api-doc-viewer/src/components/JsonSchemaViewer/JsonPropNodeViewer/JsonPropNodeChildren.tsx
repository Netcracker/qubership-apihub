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
import { JsonSchemaDiffTreeNode } from '@netcracker/qubership-apihub-api-data-model'
import { JsonPropNodeViewer } from './JsonPropNodeViewer'
import { IModelStateNode } from '@netcracker/qubership-apihub-api-state-model'
import { PropsWithDisabledNestingIndicatorTitle } from '../../../types/internal/PropsWithState'
import { PropsWithChanges } from '../../../types/internal/PropsWithChanges'
import { isCombinerNodeState, isPropNodeState } from '../types/nodes.guards'
import { JsonCombinerNodeViewer } from '../JsonCombinerNodeViewer/JsonCombinerNodeViewer'
import { NestingIndicatorTitleRow } from '../../GraphSchemaViewer/internal/layout/HeaderRow/NestingIndicatorTitleRow'
import { NodeType } from '../../common/NodeType'
import { useLayoutMode } from '../../../contexts/LayoutModeContext'
import { NestingIndicatorTitleData } from '../../../types/internal/NestingIndicatorTitleData'
import { PropsWithoutChangesSummary } from "../../../types/PropsWithoutChangesSummary";

export type JsonPropNodeChildrenProps = PropsWithoutChangesSummary<
  PropsWithDisabledNestingIndicatorTitle &
  {
    items: IModelStateNode<JsonSchemaDiffTreeNode>[]
    onGlobalSelectNestedNode: (nodeId?: string) => void
  } &
  PropsWithChanges &
  {
    nestingIndicatorTitleData?: NestingIndicatorTitleData
  }
>

export const JsonPropNodeChildren: FC<JsonPropNodeChildrenProps> = (props) => {
  const {
    disableNestingHeader,
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
          return (
            <div key={`prop-${index}`}>
              {!disableNestingHeader && nestingIndicatorTitleData && item.first && (
                <NestingIndicatorTitleRow
                  shift={false}
                  NodeType={NodeType}
                  nodeTypeData={nestingIndicatorTitleData.nodeTypeData}
                  depth={nestingIndicatorTitleData.nodeDepth}
                  layoutMode={layoutMode}
                  $nodeChange={nestingIndicatorTitleData.$nodeChange}
                  $changes={nestingIndicatorTitleData.$changes}
                />
              )}
              <JsonPropNodeViewer
                key={`prop-${index}`}
                state={item}
                $nodeChange={$nodeChange}
              />
            </div>
          )
        }

        if (isCombinerNodeState(item)) {
          return (
            <JsonCombinerNodeViewer
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
