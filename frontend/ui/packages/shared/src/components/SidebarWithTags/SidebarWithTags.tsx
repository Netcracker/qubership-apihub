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
import { memo, useEffect, useState } from 'react'
import { Box, Typography } from '@mui/material'
import { TagList } from './TagList'
import { SearchBar } from '../SearchBar'
import type { Tags } from '../../entities/operations'
import type { HasNextPage, IsFetchingNextPage } from '../../utils/aliases'

export type SidebarWithTagsProps = {
  tags: Tags
  areTagsLoading: boolean
  fetchNextTagsPage?: () => Promise<void>
  isNextTagsPageFetching?: IsFetchingNextPage
  hasNextTagsPage?: HasNextPage
  onSearch?: (value: string) => void
  selectedTag?: string
  onSelectTag: (value?: string) => void
}

// First Order Component //
export const SidebarWithTags: FC<SidebarWithTagsProps> = memo<SidebarWithTagsProps>((props) => {
  const {
    tags, areTagsLoading, fetchNextTagsPage, hasNextTagsPage, isNextTagsPageFetching,
    onSearch, selectedTag, onSelectTag,
  } = props

  const [searchValue, setSearchValue] = useState('')

  useEffect(() => onSearch?.(searchValue), [onSearch, searchValue])

  return (
    <Box
      display="flex"
      flexDirection="column"
      overflow="hidden"
      height="100%"
    >
      <Box mx={2} mt={2}>
        <Typography width="100%" noWrap variant="button">
          Filters by Tag
        </Typography>
      </Box>
      <Box mx={2} mb={1} mt={1}>
        <SearchBar
          placeholder="Search tags"
          onValueChange={setSearchValue}
          data-testid="SearchTags"
        />
      </Box>
      <Box overflow="auto" flexGrow={1} data-testid="TagsList">
        <TagList
          searchValue={searchValue}
          tags={tags}
          areTagsLoading={areTagsLoading}
          fetchNextTagsPage={fetchNextTagsPage}
          isNextTagsPageFetching={isNextTagsPageFetching}
          hasNextTagsPage={hasNextTagsPage}
          selectedTag={selectedTag}
          onSelectTag={onSelectTag}
        />
      </Box>
    </Box>
  )
})
