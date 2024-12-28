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
import { memo } from 'react'
import { useParams } from 'react-router-dom'
import { useFilteredPackageRefs } from '../../useRefPackage'
import { usePackageVersionContent } from '../../usePackageVersionContent'
import type { ApiAudience, ApiKind, Tags } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import { DEFAULT_API_TYPE } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import type { PackageReference } from '@netcracker/qubership-apihub-ui-shared/entities/version-references'
import type { OperationGroupName } from '@netcracker/qubership-apihub-ui-shared/entities/operation-groups'
import { PACKAGE_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { OperationFilters } from '@netcracker/qubership-apihub-ui-shared/components/OperationFilters/OperationFilters'
import { usePortalPageSettingsContext } from '@apihub/routes/PortalPageSettingsProvider'
import { useFullMainVersion } from '@apihub/routes/root/PortalPage/FullMainVersionProvider'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import type { HasNextPage, IsFetchingNextPage } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'

export type OperationsFilterControllers = {
  selectedPackageKey?: string
  onSelectPackage?: (packageRef: PackageReference | null) => void
  selectedOperationGroupName?: OperationGroupName
  onSelectOperationGroup?: (operationGroupName?: OperationGroupName) => void
  selectedApiAudience?: ApiAudience
  onSelectApiAudience?: (value?: ApiAudience) => void
  selectedApiKind?: ApiKind
  onSelectApiKind?: (value?: ApiKind) => void
}

export type SelfManagedOperationFiltersProps = OperationsFilterControllers & {
  tags: Tags
  areTagsLoading: boolean
  fetchNextTagsPage?: () => Promise<void>
  isNextTagsPageFetching?: IsFetchingNextPage
  hasNextTagsPage?: HasNextPage
  onTagSearch?: (value: string) => void
  selectedTag?: string
  onSelectTag: (value?: string) => void
}

// High Order Component //
export const SelfManagedOperationFilters: FC<SelfManagedOperationFiltersProps> = memo<SelfManagedOperationFiltersProps>((props) => {
  const {
    selectedPackageKey,
    onSelectPackage,
    selectedOperationGroupName,
    onSelectOperationGroup,
    selectedApiAudience,
    onSelectApiAudience,
    selectedApiKind,
    onSelectApiKind,
    tags,
    areTagsLoading,
    fetchNextTagsPage,
    hasNextTagsPage,
    isNextTagsPageFetching,
    onTagSearch,
    selectedTag,
    onSelectTag,
  } = props

  const { hideGeneralFilters, toggleHideGeneralFilters } = usePortalPageSettingsContext()
  const fullVersion = useFullMainVersion()
  const { packageId: rootPackageKey, versionId: rootPackageVersion, apiType = DEFAULT_API_TYPE } = useParams()

  const { data: references, isLoading: isReferencesLoading } = useFilteredPackageRefs({
    packageKey: rootPackageKey!,
    version: rootPackageVersion!,
    kind: PACKAGE_KIND,
    showAllDescendants: true,
    showUndeleted: true,
  })

  const { versionContent, isLoading: isPackageVersionContentLoading } = usePackageVersionContent({
    packageKey: rootPackageKey,
    versionKey: fullVersion,
    includeGroups: true,
  })

  return (
    <OperationFilters
      tags={tags}
      areTagsLoading={areTagsLoading}
      fetchNextTagsPage={fetchNextTagsPage}
      isNextTagsPageFetching={isNextTagsPageFetching}
      hasNextTagsPage={hasNextTagsPage}
      onSelectTag={onSelectTag}
      onTagSearch={onTagSearch}
      onSelectApiAudience={onSelectApiAudience}
      onSelectApiKind={onSelectApiKind}
      onSelectOperationGroup={onSelectOperationGroup}
      onSelectPackage={onSelectPackage}
      hiddenGeneralFilters={hideGeneralFilters}
      onClickExpandCollapseButton={toggleHideGeneralFilters}
      versionContent={versionContent}
      isPackageVersionContentLoading={isPackageVersionContentLoading}
      references={references}
      isReferencesLoading={isReferencesLoading}
      apiType={apiType as ApiType}
      selectedApiAudience={selectedApiAudience}
      selectedApiKind={selectedApiKind}
      selectedOperationGroupName={selectedOperationGroupName}
      selectedPackageKey={selectedPackageKey}
      selectedTag={selectedTag}
    />
  )
})
