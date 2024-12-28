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
import * as React from 'react'
import { memo, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { SelfManagedOperationFilters } from '../SelfManagedOperationFilters'
import { useDeprecatedSummary } from './useDeprecatedSummary'
import { useDefaultOperationFilterControllers } from '../useDefaultOperationFilterControllers'
import { usePackageKind } from '../../usePackageKind'
import { useTagSearchFilter } from '../useTagSearchFilter'
import { isAppliedSearchValueForTag } from '@netcracker/qubership-apihub-ui-shared/utils/tags'
import { DASHBOARD_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import type { VersionDeprecatedSummary } from '@netcracker/qubership-apihub-ui-shared/entities/version-contents'
import { isDashboardDeprecatedSummary } from '@netcracker/qubership-apihub-ui-shared/entities/version-contents'
import { DEFAULT_TAG, EMPTY_TAG } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import { isEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'

export const DeprecatedOperationsNavigation: FC = memo(() => {
  const { packageId, versionId, apiType } = useParams()
  const [selectedTag, setSelectedTag] = useTagSearchFilter()

  const [searchValue, setSearchValue] = useState('')

  const { deprecatedSummary } = useDeprecatedSummary({ packageKey: packageId, versionKey: versionId })
  const isLoading = !deprecatedSummary

  const tags = useTagsFromSummary(apiType as ApiType, deprecatedSummary)
  const filteredTags = searchValue
    ? tags.filter(tag => isAppliedSearchValueForTag(tag, searchValue))
    : tags

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
      tags={filteredTags}
      areTagsLoading={isLoading}
      onTagSearch={setSearchValue}
      selectedTag={selectedTag}
      onSelectTag={setSelectedTag}
    />
  )
})

function useTagsFromSummary(
  apiType: ApiType,
  versionDeprecatedSummary: VersionDeprecatedSummary | null,
): string[] {
  return useMemo(
    () => {
      if (!versionDeprecatedSummary) {
        return []
      }

      const tagSet = new Set<string>(
        isDashboardDeprecatedSummary(versionDeprecatedSummary)
          ? versionDeprecatedSummary.map(ref => ref.operationTypes?.[apiType]?.tags ?? []).flat()
          : versionDeprecatedSummary.operationTypes?.[apiType]?.tags ?? [],
      )

      const tagList = Array.from(tagSet)
      if (isEmpty(tagList) || tagList.includes(EMPTY_TAG)) {
        return [DEFAULT_TAG]
      }
      return tagList
    },
    [versionDeprecatedSummary, apiType],
  )
}
