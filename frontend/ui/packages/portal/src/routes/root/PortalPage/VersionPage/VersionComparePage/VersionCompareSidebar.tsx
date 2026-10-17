import { type FC, memo } from 'react'

import { SidebarPanel } from '@netcracker/qubership-apihub-ui-shared/components/Panels/SidebarPanel'
import { SidebarWithTags } from '@netcracker/qubership-apihub-ui-shared/components/SidebarWithTags/SidebarWithTags'

export type VersionCompareSidebarProps = {
  filteredTags: string[]
  isLoading: boolean
  selectedTag: string
  setSearchValue: (value: string) => void
  setSelectedTag: (value: string | undefined) => void
}

export const VersionCompareSidebar: FC<VersionCompareSidebarProps> = memo<VersionCompareSidebarProps>(props => {
  const {
    filteredTags,
    isLoading,
    selectedTag,
    setSearchValue,
    setSelectedTag,
  } = props

  return (
    <SidebarPanel
      body={(
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
