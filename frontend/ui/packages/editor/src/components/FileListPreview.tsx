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
import { memo } from 'react'
import { IconButton, List, ListItem, ListItemIcon, ListItemText } from '@mui/material'
import ClearOutlinedIcon from '@mui/icons-material/ClearOutlined'
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined'

export type FileListPreviewProps = {
  value: ReadonlyArray<FileInfo>
  onDelete?: (file: FileInfo) => void
}

type FileInfo = {
  name: string
  path?: string
}

export const FileListPreview: FC<FileListPreviewProps> = memo<FileListPreviewProps>(({ value, onDelete }) => {
  return (
    <List sx={{ height: 188 }}>
      {
        value.map((file, index) => (
          <ListItem
            key={`${index}-${file.name}`}
            sx={{
              p: file.path !== undefined ? 0 : 1,
              '&:hover': {
                backgroundColor: '#F2F3F5',
                '& button': {
                  opacity: 1,
                },
              },
            }}
            secondaryAction={
              onDelete && <IconButton
                sx={{ p: 0, opacity: 0 }}
                onClick={() => onDelete(file)}
              >
                <ClearOutlinedIcon/>
              </IconButton>
            }
          >
            <ListItemIcon sx={{ minWidth: 2 }}>
              <InsertDriveFileOutlinedIcon
                sx={{ color: '#B4BFCF', mr: 1 }}
                fontSize="small"
              />
            </ListItemIcon>
            <ListItemText
              sx={{ m: 0 }}
              primary={file.name}
              secondary={file.path && `/${file.path}`}
              primaryTypographyProps={{ fontSize: '13px' }}
              secondaryTypographyProps={{ fontSize: '11px' }}
            />
          </ListItem>
        ))
      }
    </List>
  )
})
