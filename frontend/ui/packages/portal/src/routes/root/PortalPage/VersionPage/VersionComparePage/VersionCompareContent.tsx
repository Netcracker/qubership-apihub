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

import { useBackwardLocationContext, useSetBackwardLocationContext } from '@portal/routes/BackwardLocationProvider'
import { useEventBus } from '@portal/routes/EventBusProvider'
import { Box, Card, CardContent } from '@mui/material'
import { DdlTableTitleWithMeta } from '@netcracker/qubership-apihub-ui-shared/components/Ddl/DdlTableTitleWithMeta'
import { LoadingIndicator } from '@netcracker/qubership-apihub-ui-shared/components/LoadingIndicator'
import {
  OperationTitleWithMeta,
} from '@netcracker/qubership-apihub-ui-shared/components/Operations/OperationTitleWithMeta'
import { CONTENT_PLACEHOLDER_AREA, Placeholder } from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'
import type { ChangeSeverity } from '@netcracker/qubership-apihub-ui-shared/entities/change-severities'
import {
  ADD_ACTION_TYPE,
  REMOVE_ACTION_TYPE,
} from '@netcracker/qubership-apihub-ui-shared/entities/change-severities'
import { CONTRACT_TYPE_DDL } from '@netcracker/qubership-apihub-ui-shared/entities/contract-types'
import type { DdlEntityChangeEntry } from '@netcracker/qubership-apihub-ui-shared/entities/contracts-ddl-changelog'
import { getDdlChangeEntityId } from '@netcracker/qubership-apihub-ui-shared/entities/contracts-ddl-changelog'
import type { OperationChangeBase } from '@netcracker/qubership-apihub-ui-shared/entities/version-changelog'
import {
  useSeverityFiltersSearchParam,
} from '@netcracker/qubership-apihub-ui-shared/hooks/change-severities/useSeverityFiltersSearchParam'
import { isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import {
  filterChangesBySeverity,
  getMajorSeverity,
} from '@netcracker/qubership-apihub-ui-shared/utils/change-severities'
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
import {
  WarningApiProcessorVersion,
} from '@netcracker/qubership-apihub-ui-shared/components/WarningApiProcessorVersion'
import { useDdlChanges } from '../api/useDdlChanges'
import { useFlatDdlChanges } from '../api/useFlatDdlChanges'
import { useAutoFetchInfinitePages } from '../useAutoFetchInfinitePages'
import { ComparedEntitySplitRow, EntityChangesSummary } from './ComparedEntitySplitRow'

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

  const compareVersionsOptions = useMemo(() => ({
    changedPackageKey: changedPackageKey,
    changedVersionKey: changedVersionKey,
    originPackageKey: originPackageKey,
    originVersionKey: originVersionKey,
  }), [changedPackageKey, changedVersionKey, originPackageKey, originVersionKey])
  const [changesSummary, isContextValid] = useChangesSummaryContext(compareVersionsOptions)
  const breadcrumbsData = useBreadcrumbsData()
  const [filters] = useSeverityFiltersSearchParam()
  const isDdlComparison = apiType === CONTRACT_TYPE_DDL

  const {
    data: packageChangelog,
    isLoading: areOperationChangesLoading,
    fetchNextPage: fetchNextOperationPage,
    isFetchingNextPage: isNextOperationPageFetching,
    hasNextPage: hasNextOperationPage,
  } = usePagedDetailedVersionChangelog({
    packageKey: changedPackageKey!,
    versionKey: changedVersionKey!,
    previousVersionPackageKey: originPackageKey,
    previousVersionKey: originVersionKey,
    tag: tag,
    apiType: apiType,
    packageIdFilter: refPackageKey,
    enabled: !!changesSummary && isContextValid && !isDdlComparison,
    page: 1,
    limit: 100,
  })
  const flatPackageChangelog = useDetailedVersionChangelog(packageChangelog)
  const packageChanges: ReadonlyArray<OperationChangeBase> = flatPackageChangelog.operations

  const {
    data: ddlChangelog,
    isLoading: areDdlChangesLoading,
    fetchNextPage: fetchNextDdlPage,
    isFetchingNextPage: isNextDdlPageFetching,
    hasNextPage: hasNextDdlPage,
    isChangelogReady: isDdlChangelogReady,
  } = useDdlChanges({
    packageKey: changedPackageKey!,
    versionKey: changedVersionKey!,
    previousVersionPackageKey: originPackageKey,
    previousVersionKey: originVersionKey,
    refPackageId: refPackageKey,
    severityFilters: filters,
    enabled: !!changesSummary && isContextValid && isDdlComparison,
    page: 1,
    limit: 100,
  })
  const flatDdlChangelog = useFlatDdlChanges(ddlChangelog, isDdlChangelogReady || !areDdlChangesLoading)
  const ddlChanges: ReadonlyArray<DdlEntityChangeEntry> = flatDdlChangelog.entities

  const isLoading = isDdlComparison ? areDdlChangesLoading : areOperationChangesLoading
  const fetchNextPage = isDdlComparison ? fetchNextDdlPage : fetchNextOperationPage
  const isNextPageFetching = isDdlComparison ? isNextDdlPageFetching : isNextOperationPageFetching
  const hasNextPage = isDdlComparison ? hasNextDdlPage : hasNextOperationPage

  useAutoFetchInfinitePages({
    isLoading: isLoading,
    isFetchingNextPage: isNextPageFetching,
    hasNextPage: hasNextPage,
    fetchNextPage: fetchNextPage,
  })

  const changesLoadingStatus = useChangesLoadingStatus()
  const setChangesLoadingStatus = useSetChangesLoadingStatus()
  useEffect(() => {
    setChangesLoadingStatus(!changesSummary || isLoading)
  }, [changesSummary, isLoading, setChangesLoadingStatus])

  const filteredPackageChanges = useMemo(
    () => packageChanges.filter(change => filterChangesBySeverity(filters, change.changeSummary)),
    [filters, packageChanges],
  )
  const filteredDdlChanges = useMemo(
    () => ddlChanges.filter(change => filterChangesBySeverity(filters, change.changeSummary)),
    [ddlChanges, filters],
  )
  const hasFilteredChanges = isDdlComparison
    ? isNotEmpty(filteredDdlChanges)
    : isNotEmpty(filteredPackageChanges)

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
        customComponentBeforeSwapperBreadcrumbs={<WarningApiProcessorVersion packageKey={originPackageKey} versionKey={originVersionKey} />}
        customComponentAfterSwapperBreadcrumbs={<WarningApiProcessorVersion packageKey={changedPackageKey} versionKey={changedVersionKey} />}
      />
      <Placeholder
        invisible={hasFilteredChanges}
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
          <Box pt={2}>
            {isDdlComparison
              ? filteredDdlChanges.map((ddlChange) => renderDdlComparisonRow(
                ddlChange,
                changedPackageKey!,
                changedVersionKey!,
                originPackageKey!,
                originVersionKey!,
                refPackageKey,
                onClickOperationChange,
              ))
              : filteredPackageChanges.map((operationChange) => renderOperationComparisonRow(
                operationChange,
                changedPackageKey!,
                changedVersionKey!,
                originPackageKey!,
                originVersionKey!,
                refPackageKey,
                apiType!,
                onClickOperationChange,
              ))}
          </Box>
        </CardContent>
      </Placeholder>
    </Card>
  )
})

