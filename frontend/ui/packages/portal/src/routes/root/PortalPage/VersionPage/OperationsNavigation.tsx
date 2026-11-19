import { memo, useCallback, useState } from 'react'
import { useParams } from 'react-router-dom'

import { type ApiType, isApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import {
  CONTRACT_TYPE_DDL,
  CONTRACT_TYPE_MCP,
  toRouteApiType,
} from '@netcracker/qubership-apihub-ui-shared/entities/contract-types'
import { DASHBOARD_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'

import { usePackageKind } from '../usePackageKind'
import { SelfManagedOperationFilters } from './SelfManagedOperationFilters'
import { useDefaultOperationFilterControllers } from './useDefaultOperationFilterControllers'
import { useTagSearchFilter } from './useTagSearchFilter'
import { useTags } from './useTags'

export const OperationsNavigation = memo(() => {
  const { apiType } = useParams()
  const routeApiType = toRouteApiType(apiType)
  const [selectedTag, setSelectedTag] = useTagSearchFilter()

  const [searchValue, setSearchValue] = useState('')

  const [packageKind] = usePackageKind()
  const isDashboard = packageKind === DASHBOARD_KIND
  const isMcpOrDdl = routeApiType === CONTRACT_TYPE_MCP || routeApiType === CONTRACT_TYPE_DDL
  const packageFilterOnly = isDashboard && isMcpOrDdl

  const {
    selectedPackageKey,
    onSelectPackage,
    selectedOperationGroupName,
    onSelectOperationGroup,
    selectedApiAudience,
    onSelectApiAudience,
    selectedApiKind,
    onSelectApiKind,
  } = useDefaultOperationFilterControllers(isDashboard)

  const {
    data: tags,
    loading: areTagsLoading,
    fetchNextPage: fetchNextTagsPage,
    fetchingNextPage: isNextTagsPageFetching,
    hasNextPage: hasNextTagsPage,
  } = useTags({
    apiType: apiType as ApiType,
    textFilter: searchValue,
    apiKind: selectedApiKind,
    apiAudience: selectedApiAudience,
    limit: 100,
    enabled: isApiType(routeApiType) && !packageFilterOnly,
  })

  const onFetchNextPage = useCallback(async (): Promise<void> => {
    await fetchNextTagsPage()
  }, [fetchNextTagsPage])

  return (
    <SelfManagedOperationFilters
      selectedPackageKey={selectedPackageKey}
      onSelectPackage={onSelectPackage}
      selectedOperationGroupName={selectedOperationGroupName}
      onSelectOperationGroup={onSelectOperationGroup}
      selectedApiAudience={selectedApiAudience}
      onSelectApiAudience={onSelectApiAudience}
      selectedApiKind={selectedApiKind}
      onSelectApiKind={onSelectApiKind}
      tags={tags}
      areTagsLoading={areTagsLoading}
      fetchNextTagsPage={onFetchNextPage}
      isNextTagsPageFetching={isNextTagsPageFetching}
      hasNextTagsPage={hasNextTagsPage}
      onTagSearch={setSearchValue}
      selectedTag={selectedTag}
      onSelectTag={setSelectedTag}
      packageFilterOnly={packageFilterOnly}
    />
  )
})

OperationsNavigation.displayName = 'OperationsNavigation'
