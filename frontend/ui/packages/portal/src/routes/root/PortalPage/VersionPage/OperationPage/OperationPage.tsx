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

import type { FC, ReactElement } from 'react'
import React, { memo, useCallback, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useOperation } from '../useOperation'
import { SelectedOperationTagsProvider } from '../SelectedOperationTagsProvider'
import { usePackageParamsWithRef } from '../../usePackageParamsWithRef'
import { useDocumentSearchParam } from '../useDocumentSearchParam'
import { useOperationsGroupedByTags } from '../useOperationsGroupedByTags'
import { useTextSearchParam } from '../../../useTextSearchParam'
import { useUpdateRecentOperations } from './useUpdateRecentOperations'
import { useNavigation } from '../../../../NavigationProvider'
import { usePackage } from '../../../usePackage'
import { useSidebarPlaygroundViewMode } from '../useSidebarPlaygroundViewMode'
import { getOperationLink } from '../useNavigateToOperation'
import { useRecentOperations } from '../../../RecentOperationsProvider'
import { PackageBreadcrumbs } from '../../../PackageBreadcrumbs'
import { OperationToolbarHeader } from './OperationToolbarHeader'
import { OperationToolbarActions } from './OperationToolbarActions'
import { useOpenApiVisitor } from './useOpenApiVisitor'
import { useOperationSearchParams } from '../useOperationSearchParams'
import { ModelUsagesDialog } from './ModelUsagesDialog'
import { useOperationsWithSameModel } from './useOperationsWithSameModel'
import { useOperationNavigationDetails } from '../../../OperationNavigationDataProvider'
import { useOperationViewMode } from '../useOperationViewMode'
import type { OperationData } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import { DEFAULT_API_TYPE } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import { useEventBus } from '@apihub/routes/EventBusProvider'
import { groupOperationsByTags, handleOperationTags } from '@apihub/utils/operations'
import { useBackwardLocationContext } from '@apihub/routes/BackwardLocationProvider'
import { PACKAGE_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import type {
  VisitorNavigationDetails,
} from '@netcracker/qubership-apihub-ui-shared/components/SchemaGraphView/oasToClassDiagramService'
import type { SectionKey } from '@apihub/components/OperationModelList/OperationModelList'
import { OperationModelList } from '@apihub/components/OperationModelList/OperationModelList'
import type { OpenApiData } from '@apihub/entities/operation-structure'
import { OPEN_API_SECTION_PARAMETERS } from '@apihub/entities/operation-structure'
import { GRAPH_VIEW_MODE } from '@netcracker/qubership-apihub-ui-shared/entities/operation-view-mode'
import {
  CustomServersProvider,
} from '@apihub/routes/root/PortalPage/VersionPage/OperationContent/Playground/CustomServersProvider'
import { PageLayout } from '@netcracker/qubership-apihub-ui-shared/components/PageLayout'
import { Toolbar } from '@netcracker/qubership-apihub-ui-shared/components/Toolbar'
import { SidebarPanel } from '@netcracker/qubership-apihub-ui-shared/components/Panels/SidebarPanel'
import { OperationContent } from '@apihub/routes/root/PortalPage/VersionPage/OperationContent/OperationContent'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import { API_TYPE_GRAPHQL, API_TYPE_REST, API_TYPE_TITLE_MAP } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'

// High Order Component //
export const OperationPage: FC = memo(() => {
  const { packageId, versionId, apiType = DEFAULT_API_TYPE, operationId: operationKey } = useParams()
  // TODO 07.08.23 // Make a context!
  const [operationPackageKey, operationPackageVersion] = usePackageParamsWithRef()
  const [documentId] = useDocumentSearchParam()
  const [searchValue = ''] = useTextSearchParam()
  const { mode: viewMode } = useOperationViewMode()
  const { showModelUsagesDialog } = useEventBus()

  const [operationsGroupedByTags, areOperationsLoading] = useOperationsGroupedByTags({
    operationPackageKey: operationPackageKey,
    operationPackageVersion: operationPackageVersion,
    searchValue: searchValue,
    documentId: documentId,
    apiType: apiType as ApiType,
  })

  const { data: changedOperation, isLoading: isOperationLoading } = useOperation({
    packageKey: operationPackageKey,
    versionKey: operationPackageVersion,
    operationKey: operationKey,
    apiType: apiType as ApiType,
    enabled: !areOperationsLoading,
  })

  const operationData = useMemo(() => changedOperation?.data, [changedOperation?.data])
  const visitorData: object | undefined = apiType ? API_TYPE_MODELS_MAP[apiType as ApiType](operationData) : undefined

  const models = useOpenApiVisitor( visitorData )
  useUpdateRecentOperations(changedOperation)
  const recentOperationsData = useRecentOperations()
  const recentOperations = useMemo(
    () => recentOperationsData?.filter(operation => operation?.operationKey !== operationKey && apiType === operation.apiType),
    [apiType, operationKey, recentOperationsData],
  )

  const currentOperationTags = Array.from(handleOperationTags(changedOperation?.tags))
  const relatedOperations = useMemo(
    () => Object.fromEntries(currentOperationTags.map(tag => [
      tag,
      (operationsGroupedByTags[tag] as OperationData[])?.filter(operation => operation.operationKey !== operationKey),
    ])),
    [currentOperationTags, operationKey, operationsGroupedByTags],
  )

  const navigate = useNavigate()
  const { navigateToVersion } = useNavigation()
  const [mainPackageKey] = usePackageParamsWithRef()
  const [mainPackage] = usePackage({ showParents: true })
  const [operationPackage] = usePackage({ packageKey: mainPackageKey })
  const backwardLocation = useBackwardLocationContext()
  const operationSearchParams = useOperationSearchParams()
  const [getOperationsWithSameModel] = useOperationsWithSameModel()
  const [, setNavigationDetails] = useOperationNavigationDetails()

  const isPackage: boolean = operationPackage?.kind === PACKAGE_KIND ?? false
  const showCompareGroups = isPackage && !!operationPackage?.restGroupingPrefix && API_TYPE_SHOW_GROUPS_MAP[apiType as ApiType]

  const handleBackClick = useCallback(() => {
    backwardLocation.fromOperation ? navigate({ ...backwardLocation.fromOperation }) : navigateToVersion({
      packageKey: packageId!,
      versionKey: versionId!,
    })
  }, [navigate, navigateToVersion, backwardLocation, packageId, versionId])

  const prepareLinkFn = useCallback(
    (operation: OperationData) => getOperationLink({
      packageKey: packageId!,
      versionKey: versionId!,
      kind: mainPackage?.kind ?? PACKAGE_KIND,
      operationKey: operation.operationKey,
      apiType: operation.apiType,
      packageRef: operation.packageRef,
      ...operationSearchParams,
    }),
    [mainPackage?.kind, operationSearchParams, packageId, versionId],
  )

  const handleModelUsagesClick = useCallback((modelName: string) => {
    const operationsWithSameModel = getOperationsWithSameModel({
      packageKey: packageId!,
      versionKey: versionId!,
      operationKey: operationKey!,
      apiType: apiType as ApiType,
      modelName: modelName,
    })
    showModelUsagesDialog({
      modelName: modelName,
      usages: operationsWithSameModel.then(groupOperationsByTags),
      prepareLinkFn: prepareLinkFn,
    })
  }, [getOperationsWithSameModel, packageId, versionId, operationKey, apiType, showModelUsagesDialog, prepareLinkFn])

  const [playgroundViewMode = '', setPlaygroundViewMode] = useSidebarPlaygroundViewMode()

  const toolbarTitle = useMemo(
    () => `${API_TYPE_TITLE_MAP[changedOperation?.apiType ?? DEFAULT_API_TYPE]}: ${changedOperation?.title || changedOperation?.operationKey || ''}`,
    [changedOperation?.apiType, changedOperation?.operationKey, changedOperation?.title],
  )

  const onNavigateToOperationSection = useCallback(
    (navigationDetails: VisitorNavigationDetails) => setNavigationDetails(navigationDetails),
    [setNavigationDetails],
  )

  const isSidebarSectionDisabled = useCallback((key: SectionKey) => {
    return key === OPEN_API_SECTION_PARAMETERS && viewMode === GRAPH_VIEW_MODE
  }, [viewMode])

  return (
    <SelectedOperationTagsProvider>
      <CustomServersProvider>
        <PageLayout
          toolbar={
            <Toolbar
              breadcrumbs={
                <PackageBreadcrumbs
                  packageObject={mainPackage}
                  versionKey={versionId}
                  showPackagePath={true}
                />
              }
              header={
                <OperationToolbarHeader
                  title={toolbarTitle}
                  handleBackClick={handleBackClick}
                  isLoading={isOperationLoading}
                  recentOperations={recentOperations}
                  relatedOperations={relatedOperations}
                  isRecentOperationsLoading={false}
                  isRelatedOperationsLoading={areOperationsLoading || isOperationLoading}
                  prepareLinkFn={prepareLinkFn}
                />
              }
              action={
                <OperationToolbarActions
                  playgroundViewMode={playgroundViewMode}
                  setPlaygroundViewMode={setPlaygroundViewMode}
                  apiType={apiType as ApiType}
                  showCompareGroups={showCompareGroups}
                />
              }
            />
          }
          navigation={API_TYPE_NAVIGATION_MAP[apiType as ApiType](
            models,
            isOperationLoading,
            handleModelUsagesClick,
            onNavigateToOperationSection,
            isSidebarSectionDisabled,
          )}
          body={
            <OperationContent
              changedOperation={changedOperation}
              isLoading={isOperationLoading}
              operationModels={models}
            />
          }
        />
      </CustomServersProvider>
      <ModelUsagesDialog/>
    </SelectedOperationTagsProvider>
  )
})

const API_TYPE_NAVIGATION_MAP: Record<ApiType, (
  models: OpenApiData | undefined,
  isOperationLoading: boolean,
  handleModelUsagesClick: (modelName: string) => void,
  onNavigateToOperationSection: (navigationDetails: VisitorNavigationDetails) => void,
  isSidebarSectionDisabled: (key: SectionKey) => boolean,
) => ReactElement | null> = {
  [API_TYPE_REST]: (models, isOperationLoading, handleModelUsagesClick, onNavigateToOperationSection, isSidebarSectionDisabled) => (
    <SidebarPanel
      body={
        <OperationModelList
          models={models}
          isLoading={isOperationLoading}
          onModelUsagesClick={handleModelUsagesClick}
          onNavigate={onNavigateToOperationSection}
          isSectionDisabled={isSidebarSectionDisabled}
        />
      }
    />
  ),
  [API_TYPE_GRAPHQL]: () => null,
}

const API_TYPE_SHOW_GROUPS_MAP: Record<ApiType, boolean> = {
  [API_TYPE_REST]: true,
  [API_TYPE_GRAPHQL]: false,
}

const API_TYPE_MODELS_MAP: Record<ApiType, (operationData: object | undefined) => object | undefined> = {
  [API_TYPE_REST]: (operationData) => operationData,
  [API_TYPE_GRAPHQL]: () => undefined,
}
