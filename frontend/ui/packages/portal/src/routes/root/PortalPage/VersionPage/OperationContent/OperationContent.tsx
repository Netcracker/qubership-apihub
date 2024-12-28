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

import type { FC, ReactNode } from 'react'
import { memo, useCallback, useEffect, useMemo } from 'react'
import { Box } from '@mui/material'
import { OperationsSwapper } from './OperationsSwapper'
import type { OperationDisplayMode } from './OperationView/OperationDisplayMode'
import { DEFAULT_DISPLAY_MODE, isComparisonMode } from './OperationView/OperationDisplayMode'
import { useOperationViewMode } from '../useOperationViewMode'
import { useSetChangesLoadingStatus } from '../ChangesLoadingStatusProvider'
import { useBreadcrumbsData } from '../ComparedPackagesBreadcrumbsProvider'
import { useParams } from 'react-router-dom'
import { OperationWithPlayground } from './OperationWithPlayground'
import { useSelectOperationTags } from './useSelectOperationTags'
import { useFileViewMode } from '../useFileViewMode'
import { OperationSubheader } from './OperationSubheader'
import { useIsExamplesMode, useIsPlaygroundMode, useIsPlaygroundSidebarOpen } from './usePlaygroundSidebarMode'
import { useSidebarPlaygroundViewMode } from '../useSidebarPlaygroundViewMode'
import { OperationModelsGraph } from './OperationModelsGraph'
import { useOperationNavigationDetails } from '../../../OperationNavigationDataProvider'
import type { OperationData } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import { DEFAULT_API_TYPE } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import { useSystemInfo } from '@netcracker/qubership-apihub-ui-shared/features/system-info'
import {
  useSeverityFiltersSearchParam,
} from '@netcracker/qubership-apihub-ui-shared/hooks/change-severities/useSeverityFiltersSearchParam'
import { GRAPH_VIEW_MODE } from '@netcracker/qubership-apihub-ui-shared/entities/operation-view-mode'
import { FILE_FORMAT_VIEW, YAML_FILE_VIEW_MODE } from '@netcracker/qubership-apihub-ui-shared/entities/file-format-view'
import { useOperationsPairAsStrings } from '@netcracker/qubership-apihub-ui-shared/hooks/operations/useOperationsPairAsStrings'
import {
  useIsDocOperationViewMode,
  useIsRawOperationViewMode,
} from '@netcracker/qubership-apihub-ui-shared/hooks/operations/useOperationMode'
import {
  useCustomServersContext,
} from '@apihub/routes/root/PortalPage/VersionPage/OperationContent/Playground/CustomServersProvider'
import { getFileDetails } from '@apihub/utils/file-details'
import { LoadingIndicator } from '@netcracker/qubership-apihub-ui-shared/components/LoadingIndicator'
import {
  CONTENT_PLACEHOLDER_AREA,
  Placeholder,
  SEARCH_PLACEHOLDER_VARIANT,
} from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'
import { OperationView } from '@apihub/routes/root/PortalPage/VersionPage/OperationContent/OperationView/OperationView'
import { RawSpecView } from '@netcracker/qubership-apihub-ui-shared/components/SpecificationDialog/RawSpecView'
import type { OpenApiData } from '@apihub/entities/operation-structure'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import { API_TYPE_GRAPHQL, API_TYPE_REST } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import { normalizeOpenApiDocument } from '@netcracker/qubership-apihub-ui-shared/utils/normalize'
import { useApiDiffResult, useIsApiDiffResultLoading } from '@apihub/routes/root/ApiDiffResultProvider'
import { Toggler } from '@netcracker/qubership-apihub-ui-shared/components/Toggler'
import { RawSpecDiffView } from '@netcracker/qubership-apihub-ui-shared/components/RawSpecDiffView'
import { removeComponents } from '@netcracker/qubership-apihub-api-processor'

export type OperationContentProps = {
  changedOperation?: OperationData
  originOperation?: OperationData
  isOperationExist?: boolean
  displayMode?: OperationDisplayMode
  paddingBottom?: string | number
  isLoading: boolean
  operationModels?: OpenApiData
}

