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
