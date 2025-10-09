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
import { createGraphApiDiffTree, DiffNodeMeta } from '@netcracker/qubership-apihub-api-data-model'
import { GraphApiState } from '@netcracker/qubership-apihub-api-state-model'
import { isCombinerNodeState, isPropNodeState } from './types/nodes.guards'
import { DEFAULT_EXPANDED_DEPTH, DEFAULT_LAYOUT_MODE } from '../../consts/configuration'
import { DETAILED_DISPLAY_MODE, DisplayMode } from '../../types/DisplayMode'
import { DisplayModeContext } from '../../contexts/DisplayModeContext'
import { isDirectiveNode, isOperationNode } from './utils/nodes'
import { GraphPropNodeViewer } from '../GraphSchemaViewer/GraphPropNodeViewer/GraphPropNodeViewer'
import { GraphCombinerNodeViewer } from '../GraphSchemaViewer/GraphCombinerNodeViewer/GraphCombinerNodeViewer'
import { LayoutMode } from '../../types/LayoutMode'
import { LayoutModeContext } from '../../contexts/LayoutModeContext'
import { CustomDirectivesSectionRow } from './CustomDirectivesSectionRow'
import { ChangeSeverityFiltersContext } from '../../contexts/ChangeSeverityFiltersContext'
import { LevelContext } from '../../contexts/LevelContext'
import { ErrorBoundary } from "../services/ErrorBoundary";
import { ErrorBoundaryFallback } from "../services/ErrorBoundaryFallback";
import { useLogRenderCompleted } from "../../hooks/debug-hook";
import { DiffType } from "@netcracker/qubership-apihub-api-diff";

// FIXME 28.09.23 // Fix generic types

export type GraphQLOperationDiffViewerProps = {
  source: unknown
  operationPath?: string // example: getFruit
  expandedDepth?: number
  displayMode?: DisplayMode
  // diffs
  layoutMode?: LayoutMode,
  filters?: ReadonlyArray<DiffType>,
  diffMetaKey: symbol
}

export const GraphQLOperationDiffViewer: FC<GraphQLOperationDiffViewerProps> = (props) => {
  return (
    <ErrorBoundary fallback={<ErrorBoundaryFallback componentName="GraphQL Operation Diff Viewer"/>}>
      <GraphQLOperationDiffViewerInner {...props}/>
    </ErrorBoundary>
  )
}

const GraphQLOperationDiffViewerInner: FC<GraphQLOperationDiffViewerProps> = (props) => {
  useLogRenderCompleted()

  const {
    source,
    operationPath,
    expandedDepth = DEFAULT_EXPANDED_DEPTH,
    displayMode = DETAILED_DISPLAY_MODE,
    // diffs
    layoutMode = DEFAULT_LAYOUT_MODE,
    filters = [],
    diffMetaKey
  } = props

  const tree = useMemo(
    () => createGraphApiDiffTree(source, diffMetaKey, undefined, undefined, operationPath),
    [diffMetaKey, operationPath, source]
  )

  // TODO 27.12.23 // Diff State!
  const state = useMemo(
    // TODO 09.10.25 // Get rid of "any"
    () => new GraphApiState(tree as any, expandedDepth),
    [expandedDepth, tree]
  )

  console.debug('GraphAPI Schema:', source)
  console.debug('Diff Tree Model:', tree)
  console.debug('Diff State Model:', state)

  const root = state.root

  if (!root) {
    return null
  }

  return (
    <ChangeSeverityFiltersContext.Provider value={filters}>
      <DisplayModeContext.Provider value={displayMode}>
        <LayoutModeContext.Provider value={layoutMode}>
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
                        <CustomDirectivesSectionRow layoutMode={layoutMode}/>
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
        </LayoutModeContext.Provider>
      </DisplayModeContext.Provider>
    </ChangeSeverityFiltersContext.Provider>
  )
}
