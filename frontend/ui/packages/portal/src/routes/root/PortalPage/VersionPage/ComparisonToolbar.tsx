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

import type { FC } from 'react'
import { memo, useCallback, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Box, IconButton, Typography } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { ComparisonOperationChangeSeverityFilters } from './ComparisonOperationChangeSeverityFilters'
import { useChangesLoadingStatus } from './ChangesLoadingStatusProvider'
import { ComparisonChangeSeverityFilters } from './ComparisonChangeSeverityFilters'
import { PackageSelector } from './PackageSelector'
import { useIsPackageFromDashboard } from '../useIsPackageFromDashboard'
import { useBreadcrumbsData } from './ComparedPackagesBreadcrumbsProvider'
import { ComparedPackagesBreadcrumbs } from '../../ComparedPackagesBreadcrumbs'
import { ApiTypeSegmentedSelector } from './VersionComparePage/ApiTypeSegmentedSelector'
import { useChangesSummaryFromContext } from './ChangesSummaryProvider'
import { useOperationViewMode } from './useOperationViewMode'
import { getOverviewPath } from '../../../NavigationProvider'
import { OperationViewModeSelector } from './OperationViewModeSelector'
import { useBackwardLocationContext } from '@apihub/routes/BackwardLocationProvider'
import {
  COMPARE_DASHBOARDS_MODE,
  COMPARE_DIFFERENT_OPERATIONS_MODE,
  COMPARE_PACKAGES_MODE,
  COMPARE_SAME_OPERATIONS_MODE,
} from '@apihub/routes/root/PortalPage/VersionPage/OperationContent/OperationView/OperationDisplayMode'
import {
  OPERATION_COMPARE_VIEW_MODES,
  RAW_OPERATION_VIEW_MODE,
} from '@netcracker/qubership-apihub-ui-shared/entities/operation-view-mode'
import { isDashboardComparisonSummary } from '@netcracker/qubership-apihub-ui-shared/entities/version-changes-summary'
import { isApiTypeSelectorShown } from '@apihub/utils/operation-types'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import { API_TYPE_TITLE_MAP, API_TYPES } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import { isLinkedComparedBreadcrumbPathItem } from '@apihub/routes/root/PortalPage/VersionPage/breadcrumbs'
import type { ChangelogAvailable } from '@apihub/routes/root/PortalPage/VersionPage/common-props'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { ChangesTooltipCategory } from '@netcracker/qubership-apihub-ui-shared/components/ChangesTooltip'
import { CATEGORY_OPERATION, CATEGORY_PACKAGE } from '@netcracker/qubership-apihub-ui-shared/components/ChangesTooltip'
import { useApiTypeSearchParam } from '@apihub/routes/root/PortalPage/VersionPage/useApiTypeSearchParam'

export type ComparisonPageToolbarProps = {
  compareToolbarMode: CompareToolbarMode
} & ChangelogAvailable

