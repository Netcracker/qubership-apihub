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

import { useBackwardLocationContext } from '@apihub/routes/BackwardLocationProvider'
import { isLinkedComparedBreadcrumbPathItem } from '@apihub/routes/root/PortalPage/VersionPage/breadcrumbs'
import { ExportChangesMenu } from '@apihub/routes/root/PortalPage/VersionPage/ExportChangesMenu'
import {
  COMPARE_DASHBOARDS_MODE,
  COMPARE_DIFFERENT_OPERATIONS_MODE,
  COMPARE_PACKAGES_MODE,
  COMPARE_SAME_OPERATIONS_MODE,
} from '@apihub/routes/root/PortalPage/VersionPage/OperationContent/OperationView/OperationDisplayMode'
import { useApiTypeSearchParam } from '@apihub/routes/root/PortalPage/VersionPage/useApiTypeSearchParam'
import { useDownloadChangesAsExcel } from '@apihub/routes/root/PortalPage/VersionPage/useDownloadChangesAsExcel'
import { useDownloadDdlChangesAsExcel } from '@apihub/routes/root/PortalPage/VersionPage/useDownloadDdlChangesAsExcel'
import { useTagSearchFilter } from '@apihub/routes/root/PortalPage/VersionPage/useTagSearchFilter'
import { useVersionSearchParam } from '@apihub/routes/root/useVersionSearchParam'
import { isApiTypeSelectorShown } from '@apihub/utils/operation-types'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { Box, IconButton, Typography } from '@mui/material'
import type { ChangesTooltipCategory } from '@netcracker/qubership-apihub-ui-shared/components/ChangesTooltip'
import { CATEGORY_OPERATION, CATEGORY_PACKAGE } from '@netcracker/qubership-apihub-ui-shared/components/ChangesTooltip'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import { isApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import { CHANGE_SEVERITIES, type ChangesSummary } from '@netcracker/qubership-apihub-ui-shared/entities/change-severities'
import { CONTRACT_TYPE_DDL, getRouteApiTypeTitle, isApiContract } from '@netcracker/qubership-apihub-ui-shared/entities/contract-types'
import { getDashboardComparisonApiTypes } from '@netcracker/qubership-apihub-ui-shared/entities/contracts-changes-summary'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import {
  COMPARE_VIEW_MODES_BY_API_TYPE,
  type CompareViewModeApiType,
  DEFAULT_VIEW_MODE_MAP_BY_API_TYPE,
  OPERATION_COMPARE_VIEW_MODES,
  RAW_OPERATION_VIEW_MODE,
} from '@netcracker/qubership-apihub-ui-shared/entities/operation-view-mode'
import { DEFAULT_API_TYPE } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import type { DdlEntityChangeEntry } from '@netcracker/qubership-apihub-ui-shared/entities/contracts-ddl-changelog'
import type { VersionChanges } from '@netcracker/qubership-apihub-ui-shared/entities/version-changelog'
import { isDashboardComparisonSummary } from '@netcracker/qubership-apihub-ui-shared/entities/version-changes-summary'
import {
  useSeverityFiltersSearchParam,
} from '@netcracker/qubership-apihub-ui-shared/hooks/change-severities/useSeverityFiltersSearchParam'
import {
  usePackageSearchParam,
} from '@netcracker/qubership-apihub-ui-shared/hooks/routes/package/usePackageSearchParam'
import type { FC, ReactNode } from 'react'
import { memo, useCallback, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getOverviewPath } from '../../../NavigationProvider'
import { ComparedPackagesBreadcrumbs } from '../../ComparedPackagesBreadcrumbs'
import { useIsPackageFromDashboard } from '../useIsPackageFromDashboard'
import { useRefSearchParam } from '../useRefSearchParam'
import { useChangesLoadingStatus } from './ChangesLoadingStatusProvider'
import { useChangesSummaryFromContext } from './ChangesSummaryProvider'
import { useBreadcrumbsData } from './ComparedPackagesBreadcrumbsProvider'
import { ComparisonChangeSeverityFilters } from './ComparisonChangeSeverityFilters'
import { ComparisonDdlEntityChangeSeverityFilters } from './ComparisonDdlEntityChangeSeverityFilters'
import { ComparisonOperationChangeSeverityFilters } from './ComparisonOperationChangeSeverityFilters'
import { OperationViewModeSelector } from './OperationViewModeSelector'
import { PackageSelector } from './PackageSelector'
import { useOperationViewMode } from './useOperationViewMode'
import { ApiTypeSegmentedSelector } from './VersionComparePage/ApiTypeSegmentedSelector'
import { toComparedApiType, toComparedApiTypeFilter } from './VersionComparePage/compareApiTypeFilter'

export type InternalDocumentOptions = {
  versionChanges: VersionChanges | undefined
  ddlChanges?: ReadonlyArray<DdlEntityChangeEntry> | undefined
  currentPackageId: Key | undefined
  currentVersionId: Key | undefined
  previousPackageId: Key | undefined
  previousVersionId: Key | undefined
}

export type ComparisonPageToolbarProps = {
  compareToolbarMode: CompareToolbarMode
  internalDocumentOptions?: InternalDocumentOptions
  isOperationsGroupCompare?: boolean
  ddlEntityChangeSummary?: ChangesSummary
  title?: ReactNode
}

export const ComparisonToolbar: FC<ComparisonPageToolbarProps> = memo<ComparisonPageToolbarProps>((props) => {
  const {
    compareToolbarMode,
    internalDocumentOptions,
    isOperationsGroupCompare = false,
    ddlEntityChangeSummary,
    title: titleOverride,
  } = props
  const { apiType: apiTypeSearchParam } = useApiTypeSearchParam()
  const [packageSearchParam] = usePackageSearchParam()// in case of package/dashboard comparison we don't hase apiType in url, we have it in searchParams
  const {
    packageId: mainPackageId,
    versionId: mainVersionId,
    group,
    apiType: operationApiTypeInUrl,
  } = useParams<{
    packageId: Key
    versionId: Key
    group: Key
    apiType: ApiType
  }>()
  const apiTypeFromUrl = operationApiTypeInUrl ?? apiTypeSearchParam
  const operationsApiType: ApiType = isApiType(apiTypeFromUrl) ? apiTypeFromUrl : DEFAULT_API_TYPE
  const comparedApiTypeFilter = toComparedApiTypeFilter(apiTypeFromUrl)
  const comparedApiType = toComparedApiType(apiTypeFromUrl, DEFAULT_API_TYPE)
  const previousVersionPackageId = packageSearchParam ?? mainPackageId

  const { isPackageFromDashboard } = useIsPackageFromDashboard(true)
  const [refPackageId] = useRefSearchParam()
  const [severityFilter] = useSeverityFiltersSearchParam()
  const [selectedTag] = useTagSearchFilter()
  const [previousVersion] = useVersionSearchParam()
  const [downloadChangesAsExcel] = useDownloadChangesAsExcel()
  const [downloadDdlChangesAsExcel] = useDownloadDdlChangesAsExcel()
  const isDdlComparison = apiTypeFromUrl === CONTRACT_TYPE_DDL
  const onDownloadAllChanges = useCallback((): void => {
    if (isDdlComparison) {
      downloadDdlChangesAsExcel({
        packageKey: mainPackageId!,
        version: mainVersionId!,
        previousVersion: previousVersion!,
        previousVersionPackageId: previousVersionPackageId,
      })
      return
    }
    downloadChangesAsExcel({
      packageKey: mainPackageId!,
      version: mainVersionId!,
      apiType: apiTypeFromUrl!,
      previousVersion: previousVersion!,
      previousVersionPackageId: previousVersionPackageId,
    })
  }, [
    downloadChangesAsExcel,
    downloadDdlChangesAsExcel,
    isDdlComparison,
    mainPackageId,
    mainVersionId,
    apiTypeFromUrl,
    previousVersion,
    previousVersionPackageId,
  ])

  const navigate = useNavigate()
  const backwardLocation = useBackwardLocationContext()

  const breadcrumbsContext = useBreadcrumbsData()
  const commonLinkedBreadcrumbs = breadcrumbsContext?.common.filter(isLinkedComparedBreadcrumbPathItem)

  const isEntityComparePage = [COMPARE_SAME_OPERATIONS_MODE, COMPARE_DIFFERENT_OPERATIONS_MODE].includes(compareToolbarMode)
  const isPackagesComparison = compareToolbarMode === COMPARE_PACKAGES_MODE

  const compareViewModeApiType = isApiContract(apiTypeFromUrl ?? '')
    ? apiTypeFromUrl as CompareViewModeApiType
    : undefined
  const defaultViewMode = compareViewModeApiType
    ? DEFAULT_VIEW_MODE_MAP_BY_API_TYPE[compareViewModeApiType](isEntityComparePage)
    : RAW_OPERATION_VIEW_MODE
  const { mode } = useOperationViewMode(defaultViewMode)
  const entityCompareViewModes = compareViewModeApiType
    ? COMPARE_VIEW_MODES_BY_API_TYPE[compareViewModeApiType]
    : OPERATION_COMPARE_VIEW_MODES.get(operationsApiType)!

  const isDashboardsComparison = compareToolbarMode === COMPARE_DASHBOARDS_MODE
  const changesSummary = useChangesSummaryFromContext()
  const showApiTypeSelector = useMemo(
    () => {
      if (!changesSummary || !isDashboardComparisonSummary(changesSummary)) {
        return false
      }

      return isApiTypeSelectorShown(getDashboardComparisonApiTypes(changesSummary))
    },
    [changesSummary],
  )

  const handleBackClick = useCallback(() => {
    let target = getOverviewPath({ packageKey: mainPackageId!, versionKey: mainVersionId! })
    if (isEntityComparePage) {
      backwardLocation.fromOperationsComparison && (target = { ...backwardLocation.fromOperationsComparison })
    } else if (isPackagesComparison) {
      backwardLocation.fromPackagesComparison && (target = { ...backwardLocation.fromPackagesComparison })
    } else {
      backwardLocation.fromDocumentsComparison && (target = { ...backwardLocation.fromDocumentsComparison })
    }
    navigate(target)
  }, [backwardLocation.fromDocumentsComparison, backwardLocation.fromOperationsComparison, backwardLocation.fromPackagesComparison, isEntityComparePage, isPackagesComparison, mainPackageId, mainVersionId, navigate])

  const changesLoadingStatus = useChangesLoadingStatus()

  const defaultTitle = useMemo(() => (
    isEntityComparePage
      ? `${TITLE_BY_COMPARE_MODE[compareToolbarMode]} ${getRouteApiTypeTitle(isDdlComparison ? CONTRACT_TYPE_DDL : operationsApiType)}`
      : group
        ? COMPARE_API_BY_GROUPS
        : TITLE_BY_COMPARE_MODE[compareToolbarMode]
  ), [compareToolbarMode, group, isDdlComparison, isEntityComparePage, operationsApiType])

  return (
    <Box sx={COMPARISON_PAGE_TOOLBAR_STYLES} data-testid="ComparisonToolbar">
      <Box display="flex" flexDirection="column">
        <Box fontSize="0.875rem">
          <ComparedPackagesBreadcrumbs data={commonLinkedBreadcrumbs} />
        </Box>
        <Box display="flex" alignItems="center">
          <IconButton color="primary" onClick={handleBackClick} data-testid="BackButton">
            <ArrowBackIcon />
          </IconButton>
          {titleOverride ?? (
            <Typography sx={COMPARISON_PAGE_TOOLBAR_TEXT_STYLES}>
              {defaultTitle}
            </Typography>
          )}
          {isPackageFromDashboard && compareToolbarMode !== COMPARE_DIFFERENT_OPERATIONS_MODE && <PackageSelector />}
        </Box>
      </Box>
      <Box sx={COMPARISON_PAGE_TOOLBAR_ACTIONS_STYLES}>
        {!changesLoadingStatus && (
          isEntityComparePage
            ? <>
              {mode !== RAW_OPERATION_VIEW_MODE && !isDdlComparison && (
                <ComparisonOperationChangeSeverityFilters
                  internalDocumentOptions={internalDocumentOptions}
                  apiType={operationsApiType}
                />
              )}
              {mode !== RAW_OPERATION_VIEW_MODE && isDdlComparison && (
                <ComparisonDdlEntityChangeSeverityFilters
                  internalDocumentOptions={internalDocumentOptions}
                  ddlEntityChangeSummary={ddlEntityChangeSummary}
                />
              )}
              <OperationViewModeSelector
                defaultValue={defaultViewMode}
                modes={entityCompareViewModes}
              />
            </>
            : <>
              <ComparisonChangeSeverityFilters
                category={getChangeSeverityCategory(isDashboardsComparison, isPackagesComparison)}
                apiType={comparedApiTypeFilter}
              />
              {isDashboardsComparison && showApiTypeSelector && <ApiTypeSegmentedSelector/>}
            </>
        )}
      </Box>
      {!isOperationsGroupCompare &&
        <ExportChangesMenu
          apiType={comparedApiType}
          severityFilter={severityFilter}
          severityChanges={CHANGE_SEVERITIES}
          tag={selectedTag}
          previousVersion={previousVersion}
          previousVersionPackageId={previousVersionPackageId}
          refPackageId={refPackageId}
          onDownloadAllChanges={onDownloadAllChanges}
        />
      }
    </Box>
  )
})

function getChangeSeverityCategory(
  isDashboardsComparison: boolean,
  isPackagesComparison: boolean,
): ChangesTooltipCategory | undefined {
  if (isDashboardsComparison) return CATEGORY_PACKAGE
  if (isPackagesComparison) return CATEGORY_OPERATION
  return undefined
}

const COMPARISON_PAGE_TOOLBAR_STYLES = {
  alignItems: 'center',
  display: 'flex',
  gap: '8px',
  height: '72px',
  pl: 3,
  pr: 3,
}

const COMPARISON_PAGE_TOOLBAR_TEXT_STYLES = {
  fontSize: '18px',
  fontWeight: '600',
  lineHeight: '28px',
  mr: 2,
}

const COMPARISON_PAGE_TOOLBAR_ACTIONS_STYLES = {
  display: 'flex',
  gap: '16px',
  ml: 'auto',
}

export type CompareToolbarMode =
  | typeof COMPARE_SAME_OPERATIONS_MODE
  | typeof COMPARE_DIFFERENT_OPERATIONS_MODE
  | typeof COMPARE_PACKAGES_MODE
  | typeof COMPARE_DASHBOARDS_MODE

const TITLE_BY_COMPARE_MODE = {
  [COMPARE_SAME_OPERATIONS_MODE]: 'Compare',
  [COMPARE_DIFFERENT_OPERATIONS_MODE]: 'Compare',
  [COMPARE_PACKAGES_MODE]: 'Compare Package API',
  [COMPARE_DASHBOARDS_MODE]: 'Compare Packages',
}

const COMPARE_API_BY_GROUPS = 'Compare API by Groups'
