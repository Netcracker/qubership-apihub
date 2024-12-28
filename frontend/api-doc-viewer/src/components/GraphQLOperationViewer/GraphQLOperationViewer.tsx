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

import '../../index.css'

import type { FC } from 'react'
import { useMemo } from 'react'
import {
  createGraphApiTree,
  DiffNodeMeta,
  GraphApiNodeData,
  GraphApiNodeKind,
  GraphApiNodeMeta,
  ModelTree
} from '@netcracker/qubership-apihub-api-data-model'
import { GraphApiState } from '../../api-model-state'
import { isCombinerNodeState, isPropNodeState } from './types/nodes.guards'
import { DEFAULT_EXPANDED_DEPTH } from '../../consts/configuration'
import { DETAILED_DISPLAY_MODE, DisplayMode } from '../../types/DisplayMode'
import { DisplayModeContext } from '../../contexts/DisplayModeContext'
import { isDirectiveNode, isOperationNode } from './utils/nodes'
import { GraphPropNodeViewer } from '../GraphSchemaViewer/GraphPropNodeViewer/GraphPropNodeViewer'
import { GraphCombinerNodeViewer } from '../GraphSchemaViewer/GraphCombinerNodeViewer/GraphCombinerNodeViewer'
import { CustomDirectivesSectionRow } from './CustomDirectivesSectionRow'
import { DOCUMENT_LAYOUT_MODE } from '../../types/LayoutMode'
import { LevelContext } from '../../contexts/LevelContext'
import { ErrorBoundary } from "../services/ErrorBoundary";
import { ErrorBoundaryFallback } from "../services/ErrorBoundaryFallback";
import { useLogRenderCompleted } from "../../hooks/debug-hook";

// FIXME 28.09.23 // Fix generic types

export type GraphQLOperationViewerProps = {
  source: unknown
  operationPath?: string // example: getFruit
  expandedDepth?: number
  displayMode?: DisplayMode
}

export const GraphQLOperationViewer: FC<GraphQLOperationViewerProps> = (props) => {
  return (
    <ErrorBoundary fallback={<ErrorBoundaryFallback componentName="GraphQL Operation Viewer"/>}>
      <GraphQLOperationViewerInner {...props}/>
    </ErrorBoundary>
  )
}

const GraphQLOperationViewerInner: FC<GraphQLOperationViewerProps> = (props) => {
  useLogRenderCompleted()

  const {
    source,
    operationPath,
    expandedDepth = DEFAULT_EXPANDED_DEPTH,
    displayMode = DETAILED_DISPLAY_MODE,
  } = props

  const tree: ModelTree<GraphApiNodeData, GraphApiNodeKind, GraphApiNodeMeta> = useMemo(
    () => createGraphApiTree(source),
    [source]
  )

  // TODO 27.12.23 // Diff State!
  const state = useMemo(
    () => new GraphApiState(tree, operationPath, expandedDepth),
    [expandedDepth, operationPath, tree]
  )

  // console.debug('GraphAPI Schema:', source)
  // console.debug('Tree Model:', tree)
  // console.debug('State Model:', state)

  const root = state.root

  if (!root) {
    return null
  }

  return (
    <DisplayModeContext.Provider value={displayMode}>
      <LevelContext.Provider value={0}>
        <div style={{ marginLeft: 0 }}>
          {root.children.map((child, index) => {
            const key = `root-children-${index}`

            if (isPropNodeState(child)) {
              const $childMeta = child.meta as DiffNodeMeta

              if (isOperationNode(child.node)) {
                return operationPath || child.first
                  ? <GraphPropNodeViewer
                    key={key}
                    state={child}
                    $nodeChange={$childMeta?.$nodeChange}
                  />
                  : null
              }

              if (isDirectiveNode(child.node) && child.first) {
                return (
                  <div key={key}>
                    <CustomDirectivesSectionRow layoutMode={DOCUMENT_LAYOUT_MODE}/>
                    <GraphPropNodeViewer
                      state={child}
                      $nodeChange={$childMeta?.$nodeChange}
                    />
                  </div>
                )
              }

              return (
                <GraphPropNodeViewer
                  key={key}
                  state={child}
                  $nodeChange={$childMeta?.$nodeChange}
                />
              )
            }

            if (isCombinerNodeState(child)) {
              return (
                <GraphCombinerNodeViewer
                  key={key}
                  state={child}
                  onGlobalSelectNestedNode={() => null}
                />
              )
            }

            return null
          })}
        </div>
      </LevelContext.Provider>
    </DisplayModeContext.Provider>
  )
}
