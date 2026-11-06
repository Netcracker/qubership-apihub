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

import { GraphQlOperationViewer } from '@portal/components/GraphQlOperationViewer'
import { SchemaContextPanel } from '@portal/components/SchemaContextPanel'
import type { DiffMetaKeys } from '@portal/entities/diff-meta-keys'
import type { OpenApiData } from '@portal/entities/operation-structure'
import { OPEN_API_SECTION_PARAMETERS, OPEN_API_SECTION_REQUESTS, OPEN_API_SECTION_RESPONSES } from '@portal/entities/operation-structure'
import { resolveOpenApiOperationKeys } from '@portal/utils/internal-documents/openapi-operation-keys'
import { Box } from '@mui/material'
import { DIFF_META_KEY, DIFFS_AGGREGATED_META_KEY } from '@netcracker/qubership-apihub-api-diff'
import type { OpenApiOperationKeys } from '@netcracker/qubership-apihub-api-doc-viewer'
import {
  AsyncApiOperationDiffsViewer,
  AsyncApiOperationViewer,
  GraphQLOperationDiffViewer,
  OpenApiOperationDiffsViewer,
  OpenApiOperationViewer,
  SIDE_BY_SIDE_DIFFS_LAYOUT_MODE,
} from '@netcracker/qubership-apihub-api-doc-viewer'
import '@netcracker/qubership-apihub-api-doc-viewer/dist/style.css'
import { FIRST_REFERENCE_KEY_PROPERTY } from '@netcracker/qubership-apihub-api-processor'
import { LoadingIndicator } from '@netcracker/qubership-apihub-ui-shared/components/LoadingIndicator'
import type { VisitorNavigationDetails } from '@netcracker/qubership-apihub-ui-shared/components/SchemaGraphView/oasToClassDiagramService'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import { API_TYPE_ASYNCAPI, API_TYPE_GRAPHQL, API_TYPE_REST } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import type { ChangeSeverity } from '@netcracker/qubership-apihub-ui-shared/entities/change-severities'
import { DEFAULT_API_TYPE } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import type { SchemaViewMode } from '@netcracker/qubership-apihub-ui-shared/entities/schema-view-mode'
import { joinedJsonPath } from '@netcracker/qubership-apihub-ui-shared/utils/operations'
import type { OpenAPIV3 } from 'openapi-types'
import type { FC, ReactNode } from 'react'
import { memo, Suspense, useEffect, useMemo, useState } from 'react'

const DIFFS_META_KEYS: DiffMetaKeys = {
  diffsMetaKey: DIFF_META_KEY,
  aggregatedDiffsMetaKey: DIFFS_AGGREGATED_META_KEY,
}

// First Order Component //
export type OperationViewProps = {
  apiType: ApiType
  schemaViewMode?: SchemaViewMode
  noHeading?: boolean
  comparisonMode?: boolean
  navigationDetails?: VisitorNavigationDetails
  operationModels?: OpenApiData
  mergedDocument: unknown
  // diffs specific
  filters?: ChangeSeverity[]
  // GraphQL specific
  operationType?: string
  // GraphQL, AsyncAPI specific
  operationName?: string
  // AsyncAPI specific
  messageId?: string
}

