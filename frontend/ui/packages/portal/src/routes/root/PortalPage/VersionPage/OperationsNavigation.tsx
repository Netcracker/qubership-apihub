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
