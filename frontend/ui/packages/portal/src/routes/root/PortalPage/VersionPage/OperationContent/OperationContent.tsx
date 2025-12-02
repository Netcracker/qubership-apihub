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

import type { OpenApiData } from '@apihub/entities/operation-structure'
import {
  useApiDiffResult,
  useIsApiDiffResultLoading,
  useSetApiDiffResult,
} from '@apihub/routes/root/ApiDiffResultProvider'
import { OperationView } from '@apihub/routes/root/PortalPage/VersionPage/OperationContent/OperationView/OperationView'
import {
  useCustomServersContext,
} from '@apihub/routes/root/PortalPage/VersionPage/OperationContent/Playground/CustomServersProvider'
import { getFileDetails } from '@apihub/utils/file-details'
import { Box } from '@mui/material'
import { cropRawGraphQlDocumentToRawSingleOperationGraphQlDocument } from '@netcracker/qubership-apihub-api-processor'
import { LoadingIndicator } from '@netcracker/qubership-apihub-ui-shared/components/LoadingIndicator'
import {
  CONTENT_PLACEHOLDER_AREA,
  Placeholder,
  SEARCH_PLACEHOLDER_VARIANT,
} from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'
import { RawSpecDiffView } from '@netcracker/qubership-apihub-ui-shared/components/RawSpecDiffView'
import { RawSpecView } from '@netcracker/qubership-apihub-ui-shared/components/SpecificationDialog/RawSpecView'
import { Toggler } from '@netcracker/qubership-apihub-ui-shared/components/Toggler'
import {
  WarningApiProcessorVersion,
} from '@netcracker/qubership-apihub-ui-shared/components/WarningApiProcessorVersion'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import {
  API_TYPE_ASYNCAPI,
  API_TYPE_GRAPHQL,
  API_TYPE_REST,
} from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import type { FileViewMode } from '@netcracker/qubership-apihub-ui-shared/entities/file-format-view'
import { FILE_FORMAT_VIEW, YAML_FILE_VIEW_MODE } from '@netcracker/qubership-apihub-ui-shared/entities/file-format-view'
import type { OperationData } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import { checkIfGraphQLOperation, DEFAULT_API_TYPE } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import { useSystemInfo } from '@netcracker/qubership-apihub-ui-shared/features/system-info'
import {
  useSeverityFiltersSearchParam,
} from '@netcracker/qubership-apihub-ui-shared/hooks/change-severities/useSeverityFiltersSearchParam'
import { usePublishedDocumentRaw } from '@netcracker/qubership-apihub-ui-shared/hooks/documents/usePublishedDocumentRaw'
import {
  useIsDocOperationViewMode,
  useIsGraphOperationViewMode,
  useIsRawOperationViewMode,
} from '@netcracker/qubership-apihub-ui-shared/hooks/operations/useOperationMode'
import {
  useOperationsPairStringified,
} from '@netcracker/qubership-apihub-ui-shared/hooks/operations/useOperationsPairAsStrings'
import type { FC, ReactNode } from 'react'
import { memo, useCallback, useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useVersionsComparisonGlobalParams } from '../../..//PortalPage/VersionPage/VersionsComparisonGlobalParams'
import { useOperationNavigationDetails } from '../../../OperationNavigationDataProvider'
import { useSetChangesLoadingStatus } from '../ChangesLoadingStatusProvider'
import { useBreadcrumbsData } from '../ComparedPackagesBreadcrumbsProvider'
import { useFileViewMode } from '../useFileViewMode'
import { useOperationViewMode } from '../useOperationViewMode'
import { useSidebarPlaygroundViewMode } from '../useSidebarPlaygroundViewMode'
import { OperationModelsGraph } from './OperationModelsGraph'
import { OperationsSwapper } from './OperationsSwapper'
import { OperationSubheader } from './OperationSubheader'
import type { OperationDisplayMode } from './OperationView/OperationDisplayMode'
import { DEFAULT_DISPLAY_MODE, isComparisonMode } from './OperationView/OperationDisplayMode'
import { OperationWithPlayground } from './OperationWithPlayground'
import { useIsExamplesMode, useIsPlaygroundMode, useIsPlaygroundSidebarOpen } from './usePlaygroundSidebarMode'
import { useSelectOperationTags } from './useSelectOperationTags'
import { isAsyncApiSpecification } from '@apihub/utils/internal-documents/type-guards'

