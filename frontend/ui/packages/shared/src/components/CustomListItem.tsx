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
import React, { memo } from 'react'
import { Box, ListItemText, Typography } from '@mui/material'
import { OverflowTooltip } from './OverflowTooltip'

// First Order Component //
export type CustomListItemProps = {
  title: string
  strikeThrough?: boolean
  badgeTitle?: string
  badgeColor?: string
}
export const CustomListItem: FC<CustomListItemProps> = memo<CustomListItemProps>((props) => {
  const { title, strikeThrough, badgeTitle, badgeColor } = props

  return (
    <Box display="flex" alignItems="center" width="100%">
      <ListItemText
        primary={
          <OverflowTooltip title={title}>
            <Box width="inherit" textOverflow="ellipsis" overflow="hidden">{title}</Box>
          </OverflowTooltip>
        }
        primaryTypographyProps={{
          sx: {
            mt: 0.25,
            textDecoration: strikeThrough ? 'line-through' : 'none',
          },
        }}
      />
      {badgeTitle && (
        <Typography variant="button" sx={{ color: `${badgeColor}` }}>
          {badgeTitle}
        </Typography>
      )}
    </Box>
  )
})
