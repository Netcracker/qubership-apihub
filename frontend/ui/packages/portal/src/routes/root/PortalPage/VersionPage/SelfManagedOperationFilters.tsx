import { type FC, memo } from 'react'
import { useParams } from 'react-router-dom'

import { OperationFilters } from '@netcracker/qubership-apihub-ui-shared/components/OperationFilters/OperationFilters'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import type { OperationGroupName } from '@netcracker/qubership-apihub-ui-shared/entities/operation-groups'
import type { ApiAudience, ApiKind, Tags } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import { DEFAULT_API_TYPE } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import { PACKAGE_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import type { PackageReference } from '@netcracker/qubership-apihub-ui-shared/entities/version-references'
import type { HasNextPage, IsFetchingNextPage } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'

import { usePortalPageSettingsContext } from '@portal/routes/PortalPageSettingsProvider'
import { useFullMainVersion } from '@portal/routes/root/PortalPage/FullMainVersionProvider'
import { usePackageVersionContent } from '../../usePackageVersionContent'
import { useFilteredPackageRefs } from '../../useRefPackage'

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
  onSelectTag?: (value?: string) => void
  packageFilterOnly?: boolean
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
    packageFilterOnly = false,
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
    enabled: !packageFilterOnly,
  })

  const operationFilters = packageFilterOnly
    ? undefined
    : {
      onSelectTag,
      onTagSearch,
      onSelectApiAudience,
      onSelectApiKind,
      onSelectOperationGroup,
    }

  return (
    <OperationFilters
      tags={tags}
      areTagsLoading={areTagsLoading}
      fetchNextTagsPage={fetchNextTagsPage}
      isNextTagsPageFetching={isNextTagsPageFetching}
      hasNextTagsPage={hasNextTagsPage}
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
      {...operationFilters}
    />
  )
})

SelfManagedOperationFilters.displayName = 'SelfManagedOperationFilters'
