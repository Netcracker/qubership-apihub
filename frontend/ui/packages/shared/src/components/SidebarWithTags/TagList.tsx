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
import { memo, useRef } from 'react'
import { List } from '@mui/material'
import { NAVIGATION_PLACEHOLDER_AREA, NO_SEARCH_RESULTS, Placeholder } from '../Placeholder'
import { isNotEmpty } from '../../utils/arrays'
import type { Tags } from '../../entities/operations'
import { useIntersectionObserver } from '../../hooks/common/useIntersectionObserver'
import type { HasNextPage, IsFetchingNextPage } from '../../utils/aliases'
import { TagListSkeleton, TagSkeleton } from './TagListSkeleton'
import { TagListItem } from './TagListItem'

export type TagListProps = {
  searchValue: string
  tags: Tags
  areTagsLoading: boolean
  fetchNextTagsPage?: () => Promise<void>
  isNextTagsPageFetching?: IsFetchingNextPage
  hasNextTagsPage?: HasNextPage
  selectedTag?: string
  onSelectTag: (value?: string) => void
}

export const TagList: FC<TagListProps> = memo<TagListProps>((props) => {
  const {
    searchValue,
    tags,
    areTagsLoading,
    fetchNextTagsPage,
    hasNextTagsPage,
    isNextTagsPageFetching,
    selectedTag,
    onSelectTag,
  } = props

  const ref = useRef<HTMLDivElement>(null)
  useIntersectionObserver(ref, isNextTagsPageFetching, hasNextTagsPage, fetchNextTagsPage)

  if (areTagsLoading) {
    return (
      <TagListSkeleton/>
    )
  }

  return (
    <Placeholder
      invisible={isNotEmpty(tags)}
      area={NAVIGATION_PLACEHOLDER_AREA}
      message={searchValue ? NO_SEARCH_RESULTS : 'No tags'}
    >
      <List>
        {tags.map((tag) => {
          return (
            <TagListItem
              key={tag}
              tag={tag}
              selected={tag === selectedTag}
              onClick={onSelectTag}
            />
          )
        })}
        {hasNextTagsPage && <TagSkeleton key="tag-skeleton" refObject={ref}/>}
      </List>
    </Placeholder>
  )
})
