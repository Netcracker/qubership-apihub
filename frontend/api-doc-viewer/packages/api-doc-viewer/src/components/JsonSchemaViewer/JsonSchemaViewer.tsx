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

import { CustomizationOptionsContext, CustomizationOptions } from '@apihub/contexts/CustomizationOptionsContext'
import { createJsonSchemaTree, JsonSchemaTreeNode } from '@netcracker/qubership-apihub-api-data-model'
import { JsonSchemaState } from '@netcracker/qubership-apihub-api-state-model'
import { FC, useMemo } from 'react'
import { DEFAULT_DISPLAY_MODE, DEFAULT_EXPANDED_DEPTH } from '../../consts/configuration'
import { DisplayModeContext } from '../../contexts/DisplayModeContext'
import { LevelContext } from '../../contexts/LevelContext'
import { TopLevelPropsMediaTypesContext } from '../../contexts/TopLevelPropsMediaTypesContext'
import { DisplayMode } from '../../types/DisplayMode'
import { PropsWithOverriddenKind } from '../../types/internal/PropsWithState'
import { PropsWithTopLevelPropsMediaTypesMap } from '../../types/internal/PropsWithTopLevelPropsMediaTypesMap'
import { ErrorBoundary } from '../services/ErrorBoundary'
import { ErrorBoundaryFallback } from '../services/ErrorBoundaryFallback'
import { JsonCombinerNodeViewer } from './JsonCombinerNodeViewer/JsonCombinerNodeViewer'
import { JsonPropNodeViewer } from './JsonPropNodeViewer/JsonPropNodeViewer'
import { isCombinerNodeState, isPropNodeState } from './types/nodes.guards'

export type JsonSchemaViewerProps = {
  schema: unknown,
  expandedDepth?: number
  displayMode?: DisplayMode
} & PropsWithOverriddenKind & PropsWithTopLevelPropsMediaTypesMap & {
  customizationOptions?: CustomizationOptions
  initialLevel?: number
}

export const JsonSchemaViewer: FC<JsonSchemaViewerProps> = (props) => {
  return (
    <ErrorBoundary fallback={<ErrorBoundaryFallback componentName="JSON Schema Viewer" />}>
      <JsonSchemaViewerInner {...props} />
    </ErrorBoundary>
  )
}

const JsonSchemaViewerInner: FC<JsonSchemaViewerProps> = (props) => {
  const {
    schema,
    expandedDepth = DEFAULT_EXPANDED_DEPTH,
    displayMode = DEFAULT_DISPLAY_MODE,
    overriddenKind,
    // FIXME 18.06.24 // Get rid of it when future wonderful AMT+ADV are ready!
    topLevelPropsMediaTypes,
    // Integration with AsyncAPI (and OpenAPI in future)
    customizationOptions = {},
    initialLevel = 0,
  } = props

  const tree = useMemo(
    () => createJsonSchemaTree(schema),
    [schema]
  )
  const state = useMemo(
    // FIXME 07.10.25 // Get rid of "any"
    () => new JsonSchemaState<JsonSchemaTreeNode>(tree as any, expandedDepth),
    [expandedDepth, tree]
  )

  // console.debug('Schema: ', schema)
  // console.debug('Tree Model: ', tree)
  // console.debug('State Model: ', state)

  const root = state.root
  let content = null

  if (isPropNodeState(root)) {
    content = (
      <JsonPropNodeViewer
        // @ts-expect-error // TODO 14.10.25 // Fix this later
        state={root}
        overriddenKind={overriddenKind}
      />
    )
  }

  if (isCombinerNodeState(root)) {
    content = (
      <JsonCombinerNodeViewer
        // @ts-expect-error // TODO 14.10.25 // Fix this later
        state={root}
        onGlobalSelectNestedNode={() => null}
      />
    )
  }

  return (
    <CustomizationOptionsContext.Provider value={customizationOptions}>
      <TopLevelPropsMediaTypesContext.Provider value={topLevelPropsMediaTypes}>
        <DisplayModeContext.Provider value={displayMode}>
          <LevelContext.Provider value={initialLevel}>
            {content}
          </LevelContext.Provider>
        </DisplayModeContext.Provider>
      </TopLevelPropsMediaTypesContext.Provider>
    </CustomizationOptionsContext.Provider>
  )
}
