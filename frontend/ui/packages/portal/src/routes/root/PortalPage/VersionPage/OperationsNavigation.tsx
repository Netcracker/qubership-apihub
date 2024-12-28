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
import { useTags } from './useTags'
import { useParams } from 'react-router-dom'
import { SelfManagedOperationFilters } from './SelfManagedOperationFilters'
import { useDefaultOperationFilterControllers } from './useDefaultOperationFilterControllers'
import { usePackageKind } from '../usePackageKind'
import { useTagSearchFilter } from './useTagSearchFilter'
import { DASHBOARD_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'

export const OperationsNavigation = memo(() => {
  const { apiType } = useParams()
  const [selectedTag, setSelectedTag] = useTagSearchFilter()

  const [searchValue, setSearchValue] = useState('')

  const [packageKind] = usePackageKind()
  const isDashboard = packageKind === DASHBOARD_KIND

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
    />
  )
})
