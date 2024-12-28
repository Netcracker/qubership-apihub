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
