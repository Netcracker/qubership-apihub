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
