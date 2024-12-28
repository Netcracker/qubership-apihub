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

import { memo, useEffect, useMemo, useState } from 'react'

import { useChangesSummaryFromContext } from '../ChangesSummaryProvider'
import { useTagsFromChangesSummary } from '../useTagsFromChangesSummary'
import { useRefSearchParam } from '../../useRefSearchParam'
import { useTagSearchFilter } from '../useTagSearchFilter'
import { ApiTypeListSelector } from './ApiTypeListSelector'
import { useApiTypeSearchParam } from '../useApiTypeSearchParam'
import { useApiTypesFromChangesSummary } from './useApiTypesFromChangesSummary'
import { isDashboardComparisonSummary } from '@netcracker/qubership-apihub-ui-shared/entities/version-changes-summary'
import { getDefaultApiType, isApiTypeSelectorShown } from '@apihub/utils/operation-types'
import { isAppliedSearchValueForTag } from '@netcracker/qubership-apihub-ui-shared/utils/tags'
import { SidebarPanel } from '@netcracker/qubership-apihub-ui-shared/components/Panels/SidebarPanel'
import { SidebarWithTags } from '@netcracker/qubership-apihub-ui-shared/components/SidebarWithTags/SidebarWithTags'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'

export const VersionCompareSidebar = memo(() => {
  const { apiType, setApiTypeSearchParam } = useApiTypeSearchParam()

  const [searchValue, setSearchValue] = useState('')
  const [refPackageKey] = useRefSearchParam()
  const [selectedTag, setSelectedTag] = useTagSearchFilter()
  const versionChangesSummary = useChangesSummaryFromContext()
  const isLoading = useMemo(() => !versionChangesSummary, [versionChangesSummary])

  const filteredVersionChangesSummary = versionChangesSummary && isDashboardComparisonSummary(versionChangesSummary)
    ? versionChangesSummary.filter(obj => obj.refKey === refPackageKey)
    : versionChangesSummary

  const tags = useTagsFromChangesSummary(apiType as ApiType, filteredVersionChangesSummary)

  const apiTypes = useApiTypesFromChangesSummary(versionChangesSummary, refPackageKey)

  useEffect(() => {
    if (!apiTypes.includes(apiType as ApiType)) {
      setApiTypeSearchParam(getDefaultApiType(apiTypes))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiType, apiTypes])

  const filteredTags = useMemo(
    () => tags.filter(tag => isAppliedSearchValueForTag(tag, searchValue)),
    [searchValue, tags],
  )

  return (
    <SidebarPanel
      header={isApiTypeSelectorShown(apiTypes) && <ApiTypeListSelector/>}
      headerFullWidth
      withDivider={isApiTypeSelectorShown(apiTypes)}
      body={
        <SidebarWithTags
          tags={filteredTags}
          areTagsLoading={isLoading}
          onSearch={setSearchValue}
          selectedTag={selectedTag}
          onSelectTag={setSelectedTag}
        />
      }
    />
  )
})
