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
import { memo, useCallback } from 'react'
import { ListItem, ListItemButton, ListItemText } from '@mui/material'

export const TagListItem: FC<{
  tag: string
  selected: boolean
  onClick: (value?: string) => void
}> = memo((props) => {
  const { tag, selected, onClick } = props

  const handleTagClick = useCallback(() => {
    onClick(selected ? '' : tag)
  }, [onClick, selected, tag])

  return (
    <ListItem
      sx={{ p: 0 }}
    >
      <ListItemButton
        sx={{
          height: '36px',
          alignItems: 'center',
        }}
        selected={selected}
        onClick={handleTagClick}
      >
        <ListItemText primary={tag} primaryTypographyProps={{ sx: { mt: 1 } }}/>
      </ListItemButton>
    </ListItem>
  )
})
