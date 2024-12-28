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

import { Box } from '@mui/material'
import type { FC, MutableRefObject, PropsWithChildren, ReactNode } from 'react'
import { memo, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import type { OperationDisplayMode } from './OperationDisplayMode'
import type { OpenAPIV3 } from 'openapi-types'
import type { OperationData } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import { DEFAULT_API_TYPE } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import type {
  VisitorNavigationDetails,
} from '@netcracker/qubership-apihub-ui-shared/components/SchemaGraphView/oasToClassDiagramService'
import { OPEN_API_SECTION_PARAMETERS, OPEN_API_SECTION_REQUESTS, OPEN_API_SECTION_RESPONSES } from '@apihub/entities/operation-structure'
import type { OpenApiData } from '@apihub/entities/operation-structure'
import { GraphQlOperationViewer } from '@apihub/components/GraphQlOperationViewer'
import { SchemaContextPanel } from '@apihub/components/SchemaContextPanel'
import { joinedJsonPath } from '@netcracker/qubership-apihub-ui-shared/utils/operations'
import { LoadingIndicator } from '@netcracker/qubership-apihub-ui-shared/components/LoadingIndicator'
import type { SchemaViewMode } from '@netcracker/qubership-apihub-ui-shared/entities/schema-view-mode'
import { useSetupOperationView } from './useSetupOperationView'
import { GLOBAL_DIFF_META_KEY } from '@netcracker/qubership-apihub-ui-shared/utils/api-diffs'
import { GraphQLOperationDiffViewer, SIDE_BY_SIDE_DIFFS_LAYOUT_MODE } from '@netcracker/qubership-apihub-api-doc-viewer'
import type { ChangeSeverity } from '@netcracker/qubership-apihub-ui-shared/entities/change-severities'
import type { OperationViewElementProps } from './OperationViewElement'
import { createOperationViewElement } from './OperationViewElement'
import { createDiffOperationViewElement } from './DiffOperationViewElement'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import { API_TYPE_GRAPHQL, API_TYPE_REST } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'

// First Order Component //
export type OperationViewProps = PropsWithChildren<{
  apiType: ApiType
  changedOperation?: OperationData | null
  originOperation?: OperationData | null
  displayMode?: OperationDisplayMode
  selectedUri?: string
  sidebarEnabled?: boolean
  searchPhrase?: string
  schemaViewMode?: SchemaViewMode
  hideTryIt?: boolean
  noHeading?: boolean
  hideExamples?: boolean
  comparisonMode?: boolean
  productionMode?: boolean
  navigationDetails?: VisitorNavigationDetails
  operationModels?: OpenApiData
  mergedDocument: unknown
  // diffs specific
  filters?: ChangeSeverity[]
}>

export const OperationView: FC<OperationViewProps> = memo<OperationViewProps>(props => {
  const {
    apiType = DEFAULT_API_TYPE,
    selectedUri,
    schemaViewMode,
    hideTryIt,
    noHeading = false,
    hideExamples,
    navigationDetails,
    operationModels,
    mergedDocument,
    comparisonMode,
    // diffs specific
    filters,
  } = props
  const operationViewContainerRef = useRef<HTMLDivElement | null>(null)

  // const [newRestApiViewer] = useState(false)
  const [contextPanelOpen, setContextPanelOpen] = useState<boolean>(false)
  const [contextParameter, setContextParameter] = useState<OpenAPIV3.SchemaObject>()

  const indexedModels = useMemo(() => {
    return [
      ...Object.values(operationModels?.[OPEN_API_SECTION_RESPONSES] ?? {}).flatMap(responses => Object.values(responses)),
      ...Object.values(operationModels?.[OPEN_API_SECTION_REQUESTS] ?? {}),
      ...(operationModels?.[OPEN_API_SECTION_PARAMETERS] ? [operationModels?.[OPEN_API_SECTION_PARAMETERS]] : []),
    ].flatMap(section => section.data)
  }, [operationModels])

  useEffect(() => {
    //refResolver cannot resolve ref to parameter
    const contextParameter = indexedModels?.find(
      (model) => joinedJsonPath(model.scopeDeclarationPath) === joinedJsonPath(navigationDetails?.scopeDeclarationPath ?? []) &&
        joinedJsonPath(model.declarationPath) === joinedJsonPath(navigationDetails?.declarationPath ?? []),
    )?.schemaObject as OpenAPIV3.SchemaObject | undefined
    setContextParameter(contextParameter ?? {})
    setContextPanelOpen(navigationDetails ? isNavigateToModel(navigationDetails) : false)
  }, [navigationDetails, indexedModels])

  const resolvedOperationViewElement = useMemo(() => {
    const options: OperationViewElementProps = {
      router: 'hash',
      layout: 'partial',
      hideTryIt: hideTryIt ?? false,
      hideExport: true,
      noHeading: noHeading,
      selectedNodeUri: selectedUri ?? '',
      searchPhrase: '',
      schemaViewMode: 'detailed',
      defaultSchemaDepth: 0,
      hideExamples: hideExamples ?? true,
      mergedDocument: mergedDocument,
    }

    if (comparisonMode) {
      return createDiffOperationViewElement({
        ...options,
        filters: filters ?? [],
        diffMetaKey: GLOBAL_DIFF_META_KEY,
      })
    }

    return createOperationViewElement(options)
    // need to create element once -> no deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (
      operationViewContainerRef.current?.childNodes &&
      !operationViewContainerRef.current?.contains(resolvedOperationViewElement)
    ) {
      operationViewContainerRef.current.appendChild(resolvedOperationViewElement)
    }
  }, [operationViewContainerRef, resolvedOperationViewElement])

  useSetupOperationView(resolvedOperationViewElement, props)

  return (
    <Suspense fallback={<LoadingIndicator />}>
      <Box lineHeight={1.5} height="100%" pt={1} sx={{ position: 'relative', overflowY: 'auto' }} data-testid="DocView">
        {API_TYPE_VIEWER_MAP[apiType](
          operationViewContainerRef,
          comparisonMode,
          mergedDocument,
          schemaViewMode,
          filters,
        )}
      </Box>
      {contextPanelOpen && (
        <Box position="absolute" style={{ backgroundColor: 'white' }} top="0" right="0" left="0" bottom="0">
          <SchemaContextPanel
            contextSchema={contextParameter as OpenAPIV3.SchemaObject}
            displayMode={schemaViewMode}
            onClose={() => setContextPanelOpen(false)}
          />
        </Box>
      )}
    </Suspense>
  )
})