export const OperationContent: FC<OperationContentProps> = memo<OperationContentProps>(props => {
  const {
    changedOperation,
    originOperation,
    isOperationExist = true,
    displayMode = DEFAULT_DISPLAY_MODE,
    isLoading,
    paddingBottom,
    operationModels,
  } = props
  const { packageId = '', apiType = DEFAULT_API_TYPE } = useParams<{ packageId: string; apiType: ApiType }>()
  const { productionMode } = useSystemInfo()

  const setChangesLoadingStatus = useSetChangesLoadingStatus()
  useEffect(() => {
    setChangesLoadingStatus && setChangesLoadingStatus(isLoading)
  }, [isLoading, setChangesLoadingStatus])

  useSelectOperationTags(originOperation, changedOperation)

  const [filters] = useSeverityFiltersSearchParam()
  const comparisonMode = isComparisonMode(displayMode)
  const { mode, schemaViewMode } = useOperationViewMode()
  const [fileViewMode = YAML_FILE_VIEW_MODE, setFileViewMode] = useFileViewMode()

  const [changedOperationContent, originOperationContent] = useOperationsPairAsStrings(changedOperation, originOperation)
  const [, setPlaygroundViewMode] = useSidebarPlaygroundViewMode()
  const [navigationDetails] = useOperationNavigationDetails()

  const breadcrumbsData = useBreadcrumbsData()

  let operationContentElement
  const isDocViewMode = useIsDocOperationViewMode(mode)
  const isRawViewMode = useIsRawOperationViewMode(mode)
  const isGraphViewMode = mode === GRAPH_VIEW_MODE

  const isPlaygroundMode = useIsPlaygroundMode()
  const isExamplesMode = useIsExamplesMode()
  const isPlaygroundSidebarOpen = useIsPlaygroundSidebarOpen()

  const graphItemSelect = useCallback((isSelected: boolean) => {
    if (isSelected) {
      setPlaygroundViewMode(undefined)
    }
  }, [setPlaygroundViewMode])

  const customServersPackageMap = useCustomServersContext()
  const currentServers = customServersPackageMap?.[packageId]

  const {
    values: [originalValue, changedValue],
    extension,
    type,
  } = getFileDetails(apiType, fileViewMode, originOperationContent, changedOperationContent)

  const rawViewActions = useMemo(() =>
      API_TYPE_RAW_VIEW_ACTIONS_MAP[apiType](fileViewMode, setFileViewMode),
    [apiType, fileViewMode, setFileViewMode],
  )

  const apiDiffResult = useApiDiffResult()
  const isApiDiffResultLoading = useIsApiDiffResultLoading()

  const mergedDocument = useMemo(
    () => {
      if (!changedOperation?.data && !originOperation?.data) {
        return undefined
      }

      //todo separate to OperationView and OperationDiffView components
      if (!comparisonMode) {
        const existingData = changedOperation?.data ?? originOperation?.data
        const existingOperation = removeComponents(existingData)
        return existingOperation
          ? normalizeOpenApiDocument(existingOperation, existingData)
          : undefined
      }

      return apiDiffResult?.merged
    },
    [changedOperation?.data, comparisonMode, originOperation?.data, apiDiffResult?.merged],
  )

  if (isLoading || isApiDiffResultLoading) {
    operationContentElement = <LoadingIndicator/>
  } else if (!changedOperationContent && !originOperationContent) {
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
        ? <Box pl={3} pr={2} height="inherit">
          <OperationsSwapper
            displayMode={displayMode}
            breadcrumbsData={breadcrumbsData}
            actions={isRawViewMode && rawViewActions}
          />
          {isDocViewMode && (
            <OperationView
              apiType={apiType as ApiType}
              originOperation={originOperation}
              changedOperation={changedOperation}
              displayMode={displayMode}
              comparisonMode={comparisonMode}
              productionMode={productionMode}
              mergedDocument={mergedDocument}
              // diffs specific
              filters={filters}
            />
          )}
          {isRawViewMode && (
            <RawSpecDiffView
              beforeValue={originalValue}
              afterValue={changedValue}
              extension={extension}
              type={type}
            />
          )}
        </Box>
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
                {isDocViewMode && (
                  <OperationView
                    apiType={apiType as ApiType}
                    changedOperation={changedOperation}
                    schemaViewMode={schemaViewMode}
                    hideTryIt
                    hideExamples
                    comparisonMode={comparisonMode}
                    productionMode={productionMode}
                    navigationDetails={navigationDetails}
                    operationModels={operationModels}
                    mergedDocument={mergedDocument}
                  />
                )}
                {isRawViewMode && (
                  <Box
                    display={isRawViewMode ? 'grid' : 'inherit'}
                    height={isRawViewMode ? 'inherit' : '100%'}
                    overflow="scroll"
                  >
                    {!!rawViewActions && (
                      <OperationSubheader actions={rawViewActions}/>
                    )}
                    <RawSpecView
                      value={changedValue}
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

const API_TYPE_RAW_VIEW_ACTIONS_MAP: Record<ApiType, (fileViewMode: string, setFileViewMode: (value: string) => void) => ReactNode | null> = {
  [API_TYPE_REST]: (fileViewMode, setFileViewMode) => (
    <Toggler
      modes={FILE_FORMAT_VIEW}
      mode={fileViewMode}
      onChange={setFileViewMode}
    />
  ),
  [API_TYPE_GRAPHQL]: () => null,
}
