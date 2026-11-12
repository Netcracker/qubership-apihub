import type { FC } from 'react'
import { useCallback, useState } from 'react'
import { SelfManagedOperationFilters } from '../../../../SelfManagedOperationFilters'
import { useTags } from '../../../../useTags'
import { debounce } from '@mui/material'
import type { PackageReference } from '@netcracker/qubership-apihub-ui-shared/entities/version-references'
import type { ApiAudience, ApiKind } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import { useEventBus } from '@portal/routes/EventBusProvider'
import { DEFAULT_DEBOUNCE } from '@netcracker/qubership-apihub-ui-shared/utils/constants'
import { useCurrentPackage } from '@portal/components/CurrentPackageProvider'
import { DASHBOARD_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'

export type SidebarProps = {
  apiType: ApiType
  selectedRefPackage?: PackageReference | null
  selectedApiKind?: ApiKind
  selectedApiAudience?: ApiAudience
  selectedTag?: string
}

export const Sidebar: FC<SidebarProps> = (props) => {
  const { apiType, selectedRefPackage, selectedApiKind, selectedApiAudience, selectedTag } = props
  const packageKind = useCurrentPackage()?.kind

  const { onRefPackageSelected, onApiKindSelected, onTagSelected, onApiAudienceSelected } = useEventBus()

  const [tagSearchValue, setTagSearchValue] = useState<string>()

  const {
    data: tags,
    loading: areTagsLoading,
    fetchNextPage: fetchNextTagsPage,
    fetchingNextPage: isNextTagsPageFetching,
    hasNextPage: hasNextTagsPage,
  } = useTags({
    packageKey: selectedRefPackage?.key,
    versionKey: selectedRefPackage?.version,
    apiType: apiType as ApiType,
    textFilter: tagSearchValue,
    apiKind: selectedApiKind,
    apiAudience: selectedApiAudience,
    limit: 500,
  })

  const onFetchNextPage = useCallback(async (): Promise<void> => {
    await fetchNextTagsPage()
  }, [fetchNextTagsPage])

  return (
    <SelfManagedOperationFilters
      selectedPackageKey={selectedRefPackage?.key}
      onSelectPackage={
        packageKind === DASHBOARD_KIND
          ? (newSelectedRefPackage) => {
            onRefPackageSelected(newSelectedRefPackage)
          }
          : undefined
      }
      selectedApiAudience={selectedApiAudience}
      onSelectApiAudience={onApiAudienceSelected}
      selectedApiKind={selectedApiKind}
      onSelectApiKind={(newSelectedApiKind?: ApiKind) => {
        onApiKindSelected(newSelectedApiKind)
      }}
      tags={tags}
      areTagsLoading={areTagsLoading}
      fetchNextTagsPage={onFetchNextPage}
      isNextTagsPageFetching={isNextTagsPageFetching}
      hasNextTagsPage={hasNextTagsPage}
      onTagSearch={debounce((tag) => {
        setTagSearchValue(tag)
      }, DEFAULT_DEBOUNCE)}
      selectedTag={selectedTag}
      onSelectTag={onTagSelected}
    />
  )
}
