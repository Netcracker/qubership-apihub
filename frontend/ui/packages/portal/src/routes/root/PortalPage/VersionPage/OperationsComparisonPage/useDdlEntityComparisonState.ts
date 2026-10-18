import type { DiffType } from '@netcracker/qubership-apihub-api-diff'
import type { Path } from '@remix-run/router'
import { useCallback, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { CONTRACT_TYPE_DDL } from '@netcracker/qubership-apihub-ui-shared/entities/contract-types'
import type { DdlContractEntity } from '@netcracker/qubership-apihub-ui-shared/entities/contracts-ddl'
import {
  type DdlEntityChangeEntry,
  findDdlChangeEntry,
  getDdlChangeEntityId,
  resolveDdlCompareEntityIds,
} from '@netcracker/qubership-apihub-ui-shared/entities/contracts-ddl-changelog'
import type { Key, VersionKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { useSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSearchParam'
import { filterChangesBySeverity } from '@netcracker/qubership-apihub-ui-shared/utils/change-severities'
import {
  FILTERS_SEARCH_PARAM,
  MODE_SEARCH_PARAM,
  optionalSearchParams,
  PACKAGE_SEARCH_PARAM,
  REF_SEARCH_PARAM,
  VERSION_SEARCH_PARAM,
} from '@netcracker/qubership-apihub-ui-shared/utils/search-params'

import { useDdlChanges } from '../api/useDdlChanges'
import { useDdlTableDetails } from '../api/useDdlTableDetails'
import { useFlatDdlChanges } from '../api/useFlatDdlChanges'
import { useAutoFetchInfinitePages } from '../useAutoFetchInfinitePages'

export type UseDdlEntityComparisonStateOptions = Readonly<{
  enabled: boolean
  changedPackageKey?: Key
  changedVersionKey?: VersionKey
  originPackageKey?: Key
  originVersionKey?: VersionKey
  refPackageId?: Key
  changedEntityPackageKey?: Key
  changedEntityVersionKey?: VersionKey
  originEntityPackageKey?: Key
  originEntityVersionKey?: VersionKey
  ddlEntityId?: Key
  severityFilters: DiffType[]
  changesSummaryReady: boolean
}>

export type DdlEntityComparisonState = Readonly<{
  currentChangeEntry: DdlEntityChangeEntry | undefined
  ddlChanges: ReadonlyArray<DdlEntityChangeEntry>
  ddlChangeExists: boolean
  isChangelogReady: boolean
  isContentLoading: boolean
  originTableDetailsData: string | undefined
  changedTableDetailsData: string | undefined
  siblingTables: ReadonlyArray<DdlContractEntity>
  prepareCompareLinkFn: (table: DdlContractEntity) => Partial<Path>
}>

// DDL-specific data for the entity compare detail page (changelog paging, table SQL, redirect).
// Operations use inline hooks on the same page; this is not shared with operations logic.
export function useDdlEntityComparisonState(
  options: UseDdlEntityComparisonStateOptions,
): DdlEntityComparisonState {
  const {
    enabled,
    changedPackageKey,
    changedVersionKey,
    originPackageKey,
    originVersionKey,
    refPackageId,
    changedEntityPackageKey,
    changedEntityVersionKey,
    originEntityPackageKey,
    originEntityVersionKey,
    ddlEntityId,
    severityFilters,
    changesSummaryReady,
  } = options

  const navigate = useNavigate()
  const mode = useSearchParam(MODE_SEARCH_PARAM)

  const {
    data: ddlChangelog,
    isLoading: areDdlChangesLoading,
    fetchNextPage,
    isFetchingNextPage: isNextPageFetching,
    hasNextPage,
    isChangelogReady,
  } = useDdlChanges({
    packageKey: changedPackageKey!,
    versionKey: changedVersionKey!,
    previousVersionPackageKey: originPackageKey,
    previousVersionKey: originVersionKey,
    refPackageId: refPackageId,
    severityFilters: severityFilters,
    enabled: enabled && changesSummaryReady,
    page: 1,
    limit: 100,
  })

  const flatDdlChangelog = useFlatDdlChanges(ddlChangelog, isChangelogReady)
  const ddlChanges = flatDdlChangelog.entities

  useAutoFetchInfinitePages({
    enabled: enabled,
    isLoading: areDdlChangesLoading,
    isFetchingNextPage: isNextPageFetching,
    hasNextPage: hasNextPage,
    fetchNextPage: fetchNextPage,
  })

  const filteredDdlChanges = useMemo(
    () => ddlChanges.filter(change => filterChangesBySeverity(severityFilters, change.changeSummary)),
    [ddlChanges, severityFilters],
  )

  const currentChangeEntry = useMemo(
    () => findDdlChangeEntry(ddlChanges, ddlEntityId),
    [ddlChanges, ddlEntityId],
  )

  const compareEntityIds = useMemo(
    () => (currentChangeEntry ? resolveDdlCompareEntityIds(currentChangeEntry) : undefined),
    [currentChangeEntry],
  )

  const { data: changedTableDetails, isInitialLoading: isChangedTableLoading } = useDdlTableDetails({
    packageKey: changedEntityPackageKey,
    versionKey: changedEntityVersionKey,
    ddlEntityId: compareEntityIds?.currentDdlEntityId,
    enabled: enabled && !!compareEntityIds?.currentDdlEntityId && !!changedEntityPackageKey &&
      !!changedEntityVersionKey,
  })

  const { data: originTableDetails, isInitialLoading: isOriginTableLoading } = useDdlTableDetails({
    packageKey: originEntityPackageKey,
    versionKey: originEntityVersionKey,
    ddlEntityId: compareEntityIds?.previousDdlEntityId,
    enabled: enabled && !!compareEntityIds?.previousDdlEntityId && !!originEntityPackageKey &&
      !!originEntityVersionKey,
  })

  const ddlChangeExists = !!currentChangeEntry

  const siblingTables = useMemo(
    () =>
      filteredDdlChanges.flatMap(change => {
        if (getDdlChangeEntityId(change) === ddlEntityId) {
          return []
        }
        const changeData = change.ddlEntityData ?? change.previousDdlEntityData
        return changeData ? [changeData] : []
      }),
    [filteredDdlChanges, ddlEntityId],
  )

  const compareSearchParams = useMemo(
    () =>
      optionalSearchParams({
        [PACKAGE_SEARCH_PARAM]: { value: originPackageKey },
        [VERSION_SEARCH_PARAM]: { value: originVersionKey },
        [REF_SEARCH_PARAM]: { value: refPackageId },
        [FILTERS_SEARCH_PARAM]: { value: severityFilters.join() },
        [MODE_SEARCH_PARAM]: { value: mode ?? '' },
      }),
    [mode, originPackageKey, originVersionKey, refPackageId, severityFilters],
  )

  const prepareCompareLinkFn = useCallback((table: DdlContractEntity) => {
    const changeEntry = findDdlChangeEntry(filteredDdlChanges, table.ddlEntityId)
    if (!changeEntry || !changedPackageKey || !changedVersionKey) {
      return { pathname: '#' }
    }

    const entityId = getDdlChangeEntityId(changeEntry)
    return {
      pathname: `/portal/packages/${changedPackageKey}/${changedVersionKey}/compare/${CONTRACT_TYPE_DDL}/${entityId}`,
      search: `${compareSearchParams}`,
    }
  }, [changedPackageKey, changedVersionKey, compareSearchParams, filteredDdlChanges])

  const firstChangeEntry = useMemo(
    () => (filteredDdlChanges.length ? filteredDdlChanges[0] : undefined),
    [filteredDdlChanges],
  )

  useEffect(() => {
    if (
      !enabled ||
      !isChangelogReady ||
      isChangedTableLoading ||
      isOriginTableLoading ||
      !firstChangeEntry ||
      ddlChangeExists
    ) {
      return
    }

    const firstEntityId = getDdlChangeEntityId(firstChangeEntry)
    navigate({
      pathname:
        `/portal/packages/${changedPackageKey}/${changedVersionKey}/compare/${CONTRACT_TYPE_DDL}/${firstEntityId}`,
      search: `${compareSearchParams}`,
    })
  }, [
    changedPackageKey,
    changedVersionKey,
    compareSearchParams,
    ddlChangeExists,
    enabled,
    firstChangeEntry,
    isChangedTableLoading,
    isChangelogReady,
    isOriginTableLoading,
    navigate,
  ])

  const isContentLoading = !isChangelogReady ||
    (ddlChangeExists && (isChangedTableLoading || isOriginTableLoading))

  return {
    currentChangeEntry: currentChangeEntry,
    ddlChanges: ddlChanges,
    ddlChangeExists: ddlChangeExists,
    isChangelogReady: isChangelogReady,
    isContentLoading: isContentLoading,
    originTableDetailsData: originTableDetails?.data,
    changedTableDetailsData: changedTableDetails?.data,
    siblingTables: siblingTables,
    prepareCompareLinkFn: prepareCompareLinkFn,
  }
}