function isNavigateToModel(navigationDetails: VisitorNavigationDetails): boolean {
  return joinedJsonPath(navigationDetails.declarationPath) !== joinedJsonPath(navigationDetails.scopeDeclarationPath)
}

type ApiTypeViewerCallback = (
  ref?: MutableRefObject<HTMLDivElement | null>,
  comparisonMode?: boolean,
  mergedDocument?: unknown,
  schemaViewMode?: SchemaViewMode,
  filters?: ChangeSeverity[],
) => ReactNode

const API_TYPE_VIEWER_MAP: Record<ApiType, ApiTypeViewerCallback> = {
  [API_TYPE_REST]: (ref) => (
    <Box ref={ref} />
  ),
  [API_TYPE_GRAPHQL]: (_, comparisonMode, mergedDocument, schemaViewMode, filters) => (
    //todo need separate it to operationView and operationDiffView
    !comparisonMode
      ? <GraphQlOperationViewer
        source={mergedDocument}
        displayMode={schemaViewMode as SchemaViewMode}
      />
      : <GraphQLOperationDiffViewer
        source={mergedDocument}
        displayMode={schemaViewMode as SchemaViewMode}
        filters={filters ?? []}
        diffMetaKey={GLOBAL_DIFF_META_KEY}
        layoutMode={SIDE_BY_SIDE_DIFFS_LAYOUT_MODE}
      />
  ),
}

