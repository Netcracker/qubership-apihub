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
import { Box, ListItem, ListItemIcon, Skeleton } from '@mui/material'
import { BORDER } from '../consts'

export const OperationSkeleton: FC = () => {
  return (
    <ListItem
      sx={{
        h: '13px',
        px: 0,
        py: 1,
        borderBottom: BORDER,
      }}
    >
      <ListItemIcon
        sx={{minWidth: '16px', marginRight: '16px'}}
      >
        <Skeleton sx={{width: '16px', height: '28px', p: 0}}/>
      </ListItemIcon>
      <Box width="calc(100% - 32px)">
        <Skeleton sx={{width: '40%', height: '16px'}}/>
        <Skeleton sx={{width: '80%', height: '28px'}}/>
      </Box>
    </ListItem>
  )
}

export const OperationListSkeleton: FC = () => {
  return (
    <>
      {Array(7).fill(0).map((_, index) => {
        return <OperationSkeleton key={`operation-skeleton-${index}`}/>
      })}
    </>
  )
}
