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

import { useBackwardLocationContext, useSetBackwardLocationContext } from '@apihub/routes/BackwardLocationProvider'
import { useEventBus } from '@apihub/routes/EventBusProvider'
import { isRevisionCompare } from '@apihub/routes/root/PortalPage/VersionPage/VersionComparePage/VersionCompareContent'
import { getDefaultApiType } from '@apihub/utils/operation-types'
import { Box, Card, CardContent, Grid, ListItem, ListItemText, Typography } from '@mui/material'
import { styled } from '@mui/material/styles'
import type { OperationType } from '@netcracker/qubership-apihub-api-processor'
import { calculateTotalChangeSummary, EMPTY_CHANGE_SUMMARY } from '@netcracker/qubership-apihub-api-processor'
import { ChangeSeverityIndicator } from '@netcracker/qubership-apihub-ui-shared/components/ChangeSeverityIndicator'
import { Changes } from '@netcracker/qubership-apihub-ui-shared/components/Changes'
import { VersionStatusChip } from '@netcracker/qubership-apihub-ui-shared/components/VersionStatusChip'
import { LoadingIndicator } from '@netcracker/qubership-apihub-ui-shared/components/LoadingIndicator'
import { OverflowTooltip } from '@netcracker/qubership-apihub-ui-shared/components/OverflowTooltip'
import { CONTENT_PLACEHOLDER_AREA, Placeholder } from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'
import { WarningApiProcessorVersion } from '@netcracker/qubership-apihub-ui-shared/components/WarningApiProcessorVersion'
import { API_TYPE_TITLE_MAP } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import {
  ACTION_TYPE_COLOR_MAP,
  ADD_ACTION_TYPE,
  type ChangeSeverity,
  type ChangesSummary,
  REMOVE_ACTION_TYPE,
} from '@netcracker/qubership-apihub-ui-shared/entities/change-severities'
import {
  CONTRACT_TYPE_DDL,
  CONTRACT_TYPE_TITLE_MAP,
} from '@netcracker/qubership-apihub-ui-shared/entities/contract-types'
import { getComparisonApiTypesFromSummary, type VersionComparisonContractsSummary } from '@netcracker/qubership-apihub-ui-shared/entities/contracts-changes-summary'
import { hasDdlComparisonChanges } from '@netcracker/qubership-apihub-ui-shared/entities/contracts-ddl'
import { calculateAction } from '@netcracker/qubership-apihub-ui-shared/entities/version-changelog'
import type { DashboardComparisonSummary } from '@netcracker/qubership-apihub-ui-shared/entities/version-changes-summary'
import type { VersionStatus } from '@netcracker/qubership-apihub-ui-shared/entities/version-status'
import {
  useSeverityFiltersSearchParam,
} from '@netcracker/qubership-apihub-ui-shared/hooks/change-severities/useSeverityFiltersSearchParam'
import { isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import { getMajorSeverity } from '@netcracker/qubership-apihub-ui-shared/utils/change-severities'
import {
  API_TYPE_SEARCH_PARAM,
  FILTERS_SEARCH_PARAM,
  optionalSearchParams,
  PACKAGE_SEARCH_PARAM,
  REF_SEARCH_PARAM,
  VERSION_SEARCH_PARAM,
} from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { format } from '@netcracker/qubership-apihub-ui-shared/utils/strings'
import { getSplittedVersionKey } from '@netcracker/qubership-apihub-ui-shared/utils/versions'
import type { FC } from 'react'
import { memo, useCallback, useEffect } from 'react'
import { NavLink } from 'react-router-dom'

import { useNavigation } from '../../../../NavigationProvider'
import { useBackwardLocation } from '../../../useBackwardLocation'
import { useIsPackageFromDashboard } from '../../useIsPackageFromDashboard'
import { useChangesLoadingStatus, useSetChangesLoadingStatus } from '../ChangesLoadingStatusProvider'
import { useChangesSummaryFromContext } from '../ChangesSummaryProvider'
import { useBreadcrumbsData } from '../ComparedPackagesBreadcrumbsProvider'
import { ComparisonSwapper } from '../ComparisonSwapper'
import { VERSION_SWAPPER_HEIGHT } from '../shared-styles'
import { useApiTypeSearchParam } from '../useApiTypeSearchParam'
import { useVersionsComparisonGlobalParams } from '../VersionsComparisonGlobalParams'
import { toComparedApiTypeFilter } from './compareApiTypeFilter'
import { useFilteredDashboardChanges } from './useFilteredDashboardChanges'

export const DashboardsCompareContent: FC = memo(() => {
  const location = useBackwardLocation()
  const backwardLocation = useBackwardLocationContext()
  const setBackwardLocation = useSetBackwardLocationContext()

  const { isPackageFromDashboard, refPackageKey } = useIsPackageFromDashboard()
  const { apiType: apiTypeSearchParam } = useApiTypeSearchParam()

  const {
    originPackageKey,
    originVersionKey,
    changedPackageKey,
    changedVersionKey,
  } = useVersionsComparisonGlobalParams()

  const { showCompareVersionsDialog, showCompareRevisionsDialog } = useEventBus()

  const showCompareDialog = isRevisionCompare(originVersionKey!, changedVersionKey!)
    ? showCompareRevisionsDialog
    : showCompareVersionsDialog

  const changesSummary = useChangesSummaryFromContext() as DashboardComparisonSummary
  const breadcrumbsData = useBreadcrumbsData()

  const isLoading = useChangesLoadingStatus()
  const setChangesLoadingStatus = useSetChangesLoadingStatus()
  useEffect(() => {
    setChangesLoadingStatus(!changesSummary)
  }, [changesSummary, setChangesLoadingStatus])

  const [filters] = useSeverityFiltersSearchParam()
  const apiTypeFilter = toComparedApiTypeFilter(apiTypeSearchParam)
  const filteredDashboardChanges = useFilteredDashboardChanges(changesSummary, filters, apiTypeFilter)

  const onPackageChangeClick = (): void => {
    setBackwardLocation({ ...backwardLocation, fromPackagesComparison: location })
  }

  const { navigateToComparison } = useNavigation()

  const handleSwap = useCallback(() => {
    const searchParams = {
      [VERSION_SEARCH_PARAM]: { value: changedVersionKey },
      [PACKAGE_SEARCH_PARAM]: { value: originPackageKey !== changedPackageKey ? encodeURIComponent(changedPackageKey!) : '' },
      [REF_SEARCH_PARAM]: { value: isPackageFromDashboard ? refPackageKey : undefined },
      [API_TYPE_SEARCH_PARAM]: { value: apiTypeSearchParam },
      [FILTERS_SEARCH_PARAM]: { value: filters.join() },
    }

    navigateToComparison({
      packageKey: originPackageKey ?? changedPackageKey!,
      versionKey: originVersionKey!,
      search: searchParams,
    })
  }, [apiTypeSearchParam, changedPackageKey, changedVersionKey, filters, isPackageFromDashboard, navigateToComparison, originPackageKey, originVersionKey, refPackageKey])

  if (isLoading) {
    return (
      <LoadingIndicator />
    )
  }

  return (
    <Card>
      <ComparisonSwapper
        breadcrumbsData={breadcrumbsData}
        handleSwap={handleSwap}
        showCompareDialog={showCompareDialog}
        customComponentBeforeSwapperBreadcrumbs={<WarningApiProcessorVersion packageKey={originPackageKey} versionKey={originVersionKey} />}
        customComponentAfterSwapperBreadcrumbs={<WarningApiProcessorVersion packageKey={changedPackageKey} versionKey={changedVersionKey} />}
      />
      <Placeholder
        invisible={isNotEmpty(filteredDashboardChanges)}
        area={CONTENT_PLACEHOLDER_AREA}
        message="No differences"
        data-testid="NoDifferencesPlaceholder">
        <CardContent
          sx={{
            display: 'flex',
            height: `calc(100% - ${VERSION_SWAPPER_HEIGHT})`,
            flexDirection: 'column',
            overflow: 'auto',
            pt: 0,
          }}
        >
          {/*todo think about unification changes list */}
          <Box pt={2}>
            {
              filteredDashboardChanges.map((refChangesSummary) => {
                const {
                  refKey,
                  version,
                  previousVersion,
                  status,
                  previousStatus,
                  name: title,
                  operationTypes,
                  contractsChangesSummary,
                  parentPackages = [],
                  latestRevision,
                } = refChangesSummary

                const changeSummary = calculateRefChangeSummary(operationTypes, contractsChangesSummary)
                const path = parentPackages.join(' / ')
                const currentAction = calculateAction(version, previousVersion)
                const severity = getMajorSeverity(changeSummary)
                const comparingSearchParams = optionalSearchParams({
                  [PACKAGE_SEARCH_PARAM]: { value: changedPackageKey === originPackageKey ? '' : originPackageKey! },
                  [VERSION_SEARCH_PARAM]: { value: originVersionKey! },
                  [API_TYPE_SEARCH_PARAM]: {
                    value: getDefaultApiType(
                      getComparisonApiTypesFromSummary(operationTypes, contractsChangesSummary),
                    ),
                  },
                  [REF_SEARCH_PARAM]: { value: refKey },
                })

                return (
                  <Grid
                    key={`dashboards-compare-content-filtered-dashboard-changes-grid-${refKey}-${version}-${previousVersion}`}
                    component={NavLink}
                    container
                    spacing={0}
                    sx={{ textDecoration: 'none', color: '#353C4E', marginBottom: '8px', position: 'relative' }}
                    to={{
                      pathname: format(
                        '/portal/packages/{}/{}/compare',
                        encodeURIComponent(changedPackageKey!),
                        encodeURIComponent(changedVersionKey!),
                      ),
                      search: `${comparingSearchParams}`,
                    }}
                    onClick={onPackageChangeClick}
                    data-testid="ComparisonRow"
                  >
                    <Grid
                      item
                      xs={6}
                      sx={{
                        borderRight: '1px solid #D5DCE3',
                        background: ACTION_TYPE_COLOR_MAP[currentAction] ?? '#F2F3F5',
                      }}
                      data-testid="LeftComparisonSummary"
                    >
                      <Box sx={{
                        display: 'flex',
                        flexDirection: 'row',
                      }}>
                        <ChangeSeverityIndicator
                          severity={severity as ChangeSeverity}
                          sx={{
                            alignItems: 'center',
                            display: 'flex',
                            overflow: 'hidden',
                            zIndex: '1',
                            '&:hover': {
                              color: '#FFFFFF',
                              padding: '5px',
                              width: '105px',
                            },
                          }}
                        />
                        <Package
                          key={refKey}
                          value={title && currentAction !== ADD_ACTION_TYPE ? {
                            title: title,
                            version: previousVersion,
                            status: previousStatus,
                            path: path,
                          } : undefined}
                        />
                      </Box>
                    </Grid>

                    <Grid
                      item
                      xs={6}
                      sx={{ background: ACTION_TYPE_COLOR_MAP[currentAction] ?? '#F2F3F5' }}
                      data-testid="RightComparisonSummary"
                    >
                      <Package
                        key={`changed-${refKey}`}
                        value={title && currentAction !== REMOVE_ACTION_TYPE ? {
                          title: title,
                          version: version,
                          latestRevision: latestRevision,
                          status: status,
                          path: path,
                        } : undefined}
                        operationTypes={operationTypes}
                        contractsChangesSummary={contractsChangesSummary}
                      />
                    </Grid>
                  </Grid>
                )
              })
            }
          </Box>
        </CardContent>
      </Placeholder>
    </Card>
  )
})

DashboardsCompareContent.displayName = 'DashboardsCompareContent'

type PackageProps = {
  value?: {
    title?: string
    version?: string
    latestRevision?: boolean
    path?: string
    status?: VersionStatus
  }
  operationTypes?: ReadonlyArray<OperationType>
  contractsChangesSummary?: VersionComparisonContractsSummary
}

const Package: FC<PackageProps> = memo<PackageProps>(({
  value,
  operationTypes,
  contractsChangesSummary,
}) => {
  const { version, path, title, status, latestRevision } = value ?? {}
  const { versionKey } = getSplittedVersionKey(version, latestRevision)
  const showChangeLines = !!operationTypes || hasDdlComparisonChanges(contractsChangesSummary?.ddl)

  const primary = (
    <Box component="span" sx={{ display: 'flex', alignItems: 'center' }}>
      {title && <Typography component="span" noWrap variant="inherit"
        data-testid="PackageVersionTitle">{title} / {versionKey}</Typography>}
      {status && <VersionStatusChip sx={{ ml: 1 }} status={status} data-testid="PackageVersionStatus" />}
    </Box>
  )
  return (
    <PackageListItem
      $showChangeLines={showChangeLines}
      $hasValue={!!value}
    >
      <Box>
        {path && (
          <OverflowTooltip title={path}>
            <Typography component="span" noWrap variant="subtitle2" data-testid="DashboardPath">{path}</Typography>
          </OverflowTooltip>
        )}
      </Box>
      <Box display="flex" gap={1}>
        <ListItemText
          primary={primary}
        />
      </Box>
      {operationTypes?.map(operationTypeChange =>
        <ApiTypeChangeLine
          key={operationTypeChange.apiType}
          component="span"
          data-testid={`ChangesApiType-${operationTypeChange.apiType}`}
        >
          <Typography component="span" noWrap variant="subtitle2">
            {API_TYPE_TITLE_MAP[operationTypeChange.apiType]}:
          </Typography>
          <Changes value={operationTypeChange.changesSummary} mode="compact" />
        </ApiTypeChangeLine>,
      )}
      {hasDdlComparisonChanges(contractsChangesSummary?.ddl) && (
        <ApiTypeChangeLine component="span" data-testid={`ChangesApiType-${CONTRACT_TYPE_DDL}`}>
          <Typography component="span" noWrap variant="subtitle2">
            {CONTRACT_TYPE_TITLE_MAP[CONTRACT_TYPE_DDL]}:
          </Typography>
          <Changes
            value={contractsChangesSummary!.ddl!.changesSummary ?? EMPTY_CHANGE_SUMMARY}
            mode="compact"
          />
        </ApiTypeChangeLine>
      )}
    </PackageListItem>
  )
})

Package.displayName = 'Package'

const ApiTypeChangeLine = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
}))

type PackageListItemProps = {
  $showChangeLines?: boolean
  $hasValue?: boolean
}

const PackageListItem = styled(ListItem, {
  shouldForwardProp: (prop) => prop !== '$showChangeLines' && prop !== '$hasValue',
})<PackageListItemProps>(({ $showChangeLines, $hasValue }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  padding: $showChangeLines ? '2px 16px' : '8px 16px',
  paddingTop: $hasValue ? 0 : '44px',
  overflow: 'hidden',
  gap: '2px',
}))

function calculateRefChangeSummary(
  operationTypes: ReadonlyArray<OperationType>,
  contractsChangesSummary?: VersionComparisonContractsSummary,
): ChangesSummary {
  const summaries = operationTypes.map(type => type.changesSummary ?? EMPTY_CHANGE_SUMMARY)
  if (hasDdlComparisonChanges(contractsChangesSummary?.ddl)) {
    summaries.push(contractsChangesSummary!.ddl!.changesSummary ?? EMPTY_CHANGE_SUMMARY)
  }
  return calculateTotalChangeSummary(summaries)
}