function renderOperationComparisonRow(
  operationChange: OperationChangeBase,
  changedPackageKey: Key,
  changedVersionKey: Key,
  originPackageKey: Key,
  originVersionKey: Key,
  refPackageKey: Key | undefined,
  apiType: string,
  onClick: () => void,
): JSX.Element {
  const {
    action,
    changeSummary,
    currentOperation,
    previousOperation,
  } = operationChange

  const comparingSearchParams = optionalSearchParams({
    [PACKAGE_SEARCH_PARAM]: { value: changedPackageKey === originPackageKey ? '' : encodeURIComponent(originPackageKey) },
    [VERSION_SEARCH_PARAM]: { value: originVersionKey },
    [REF_SEARCH_PARAM]: { value: refPackageKey },
    [OPERATION_SEARCH_PARAM]: {
      value: currentOperation?.operationKey
        ? previousOperation?.operationKey
        : undefined,
    },
  })

  return (
    <ComparedEntitySplitRow
      key={`compared-operations-${previousOperation?.operationKey}-${currentOperation?.operationKey}`}
      rowKey={`compared-operations-${previousOperation?.operationKey}-${currentOperation?.operationKey}`}
      action={action}
      severity={getMajorSeverity(changeSummary) as ChangeSeverity}
      to={{
        pathname: format(
          '/portal/packages/{}/{}/compare/{}/{}',
          encodeURIComponent(changedPackageKey),
          encodeURIComponent(changedVersionKey),
          `${apiType}`,
          encodeURIComponent(
            currentOperation?.operationKey ??
            previousOperation!.operationKey,
          ),
        ),
        search: `${comparingSearchParams}`,
      }}
      onClick={onClick}
      renderLeft={() => (
        <EntityChangesSummary
          title={
            action !== ADD_ACTION_TYPE && previousOperation
              ? <OperationTitleWithMeta operation={previousOperation} />
              : undefined
          }
          emptyPadding={action === ADD_ACTION_TYPE}
        />
      )}
      renderRight={() => (
        <EntityChangesSummary
          title={
            action !== REMOVE_ACTION_TYPE && currentOperation
              ? <OperationTitleWithMeta operation={currentOperation} />
              : undefined
          }
          changes={changeSummary}
          emptyPadding={action === REMOVE_ACTION_TYPE}
        />
      )}
    />
  )
}

