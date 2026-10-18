import { type FC, memo } from 'react'

import { SidebarPanel } from '@netcracker/qubership-apihub-ui-shared/components/Panels/SidebarPanel'
import { SidebarWithTags } from '@netcracker/qubership-apihub-ui-shared/components/SidebarWithTags/SidebarWithTags'
import { type ApiType, isApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import type { ContractType } from '@netcracker/qubership-apihub-ui-shared/entities/contract-types'

import { isApiTypeSelectorShown } from '@apihub/utils/operation-types'
import { ApiTypeListSelector } from './ApiTypeListSelector'
import type { CompareApiTypeSearchParam } from './compareApiTypeFilter'

export type VersionCompareSidebarProps = {
  apiType: CompareApiTypeSearchParam
  apiTypes: Array<ApiType | ContractType>
  filteredTags: string[]
  isLoading: boolean
  selectedTag: string
  setSearchValue: (value: string) => void
  setSelectedTag: (value: string | undefined) => void
}

export const VersionCompareSidebar: FC<VersionCompareSidebarProps> = memo<VersionCompareSidebarProps>(props => {
  const {
    apiType,
    apiTypes,
    filteredTags,
    isLoading,
    selectedTag,
    setSearchValue,
    setSelectedTag,
  } = props

  const showTypeSelector = isApiTypeSelectorShown(apiTypes)

  return (
    <SidebarPanel
      header={showTypeSelector && <ApiTypeListSelector allowedApiTypes={apiTypes} />}
      headerFullWidth
      withDivider={showTypeSelector}
      body={isApiType(apiType) && (
        <SidebarWithTags
          tags={filteredTags}
          areTagsLoading={isLoading}
          onSearch={setSearchValue}
          selectedTag={selectedTag}
          onSelectTag={setSelectedTag}
        />
      )}
    />
  )
})

VersionCompareSidebar.displayName = 'VersionCompareSidebar'
