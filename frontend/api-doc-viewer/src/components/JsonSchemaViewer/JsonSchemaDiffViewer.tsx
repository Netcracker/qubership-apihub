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

import { FC, useMemo } from 'react'
import { createJsonSchemaDiffTree, JsonSchemaDiffTreeNode } from '@netcracker/qubership-apihub-api-data-model'
import { JsonSchemaState } from '../../api-model-state'
import { DEFAULT_DISPLAY_MODE, DEFAULT_EXPANDED_DEPTH, DEFAULT_LAYOUT_MODE, } from '../../consts/configuration'
import { DisplayMode } from '../../types/DisplayMode'
import { LayoutMode } from '../../types/LayoutMode'
import { PropsWithOverriddenKind } from '../../types/internal/PropsWithState'
import { isCombinerNodeState, isPropNodeState } from './types/nodes.guards'
import { JsonPropNodeViewer } from './JsonPropNodeViewer/JsonPropNodeViewer'
import { JsonCombinerNodeViewer } from './JsonCombinerNodeViewer/JsonCombinerNodeViewer'
import { DisplayModeContext } from '../../contexts/DisplayModeContext'
import { LayoutModeContext } from '../../contexts/LayoutModeContext'
import { LevelContext } from '../../contexts/LevelContext'
import { ChangeSeverityFiltersContext } from '../../contexts/ChangeSeverityFiltersContext'
import { TopLevelPropsMediaTypesContext } from '../../contexts/TopLevelPropsMediaTypesContext'
import { PropsWithTopLevelPropsMediaTypesMap } from '../../types/internal/PropsWithTopLevelPropsMediaTypesMap'
import { ErrorBoundary } from "../services/ErrorBoundary";
import { ErrorBoundaryFallback } from "../services/ErrorBoundaryFallback";
import { DiffType } from '@netcracker/qubership-apihub-api-diff'

export type JsonSchemaDiffViewerProps = {
  schema: unknown,
  expandedDepth?: number
  displayMode?: DisplayMode
  // diffs
  layoutMode?: LayoutMode
  filters?: ReadonlyArray<DiffType>
  diffMetaKey: symbol
} & PropsWithOverriddenKind & PropsWithTopLevelPropsMediaTypesMap

export const JsonSchemaDiffViewer: FC<JsonSchemaDiffViewerProps> = (props) => {
  return (
    <ErrorBoundary fallback={<ErrorBoundaryFallback componentName="JSON Schema Diff Viewer"/>}>
      <JsonSchemaDiffViewerInner {...props}/>
    </ErrorBoundary>
  )
}

const JsonSchemaDiffViewerInner: FC<JsonSchemaDiffViewerProps> = (props) => {
  const {
    schema,
    expandedDepth = DEFAULT_EXPANDED_DEPTH,
    displayMode = DEFAULT_DISPLAY_MODE,
    // diffs
    layoutMode = DEFAULT_LAYOUT_MODE,
    filters = [],
    overriddenKind,
    diffMetaKey,
    // FIXME 18.06.24 // Get rid of it when future wonderful AMT+ADV are ready!
    topLevelPropsMediaTypes
  } = props

  const tree = useMemo(
    () => createJsonSchemaDiffTree(schema, diffMetaKey),
    [diffMetaKey, schema]
  )
  const state = useMemo(
    // @ts-expect-error // Bad types
    () => new JsonSchemaState<JsonSchemaDiffTreeNode>(tree, expandedDepth),
    [expandedDepth, tree]
  )

  // console.debug('Schema:', schema)
  // console.debug('Tree Model:', tree)
  // console.debug('State Model:', state)

  const root = state.root
  let content = null

  if (isPropNodeState(root)) {
    content = (
      <JsonPropNodeViewer
        state={root}
        overriddenKind={overriddenKind}
      />
    )
  }

  if (isCombinerNodeState(root)) {
    content = (
      <JsonCombinerNodeViewer
        state={root}
        onGlobalSelectNestedNode={() => null}
      />
    )
  }

  return (
    <TopLevelPropsMediaTypesContext.Provider value={topLevelPropsMediaTypes}>
      <ChangeSeverityFiltersContext.Provider value={filters}>
        <DisplayModeContext.Provider value={displayMode}>
          <LayoutModeContext.Provider value={layoutMode}>
            <LevelContext.Provider value={0}>
              {content}
            </LevelContext.Provider>
          </LayoutModeContext.Provider>
        </DisplayModeContext.Provider>
      </ChangeSeverityFiltersContext.Provider>
    </TopLevelPropsMediaTypesContext.Provider>
  )
}