export const ComparisonToolbar: FC<ComparisonPageToolbarProps> = memo<ComparisonPageToolbarProps>((props) => {
  const { compareToolbarMode, isChangelogAvailable } = props
  const { apiType: apiTypeSearchParam } = useApiTypeSearchParam() // in case of package/dashboard comparison we don't hase apiType in url, we have it in searchParams

  const {
    packageId: mainPackageId,
    versionId: mainVersionId,
    group,
    apiType: operationApiType,
  } = useParams<{
    packageId: Key
    versionId: Key
    group: Key
    apiType: ApiType
  }>()
  const { isPackageFromDashboard } = useIsPackageFromDashboard(true)

  const navigate = useNavigate()
  const backwardLocation = useBackwardLocationContext()

  const breadcrumbsContext = useBreadcrumbsData()
  const commonLinkedBreadcrumbs = breadcrumbsContext?.common.filter(isLinkedComparedBreadcrumbPathItem)

  const isOperationsComparison = [COMPARE_SAME_OPERATIONS_MODE, COMPARE_DIFFERENT_OPERATIONS_MODE].includes(compareToolbarMode)
  const isPackagesComparison = compareToolbarMode === COMPARE_PACKAGES_MODE

  const { mode } = useOperationViewMode()

  const isDashboardsComparison = compareToolbarMode === COMPARE_DASHBOARDS_MODE
  const changesSummary = useChangesSummaryFromContext()
  const showApiTypeSelector = useMemo(
    () => {
      if (!changesSummary || !isDashboardComparisonSummary(changesSummary)) {
        return false
      }

      const allPackagesApiTypes = changesSummary
        .map(({ operationTypes }) => operationTypes.map(typeSummary => typeSummary.apiType))
        .flat()
      const apiTypeSet = new Set(allPackagesApiTypes)
      return isApiTypeSelectorShown(Array.from(apiTypeSet))
    },
    [changesSummary],
  )

  const handleBackClick = useCallback(() => {
    let target = getOverviewPath({ packageKey: mainPackageId!, versionKey: mainVersionId! })
    if (isOperationsComparison) {
      backwardLocation.fromOperationsComparison && (target = { ...backwardLocation.fromOperationsComparison })
    } else if (isPackagesComparison) {
      backwardLocation.fromPackagesComparison && (target = { ...backwardLocation.fromPackagesComparison })
    } else {
      backwardLocation.fromDocumentsComparison && (target = { ...backwardLocation.fromDocumentsComparison })
    }
    navigate(target)
  }, [backwardLocation.fromDocumentsComparison, backwardLocation.fromOperationsComparison, backwardLocation.fromPackagesComparison, isOperationsComparison, isPackagesComparison, mainPackageId, mainVersionId, navigate])

  const changesLoadingStatus = useChangesLoadingStatus()

  const title = useMemo(() => (
    isOperationsComparison
      ? `${TITLE_BY_COMPARE_MODE[compareToolbarMode]} ${API_TYPE_TITLE_MAP[operationApiType as ApiType]}`
      : group
        ? COMPARE_API_BY_GROUPS
        : TITLE_BY_COMPARE_MODE[compareToolbarMode]
  ), [compareToolbarMode, group, isOperationsComparison, operationApiType])

  return (
    <Box sx={COMPARISON_PAGE_TOOLBAR_STYLES} data-testid="ComparisonToolbar">
      <Box display="flex" flexDirection="column">
        <Typography variant="body2">
          <ComparedPackagesBreadcrumbs data={commonLinkedBreadcrumbs}/>
        </Typography>
        <Box display="flex" alignItems="center">
          <IconButton color="primary" onClick={handleBackClick} data-testid="BackButton">
            <ArrowBackIcon/>
          </IconButton>
          <Typography sx={COMPARISON_PAGE_TOOLBAR_TEXT_STYLES}>
            {title}
          </Typography>
          {isPackageFromDashboard && compareToolbarMode !== COMPARE_DIFFERENT_OPERATIONS_MODE && <PackageSelector/>}
        </Box>
      </Box>
      <Box sx={COMPARISON_PAGE_TOOLBAR_ACTIONS_STYLES}>
        {!changesLoadingStatus && (
          isOperationsComparison
            ? <>
              {mode !== RAW_OPERATION_VIEW_MODE && (
                <ComparisonOperationChangeSeverityFilters isChangelogAvailable={isChangelogAvailable}/>
              )}
              <OperationViewModeSelector modes={OPERATION_COMPARE_VIEW_MODES}/>
            </>
            : <>
              <ComparisonChangeSeverityFilters
                category={getChangeSeverityCategory(isDashboardsComparison, isPackagesComparison)}
                apiType={operationApiType ?? API_TYPES.find(type => type.toString() === apiTypeSearchParam)}
              />
              {isDashboardsComparison && showApiTypeSelector && <ApiTypeSegmentedSelector/>}
            </>
        )}
      </Box>
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

