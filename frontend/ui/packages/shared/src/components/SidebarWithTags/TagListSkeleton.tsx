import type { FC, RefObject } from 'react'
import { memo } from 'react'
import { List, ListItem, Skeleton } from '@mui/material'

export type TagListSkeletonProps = {
  count?: number
}

export const TagListSkeleton: FC<TagListSkeletonProps> = memo<TagListSkeletonProps>(({ count = 6 }) => {
  return (
    <List>
      {[...Array(count)].map((_, index) => (
        <TagSkeleton key={index}/>
      ))}
    </List>
  )
})

type TagSkeletonProps = {
  refObject?: RefObject<HTMLDivElement>
}

export const TagSkeleton: FC<TagSkeletonProps> = memo<TagSkeletonProps>(({ refObject }) => {
  return (
    <ListItem>
      <Skeleton ref={refObject} sx={{}} variant="rectangular" width={116} height={15}/>
    </ListItem>
  )
})