export const OperationView: FC<OperationViewProps> = memo<OperationViewProps>(props => {
  const {
    apiType = DEFAULT_API_TYPE,
    schemaViewMode,
    noHeading = false,
    navigationDetails,
    operationModels,
    mergedDocument,
    comparisonMode = false,
    // GraphQL specific
    operationType,
    operationName,
    // AsyncAPI specific
    messageId,
  } = props

  const filters = useMemo(() => props.filters ?? [], [props.filters])

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
      (model) => (
        joinedJsonPath(model.scopeDeclarationPath) === joinedJsonPath(navigationDetails?.scopeDeclarationPath ?? []) &&
        joinedJsonPath(model.declarationPath) === joinedJsonPath(navigationDetails?.declarationPath ?? [])
      ),
    )?.schemaObject as OpenAPIV3.SchemaObject | undefined
    setContextParameter(contextParameter ?? {})
    setContextPanelOpen(navigationDetails ? isNavigateToModel(navigationDetails) : false)
  }, [navigationDetails, indexedModels])

  // The document is cut to the only operation upstream, so its keys are read from the document itself
  const openApiOperationKeys = useMemo(
    () => (apiType === API_TYPE_REST ? resolveOpenApiOperationKeys(mergedDocument) : undefined),
    [apiType, mergedDocument],
  )

  const apiTypeViewerElement = useMemo(() => (
    API_TYPE_VIEWER_MAP[apiType]({
      comparisonMode: comparisonMode,
      mergedDocument: mergedDocument,
      schemaViewMode: schemaViewMode,
      noHeading: noHeading,
      filters: filters,
      openApiOperationKeys: openApiOperationKeys,
      operationType: operationType,
      operationName: operationName,
      messageId: messageId,
    })
  ), [apiType, comparisonMode, filters, mergedDocument, messageId, noHeading, openApiOperationKeys, operationName, operationType, schemaViewMode])

  return (
    <Suspense fallback={<LoadingIndicator />}>
      <Box lineHeight={1.5} height="100%" pt={1} sx={{ position: 'relative', overflowY: 'auto' }} data-testid="DocView">
        {apiTypeViewerElement}
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

OperationView.displayName = 'OperationView'

type ApiTypeViewerOptions = {
  comparisonMode: boolean
  mergedDocument: unknown
  schemaViewMode: SchemaViewMode | undefined
  noHeading: boolean
  filters: ChangeSeverity[]
  // OpenAPI specific
  openApiOperationKeys: OpenApiOperationKeys | undefined
  // GraphQL (query, mutation, subscription) / AsyncAPI (send, receive)
  operationType: string | undefined
  // GraphQL (operation name) / AsyncAPI (asyncOperationId)
  operationName: string | undefined
  // AsyncAPI specific, message ID
  messageId: string | undefined
}

type ApiTypeViewerCallback = (options: ApiTypeViewerOptions) => ReactNode

const API_TYPE_VIEWER_MAP: Record<ApiType, ApiTypeViewerCallback> = {
  [API_TYPE_REST]: ({ comparisonMode, mergedDocument, schemaViewMode, noHeading, filters, openApiOperationKeys }) => (
    <Box
      lineHeight={1.5}
      px={2}
      height="100%"
    >
      {!comparisonMode ? (
        <OpenApiOperationViewer
          source={mergedDocument}
          operationKeys={openApiOperationKeys}
          displayMode={schemaViewMode}
          noHeading={noHeading}
        />
      ) : (
        <OpenApiOperationDiffsViewer
          mergedSource={mergedDocument}
          operationKeys={openApiOperationKeys}
          displayMode={schemaViewMode}
          noHeading={noHeading}
          diffMetaKeys={DIFFS_META_KEYS}
          diffTypes={filters}
        />
      )}
    </Box>
  ),
  [API_TYPE_GRAPHQL]: ({ comparisonMode, mergedDocument, schemaViewMode, filters, operationType, operationName }) => (
    //todo need separate it to operationView and operationDiffView
    !comparisonMode
      ? <GraphQlOperationViewer
        source={mergedDocument}
        displayMode={schemaViewMode as SchemaViewMode}
        operationType={operationType}
        operationName={operationName}
      />
      : <GraphQLOperationDiffViewer
        source={mergedDocument}
        displayMode={schemaViewMode as SchemaViewMode}
        filters={filters}
        metaKeys={DIFFS_META_KEYS}
        layoutMode={SIDE_BY_SIDE_DIFFS_LAYOUT_MODE}
        operationType={operationType}
        operationName={operationName}
      />
  ),
  [API_TYPE_ASYNCAPI]: ({ comparisonMode, mergedDocument, schemaViewMode, operationName, messageId }) => (
    <Box
      key={`${operationName}-${messageId}`}
      lineHeight={1.5}
      height='100%'
      px={2}
    >
      {!comparisonMode ? (
        <AsyncApiOperationViewer
          source={mergedDocument}
          displayMode={schemaViewMode as SchemaViewMode}
          operationKeys={
            operationName && messageId
              ? { operationKey: operationName, messageKey: messageId }
              : undefined
          }
          referenceNamePropertyKey={FIRST_REFERENCE_KEY_PROPERTY}
        />
      ) : (
        <AsyncApiOperationDiffsViewer
          mergedSource={mergedDocument}
          displayMode={schemaViewMode as SchemaViewMode}
          operationKeys={
            operationName && messageId
              ? { operationKey: operationName, messageKey: messageId }
              : undefined
          }
          referenceNamePropertyKey={FIRST_REFERENCE_KEY_PROPERTY}
          diffMetaKeys={DIFFS_META_KEYS}
        />
      )}
    </Box>
  ),
}

function isNavigateToModel(navigationDetails: VisitorNavigationDetails): boolean {
  return joinedJsonPath(navigationDetails.declarationPath) !== joinedJsonPath(navigationDetails.scopeDeclarationPath)
}
