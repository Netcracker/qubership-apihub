import { createElement, type ReactNode, useEffect, useMemo, useState } from 'react'

import { type ApiType, isApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import type { ContractType } from '@netcracker/qubership-apihub-ui-shared/entities/contract-types'
import { isDashboardComparisonSummary } from '@netcracker/qubership-apihub-ui-shared/entities/version-changes-summary'
import { isAppliedSearchValueForTag } from '@netcracker/qubership-apihub-ui-shared/utils/tags'

import { getDefaultApiType, isApiTypeSelectorShown } from '@portal/utils/operation-types'
import { useRefSearchParam } from '../../useRefSearchParam'
import { useChangesSummaryFromContext } from '../ChangesSummaryProvider'
import { useApiTypeSearchParam } from '../useApiTypeSearchParam'
import { useTagSearchFilter } from '../useTagSearchFilter'
import { useTagsFromChangesSummary } from '../useTagsFromChangesSummary'
import { isCompareApiTypeAll, toComparedApiTypeFilter } from './compareApiTypeFilter'
import { useCompareAllowedApiTypes } from './useCompareAllowedApiTypes'
import { VersionCompareSidebar, type VersionCompareSidebarProps } from './VersionCompareSidebar'

type VersionCompareSidebarHookResult = VersionCompareSidebarProps & {
  isVisible: boolean
}

export function useVersionCompareSidebar(isDashboardsComparison: boolean): ReactNode | undefined {
  const { isVisible, ...sidebarProps } = useVersionCompareSidebarProps()

  return useMemo(() => {
    if (isDashboardsComparison || !isVisible) {
      return undefined
    }
    return createElement(VersionCompareSidebar, sidebarProps)
  }, [isDashboardsComparison, isVisible, sidebarProps])
}

function useVersionCompareSidebarProps(): VersionCompareSidebarHookResult {
  const { apiType, setApiTypeSearchParam } = useApiTypeSearchParam()

  const [searchValue, setSearchValue] = useState('')
  const [refPackageKey] = useRefSearchParam()
  const [selectedTag, setSelectedTag] = useTagSearchFilter()
  const versionChangesSummary = useChangesSummaryFromContext()
  const isLoading = useMemo(() => !versionChangesSummary, [versionChangesSummary])

  const filteredVersionChangesSummary = versionChangesSummary && isDashboardComparisonSummary(versionChangesSummary)
    ? versionChangesSummary.filter(obj => obj.refKey === refPackageKey)
    : versionChangesSummary

  const tags = useTagsFromChangesSummary(
    isApiType(apiType) ? apiType : undefined,
    filteredVersionChangesSummary,
  )

  const apiTypes = useCompareAllowedApiTypes(versionChangesSummary, refPackageKey)

  useEffect(() => {
    if (!versionChangesSummary) {
      return
    }
    if (apiTypes.length > 0 && (isCompareApiTypeAll(apiType) || !apiTypes.includes(apiType))) {
      setApiTypeSearchParam(getDefaultApiType(apiTypes))
    }
  }, [apiType, apiTypes, setApiTypeSearchParam, versionChangesSummary])

  const filteredTags = useMemo(
    () => tags.filter(tag => isAppliedSearchValueForTag(tag, searchValue)),
    [searchValue, tags],
  )

  const selectedApiType = toComparedApiTypeFilter(apiType)

  return {
    isVisible: isVersionCompareSidebarVisible(apiTypes, selectedApiType),
    apiType: apiType,
    apiTypes: apiTypes,
    filteredTags: filteredTags,
    isLoading: isLoading,
    selectedTag: selectedTag,
    setSearchValue: setSearchValue,
    setSelectedTag: setSelectedTag,
  }
}

function isVersionCompareSidebarVisible(
  allowedApiTypes: ReadonlyArray<ApiType | ContractType>,
  selectedApiType: ApiType | ContractType | undefined,
): boolean {
  return isApiTypeSelectorShown(allowedApiTypes) ||
    (selectedApiType !== undefined && isApiType(selectedApiType))
}
