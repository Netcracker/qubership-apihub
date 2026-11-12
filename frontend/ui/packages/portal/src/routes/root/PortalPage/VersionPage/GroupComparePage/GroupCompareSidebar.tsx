import type { FC } from 'react'
import React, { memo, useMemo, useState } from 'react'
import { useChangesSummaryFromContext } from '../ChangesSummaryProvider'
import { useTagSearchFilter } from '../useTagSearchFilter'
import { isEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import { isAppliedSearchValueForTag } from '@netcracker/qubership-apihub-ui-shared/utils/tags'
import { SidebarPanel } from '@netcracker/qubership-apihub-ui-shared/components/Panels/SidebarPanel'
import { SidebarWithTags } from '@netcracker/qubership-apihub-ui-shared/components/SidebarWithTags/SidebarWithTags'

type GroupCompareSidebarProps = {
  tags: string[]
}
export const GroupCompareSidebar: FC<GroupCompareSidebarProps> = memo(({ tags }) => {
  const [searchValue, setSearchValue] = useState('')
  const [selectedTag, setSelectedTag] = useTagSearchFilter()
  const versionChangesSummary = useChangesSummaryFromContext()
  const isLoading = !versionChangesSummary || isEmpty(tags)

  const filteredTags = useMemo(
    () => tags.filter(tag => isAppliedSearchValueForTag(tag, searchValue)),
    [searchValue, tags],
  )

  return (
    <SidebarPanel
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