export type OperationContentProps = {
  changedOperation?: OperationData
  originOperation?: OperationData
  // Feature "Internal documents"
  normalizedChangedOperation?: unknown
  normalizedOriginOperation?: unknown
  // ---
  isOperationExist?: boolean
  displayMode?: OperationDisplayMode
  paddingBottom?: string | number
  isLoading: boolean
  operationModels?: OpenApiData
}

function useRawGraphQlCroppedToSingleOperationRawGraphQl(
  originalGraphql: string,
  operationType?: string,
  operationName?: string,
): string {
  return useMemo(() => {
    if (originalGraphql && operationType && operationName) {
      let operationTypeSection: 'queries' | 'mutations' | 'subscriptions' | undefined
      switch (operationType) {
        case 'query':
          operationTypeSection = 'queries'
          break
        case 'mutation':
          operationTypeSection = 'mutations'
          break
        case 'subscription':
          operationTypeSection = 'subscriptions'
          break
      }
      return operationTypeSection
        ? cropRawGraphQlDocumentToRawSingleOperationGraphQlDocument(originalGraphql, operationTypeSection, operationName)
        : originalGraphql
    }
    return ''
  }, [originalGraphql, operationType, operationName])
}

export const OperationContent: FC<OperationContentProps> = memo<OperationContentProps>(props => {
  const {
    changedOperation,
    originOperation,
    // Feature "Internal documents"
    normalizedChangedOperation,
    normalizedOriginOperation,
    // ---
    isOperationExist = true,
    displayMode = DEFAULT_DISPLAY_MODE,
    isLoading,
    paddingBottom,
    operationModels,
  } = props

  const {
    packageId = '',
    apiType = DEFAULT_API_TYPE,
  } = useParams<{ packageId: string; apiType: ApiType }>()
  const {
    originPackageKey,
    changedPackageKey,
    changedVersionKey,
    originVersionKey,
  } = useVersionsComparisonGlobalParams()

  const isGraphQLOperation = useMemo(
    () => checkIfGraphQLOperation(changedOperation) || checkIfGraphQLOperation(originOperation),
    [changedOperation, originOperation],
  )

  const { mode, schemaViewMode } = useOperationViewMode()
  const isDocViewMode = useIsDocOperationViewMode(mode)
  const isRawViewMode = useIsRawOperationViewMode(mode)
  const isGraphViewMode = useIsGraphOperationViewMode(mode)

  const isPlaygroundMode = useIsPlaygroundMode()
  const isExamplesMode = useIsExamplesMode()
  const isPlaygroundSidebarOpen = useIsPlaygroundSidebarOpen()

  const operationType = useMemo(
    () => (
      checkIfGraphQLOperation(changedOperation)
        ? changedOperation.type
        : checkIfGraphQLOperation(originOperation)
          ? originOperation.type
          : undefined
    ),
    [changedOperation, originOperation],
  )
  const operationName = useMemo(
    () => (
      checkIfGraphQLOperation(changedOperation)
        ? changedOperation.method
        : checkIfGraphQLOperation(originOperation)
          ? originOperation.method
          : undefined
    ),
    [changedOperation, originOperation],
  )

  const [documentWithOriginOriginOperation] = usePublishedDocumentRaw({
    packageKey: originPackageKey,
    versionKey: originVersionKey,
    slug: originOperation?.documentId ?? '',
    enabled: isRawViewMode && isGraphQLOperation,
  })

  const [documentWithChangedGraphQlOperation] = usePublishedDocumentRaw({
    packageKey: changedPackageKey,
    versionKey: changedVersionKey,
    slug: changedOperation?.documentId ?? '',
    enabled: isRawViewMode && isGraphQLOperation,
  })

  const { productionMode } = useSystemInfo()

  const setChangesLoadingStatus = useSetChangesLoadingStatus()
  useEffect(() => {
    setChangesLoadingStatus && setChangesLoadingStatus(isLoading)
  }, [isLoading, setChangesLoadingStatus])

  useSelectOperationTags(originOperation, changedOperation)

  const [filters] = useSeverityFiltersSearchParam()
  const comparisonMode = isComparisonMode(displayMode)
  const [fileViewMode = YAML_FILE_VIEW_MODE, setFileViewMode] = useFileViewMode()

  const [originOperationContent, changedOperationContent] = useOperationsPairStringified(
    isGraphQLOperation
      ? { originOperation: documentWithOriginOriginOperation, changedOperation: documentWithChangedGraphQlOperation }
      : undefined,
    {
      originOperation: originOperation,
      changedOperation: changedOperation,
      enabled: isAsyncApiSpecification(normalizedChangedOperation) || isPlaygroundMode || isExamplesMode,
    },
  )

  const originGraphQlOperationContent = useRawGraphQlCroppedToSingleOperationRawGraphQl(originOperationContent, operationType, operationName)
  const changedGraphQlOperationContent = useRawGraphQlCroppedToSingleOperationRawGraphQl(changedOperationContent, operationType, operationName)

  const [, setPlaygroundViewMode] = useSidebarPlaygroundViewMode()
  const [navigationDetails] = useOperationNavigationDetails()

  const breadcrumbsData = useBreadcrumbsData()
  let operationContentElement

  const graphItemSelect = useCallback((isSelected: boolean) => {
    if (isSelected) {
      setPlaygroundViewMode(undefined)
    }
  }, [setPlaygroundViewMode])

  const customServersPackageMap = useCustomServersContext()
  const currentServers = customServersPackageMap?.[packageId]

  const {
    values: [originValueForRawSpecView, changedValueForRawSpecView],
    extension,
    type,
  } = getFileDetails(
    apiType,
    fileViewMode,
    originGraphQlOperationContent || originOperationContent,
    changedGraphQlOperationContent || changedOperationContent,
  )

  const rawViewActions = useMemo(
    () => API_TYPE_RAW_VIEW_ACTIONS_MAP[apiType](fileViewMode, setFileViewMode),
    [apiType, fileViewMode, setFileViewMode],
  )

  const apiDiffResult = useApiDiffResult()
  const isApiDiffResultLoading = useIsApiDiffResultLoading()
  const setApiDiffResult = useSetApiDiffResult()

  const mergedDocument = useMemo(
    () => {
      // TODO 13.11.25 // Separate to OperationView and OperationDiffView components
      if (!comparisonMode) {
        return normalizedChangedOperation ?? normalizedOriginOperation
      }

      return apiDiffResult?.merged
    },
    [comparisonMode, apiDiffResult?.merged, normalizedChangedOperation, normalizedOriginOperation],
  )

  useEffect(() => {
    return () => {
      setApiDiffResult(undefined)
    }
  }, [setApiDiffResult])

  if (isLoading || isApiDiffResultLoading) {
    operationContentElement = <LoadingIndicator />
  } else if (
    !normalizedChangedOperation &&
    !normalizedOriginOperation &&
    !apiDiffResult?.merged
  ) {
    return (
      <Placeholder
        invisible={false}
        area={CONTENT_PLACEHOLDER_AREA}
        message="Please select an operation"
      />
    )
  } else if (!isOperationExist) {
    return (
      <Placeholder
        invisible={false}
        variant={SEARCH_PLACEHOLDER_VARIANT}
        area={CONTENT_PLACEHOLDER_AREA}
        message="No operations"
      />
    )
  } else {
    operationContentElement = (
      comparisonMode
        ? (
          <Box pl={3} pr={2} height="inherit">
            <OperationsSwapper
              displayMode={displayMode}
              breadcrumbsData={breadcrumbsData}
              actions={isRawViewMode && rawViewActions}
              swapperBreadcrumbsBeforeComponent={
                <WarningApiProcessorVersion
                  packageKey={originPackageKey}
                  versionKey={originVersionKey}
                />
              }
              swapperBreadcrumbsAfterComponent={
                <WarningApiProcessorVersion
                  packageKey={changedPackageKey}
                  versionKey={changedVersionKey}
                />
              }
            />
            {isDocViewMode && !!mergedDocument && (
              <OperationView
                apiType={apiType as ApiType}
                displayMode={displayMode}
                comparisonMode={comparisonMode}
                productionMode={productionMode}
                mergedDocument={mergedDocument}
                // diffs specific
                filters={filters}
                // GraphQL specific
                operationType={operationType}
                operationName={operationName}
              />
            )}
            {isRawViewMode && (
              <RawSpecDiffView
                beforeValue={originValueForRawSpecView}
                afterValue={changedValueForRawSpecView}
                extension={extension}
                type={type}
              />
            )}
          </Box>
        )
        : (
          <OperationWithPlayground
            changedOperationContent={changedOperationContent}
            customServers={JSON.stringify(currentServers)}
            operationComponent={
              <Box
                position="relative"
                pt={isRawViewMode || isGraphViewMode ? 0 : 1}
                height="100%"
              >
                {isDocViewMode && apiType !== API_TYPE_ASYNCAPI && (  //TODO: remove after doc view for AsyncAPI is implemented
                  <OperationView
                    apiType={apiType as ApiType}
                    schemaViewMode={schemaViewMode}
                    hideTryIt
                    hideExamples
                    comparisonMode={comparisonMode}
                    productionMode={productionMode}
                    navigationDetails={navigationDetails}
                    operationModels={operationModels}
                    mergedDocument={mergedDocument}
                    // GraphQL specific
                    operationType={operationType}
                    operationName={operationName}
                  />
                )}
                {(isRawViewMode || (isDocViewMode && apiType === API_TYPE_ASYNCAPI)) && (
                  <Box
                    display={isRawViewMode ? 'grid' : 'inherit'}
                    height={isRawViewMode ? 'inherit' : '100%'}
                    overflow="scroll"
                  >
                    {!!rawViewActions && (
                      <OperationSubheader actions={rawViewActions} />
                    )}
                    <RawSpecView
                      value={changedValueForRawSpecView}
                      extension={extension}
                      type={type}
                    />
                  </Box>
                )}
                {isGraphViewMode && (
                  <OperationModelsGraph
                    operationData={changedOperation}
                    onSelect={graphItemSelect}
                    hideContextPanel={isPlaygroundSidebarOpen}
                  />
                )}
              </Box>
            }
            isPlaygroundMode={isPlaygroundMode}
            isExamplesMode={isExamplesMode}
            isPlaygroundSidebarOpen={isPlaygroundSidebarOpen}
          />
        )
    )
  }

  return (
    <Box sx={{
      height: '100%',
      overflow: 'hidden',
      pb: paddingBottom ? paddingBottom : 0,
      position: 'relative',
    }}>
      {operationContentElement}
    </Box>
  )
})

const API_TYPE_RAW_VIEW_ACTIONS_MAP: Record<ApiType, (fileViewMode: FileViewMode, setFileViewMode: (value: FileViewMode) => void) => ReactNode | null> = {
  [API_TYPE_REST]: (fileViewMode, setFileViewMode) => (
    <Toggler<FileViewMode>
      modes={FILE_FORMAT_VIEW}
      mode={fileViewMode}
      onChange={setFileViewMode}
    />
  ),
  [API_TYPE_GRAPHQL]: () => null,
  [API_TYPE_ASYNCAPI]: () => null,
}
