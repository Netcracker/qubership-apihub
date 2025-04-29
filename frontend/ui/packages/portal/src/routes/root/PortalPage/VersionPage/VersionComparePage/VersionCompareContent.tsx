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
import { Box, Card, CardContent, Grid, ListItem } from '@mui/material'
import { type ChangeSummary } from '@netcracker/qubership-apihub-api-processor'
import { ChangeSeverityIndicator } from '@netcracker/qubership-apihub-ui-shared/components/ChangeSeverityIndicator'
import { Changes } from '@netcracker/qubership-apihub-ui-shared/components/Changes'
import { LoadingIndicator } from '@netcracker/qubership-apihub-ui-shared/components/LoadingIndicator'
import { OperationTitleWithMeta } from '@netcracker/qubership-apihub-ui-shared/components/Operations/OperationTitleWithMeta'
import { CONTENT_PLACEHOLDER_AREA, Placeholder } from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'
import type { ChangeSeverity } from '@netcracker/qubership-apihub-ui-shared/entities/change-severities'
import {
  ACTION_TYPE_COLOR_MAP,
  ADD_ACTION_TYPE,
  REMOVE_ACTION_TYPE,
} from '@netcracker/qubership-apihub-ui-shared/entities/change-severities'
import type { Operation } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import type { OperationChangeBase } from '@netcracker/qubership-apihub-ui-shared/entities/version-changelog'
import {
  useSeverityFiltersSearchParam,
} from '@netcracker/qubership-apihub-ui-shared/hooks/change-severities/useSeverityFiltersSearchParam'
import { isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import { filterChangesBySeverity, getMajorSeverity } from '@netcracker/qubership-apihub-ui-shared/utils/change-severities'
import {
  API_TYPE_SEARCH_PARAM,
  FILTERS_SEARCH_PARAM,
  OPERATION_SEARCH_PARAM,
  optionalSearchParams,
  PACKAGE_SEARCH_PARAM,
  REF_SEARCH_PARAM,
  TAG_SEARCH_PARAM,
  VERSION_SEARCH_PARAM,
} from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { format } from '@netcracker/qubership-apihub-ui-shared/utils/strings'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/utils/types'
import { getSplittedVersionKey } from '@netcracker/qubership-apihub-ui-shared/utils/versions'
import {
  usePagedDetailedVersionChangelog,
} from '@netcracker/qubership-apihub-ui-shared/widgets/ChangesViewWidget/api/useCommonPagedVersionChangelog'
import {
  useDetailedVersionChangelog,
} from '@netcracker/qubership-apihub-ui-shared/widgets/ChangesViewWidget/api/useDetailedVersionChangelog'
import type { FC } from 'react'
import { memo, useCallback, useEffect, useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import { useNavigation } from '../../../../NavigationProvider'
import { useBackwardLocation } from '../../../useBackwardLocation'
import { useIsPackageFromDashboard } from '../../useIsPackageFromDashboard'
import { useRefSearchParam } from '../../useRefSearchParam'
import { useChangesLoadingStatus, useSetChangesLoadingStatus } from '../ChangesLoadingStatusProvider'
import { useChangesSummaryContext } from '../ChangesSummaryProvider'
import { useBreadcrumbsData } from '../ComparedPackagesBreadcrumbsProvider'
import { ComparisonSwapper } from '../ComparisonSwapper'
import { useVersionsComparisonGlobalParams } from '../VersionsComparisonGlobalParams'
import { VERSION_SWAPPER_HEIGHT } from '../shared-styles'
import { useTagSearchFilter } from '../useTagSearchFilter'

export function isRevisionCompare(originVersion: Key, changedVersion: Key): boolean {
  const {
    versionKey: originVersionKey,
    revisionKey: originRevisionKey,
  } = getSplittedVersionKey(originVersion)
  const {
    versionKey: changedVersionKey,
    revisionKey: changedRevisionKey,
  } = getSplittedVersionKey(changedVersion)

  return originVersionKey === changedVersionKey && originRevisionKey !== changedRevisionKey
}

export const VersionCompareContent: FC = memo(() => {
  const location = useBackwardLocation()
  const backwardLocation = useBackwardLocationContext()
  const setBackwardLocation = useSetBackwardLocationContext()

  const { isPackageFromDashboard } = useIsPackageFromDashboard()

  const {
    originPackageKey,
    originVersionKey,
    changedPackageKey,
    changedVersionKey,
    apiType,
  } = useVersionsComparisonGlobalParams()
  const [refPackageKey] = useRefSearchParam()
  const [tag] = useTagSearchFilter()

  const { showCompareVersionsDialog, showCompareRevisionsDialog } = useEventBus()

  const showCompareDialog = isRevisionCompare(originVersionKey!, changedVersionKey!)
    ? showCompareRevisionsDialog
    : showCompareVersionsDialog

  const [changesSummary, isContextValid] = useChangesSummaryContext({
    changedPackageKey: changedPackageKey,
    changedVersionKey: changedVersionKey,
    originPackageKey: originPackageKey,
    originVersionKey: originVersionKey,
  })
  const breadcrumbsData = useBreadcrumbsData()

  const [packageChangelog, isLoading, fetchNextPage, isNextPageFetching, hasNextPage] = usePagedDetailedVersionChangelog({
    packageKey: changedPackageKey!,
    versionKey: changedVersionKey!,
    previousVersionPackageKey: originPackageKey,
    previousVersionKey: originVersionKey,
    tag: tag,
    apiType: apiType,
    packageIdFilter: refPackageKey,
    enabled: !!changesSummary && isContextValid,
    page: 1,
    limit: 100,
  })
  const flatPackageChangelog = useDetailedVersionChangelog(packageChangelog)
  const packageChanges: ReadonlyArray<OperationChangeBase> = flatPackageChangelog.operations

  useEffect(() => {
    // Fetch next page
    if (!isLoading && !isNextPageFetching && hasNextPage) {
      fetchNextPage()
    }
    // eslint-disable-next-line
  }, [packageChangelog])

  const changesLoadingStatus = useChangesLoadingStatus()
  const setChangesLoadingStatus = useSetChangesLoadingStatus()
  useEffect(() => {
    setChangesLoadingStatus(!changesSummary || isLoading)
  }, [changesSummary, isLoading, setChangesLoadingStatus])

  const [filters] = useSeverityFiltersSearchParam()
  const filteredPackageChanges = useMemo(
    () => packageChanges.filter(change => filterChangesBySeverity(filters, change.changeSummary)),
    [filters, packageChanges],
  )

  const onClickOperationChange = (): void => {
    setBackwardLocation({ ...backwardLocation, fromOperationsComparison: location })
  }

  const { navigateToComparison } = useNavigation()

  const handleSwap = useCallback(() => {
    const searchParams = {
      [VERSION_SEARCH_PARAM]: { value: changedVersionKey },
      [PACKAGE_SEARCH_PARAM]: { value: originPackageKey !== changedPackageKey ? encodeURIComponent(changedPackageKey!) : '' },
      [REF_SEARCH_PARAM]: { value: isPackageFromDashboard ? refPackageKey : undefined },
      [API_TYPE_SEARCH_PARAM]: { value: apiType },
      [TAG_SEARCH_PARAM]: { value: tag },
      [FILTERS_SEARCH_PARAM]: { value: filters.join() },
    }

    navigateToComparison({
      packageKey: originPackageKey ?? changedPackageKey!,
      versionKey: originVersionKey!,
      search: searchParams,
    })
  }, [apiType, changedPackageKey, changedVersionKey, filters, isPackageFromDashboard, navigateToComparison, originPackageKey, originVersionKey, refPackageKey, tag])

  if (changesLoadingStatus) {
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
      />
      <Placeholder
        invisible={isNotEmpty(filteredPackageChanges)}
        area={CONTENT_PLACEHOLDER_AREA}
        message="No differences"
        testId="NoDifferencesPlaceholder">
        <CardContent
          sx={{
            display: 'flex',
            height: `calc(100% - ${VERSION_SWAPPER_HEIGHT})`,
            flexDirection: 'column',
            overflow: 'auto',
            pt: 0,
          }}
        >
          <Box pt={2}>
            {
              filteredPackageChanges.map((operationChange) => {
                const {
                  action,
                  changeSummary,
                  currentOperation,
                  previousOperation,
                } = operationChange

                const severity = getMajorSeverity(changeSummary)

                const comparingSearchParams = optionalSearchParams({
                  [PACKAGE_SEARCH_PARAM]: { value: changedPackageKey === originPackageKey ? '' : encodeURIComponent(originPackageKey!) },
                  [VERSION_SEARCH_PARAM]: { value: originVersionKey! },
                  [REF_SEARCH_PARAM]: { value: refPackageKey },
                  [OPERATION_SEARCH_PARAM]: {
                    value: currentOperation?.operationKey
                      ? previousOperation?.operationKey
                      : undefined,
                  },
                })

                return (
                  <Grid
                    key={`compared-operations-${previousOperation?.operationKey}-${currentOperation?.operationKey}`}
                    component={NavLink}
                    container
                    spacing={0}
                    sx={{
                      textDecoration: 'none',
                      color: '#353C4E',
                      height: '70px',
                      marginBottom: '8px',
                      position: 'relative',
                    }}
                    to={{
                      pathname: format(
                        '/portal/packages/{}/{}/compare/{}/{}',
                        encodeURIComponent(changedPackageKey!),
                        encodeURIComponent(changedVersionKey!),
                        `${apiType}`,
                        encodeURIComponent(
                          currentOperation?.operationKey ??
                          previousOperation!.operationKey,
                        ),
                      ),
                      search: `${comparingSearchParams}`,
                    }}
                    onClick={onClickOperationChange}
                    data-testid="ComparisonRow"
                  >
                    <Grid
                      item
                      xs={6}
                      sx={{
                        borderRight: '1px solid #D5DCE3',
                        background: ACTION_TYPE_COLOR_MAP[action] ?? '#F2F3F5',
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
                        <OperationChangesSummary
                          key={`original-${previousOperation?.operationKey}`}
                          operation={action !== ADD_ACTION_TYPE ? previousOperation : undefined}
                        />
                      </Box>
                    </Grid>

                    <Grid
                      item
                      xs={6}
                      sx={{ background: ACTION_TYPE_COLOR_MAP[action] ?? '#F2F3F5' }}
                      data-testid="RightComparisonSummary"
                    >
                      <OperationChangesSummary
                        key={`changed-${currentOperation?.operationKey}`}
                        operation={action !== REMOVE_ACTION_TYPE ? currentOperation : undefined}
                        changes={changeSummary}
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

type OperationChangesSummaryProps = {
  operation?: Operation
  changes?: ChangeSummary
}

const OperationChangesSummary: FC<OperationChangesSummaryProps> = memo<OperationChangesSummaryProps>(({
  operation,
  changes,
}) => {
  return (
    <ListItem
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',

        padding: changes ? '2px 16px' : '8px 16px',
        paddingTop: operation ? 0 : '44px',
        overflow: 'hidden',
        gap: '2px',
      }}
    >
      {operation && <OperationTitleWithMeta operation={operation} />}
      {changes && (
        <Changes value={changes} mode="compact" />
      )}
    </ListItem>
  )
})