function renderDdlComparisonRow(
  ddlChange: DdlEntityChangeEntry,
  changedPackageKey: Key,
  changedVersionKey: Key,
  originPackageKey: Key,
  originVersionKey: Key,
  refPackageKey: Key | undefined,
  onClick: () => void,
): JSX.Element {
  const { action, changeSummary, ddlEntityData, previousDdlEntityData } = ddlChange
  const entityId = getDdlChangeEntityId(ddlChange)

  const comparingSearchParams = optionalSearchParams({
    [PACKAGE_SEARCH_PARAM]: { value: changedPackageKey === originPackageKey ? '' : encodeURIComponent(originPackageKey) },
    [VERSION_SEARCH_PARAM]: { value: originVersionKey },
    [REF_SEARCH_PARAM]: { value: refPackageKey },
  })

  return (
    <ComparedEntitySplitRow
      key={`compared-ddl-${entityId}`}
      rowKey={`compared-ddl-${entityId}`}
      action={action}
      severity={getMajorSeverity(changeSummary) as ChangeSeverity}
      to={{
        pathname: format(
          '/portal/packages/{}/{}/compare/{}/{}',
          encodeURIComponent(changedPackageKey),
          encodeURIComponent(changedVersionKey),
          CONTRACT_TYPE_DDL,
          encodeURIComponent(entityId),
        ),
        search: `${comparingSearchParams}`,
      }}
      onClick={onClick}
      renderLeft={() => (
        <EntityChangesSummary
          title={
            action !== ADD_ACTION_TYPE && previousDdlEntityData
              ? <DdlTableTitleWithMeta table={previousDdlEntityData} />
              : undefined
          }
          emptyPadding={action === ADD_ACTION_TYPE}
        />
      )}
      renderRight={() => (
        <EntityChangesSummary
          title={
            action !== REMOVE_ACTION_TYPE && ddlEntityData
              ? <DdlTableTitleWithMeta table={ddlEntityData} />
              : undefined
          }
          changes={changeSummary}
          emptyPadding={action === REMOVE_ACTION_TYPE}
        />
      )}
    />
  )
}
