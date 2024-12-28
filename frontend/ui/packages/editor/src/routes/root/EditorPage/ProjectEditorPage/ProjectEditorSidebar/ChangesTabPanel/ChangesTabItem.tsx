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
import { memo, useState } from 'react'
import { Box, ListItem, ListItemIcon, ListItemText, MenuItem } from '@mui/material'
import { useResetFile } from './useResetFile'
import { useChangeSearchParam } from '../../../../useChangeSearchParam'

import MoreVertIcon from '@mui/icons-material/MoreVert'
import WarningRoundedIcon from '@mui/icons-material/WarningRounded'
import { useSetSelectedConflictedBlobKey } from '../../ConflictedBlobKeyProvider'
import { useBranchConflicts } from '../../useBranchConflicts'
import type { ChangeStatus } from '@netcracker/qubership-apihub-ui-shared/entities/change-statuses'
import {
  ADDED_CHANGE_STATUS,
  DELETED_CHANGE_STATUS,
  MODIFIED_CHANGE_STATUS,
  MOVED_CHANGE_STATUS,
  STATUS_COLORS,
} from '@netcracker/qubership-apihub-ui-shared/entities/change-statuses'
import { useSetSearchParams } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSetSearchParams'
import { FILES_PROJECT_EDITOR_MODE } from '@apihub/entities/editor-modes'
import { getFileName } from '@netcracker/qubership-apihub-ui-shared/utils/files'
import { MenuButton } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/MenuButton'
import { FileIcon } from '@netcracker/qubership-apihub-ui-shared/icons/FileIcon'

export type ChangesTabItemProps = {
  fileId: string
  status: ChangeStatus | undefined
  conflictedBlobId: string | undefined
}

export const ChangesTabItem: FC<ChangesTabItemProps> = memo<ChangesTabItemProps>(({
  fileId,
  status,
  conflictedBlobId,
}) => {
  const [actionMenuOpen, setActionMenuOpen] = useState(false)

  const [resetFile] = useResetFile()

  const setSearchParams = useSetSearchParams()
  const setSelectedConflictedCommitKey = useSetSelectedConflictedBlobKey()
  const [selectedChangeKey, setSelectedChangeKey] = useChangeSearchParam()
  const [conflicts] = useBranchConflicts()

  return (
    <ListItem
      key={fileId}
      sx={{
        borderLeft: `2px solid ${STATUS_COLORS[status!]}`,
        maxHeight: 48,
        cursor: 'pointer',
        '&:hover': {
          backgroundColor: '#ECEDEF',
          '& .MuiButtonBase-root': {
            visibility: 'visible',
            '& .MuiListItem-secondaryAction': {
              visibility: 'visible',
              backgroundColor: '#ECEDEF',
            },
          },
        },
      }}
      selected={selectedChangeKey === fileId}
      secondaryAction={
        <MenuButton
          sx={{
            ml: 1,
            visibility: actionMenuOpen ? 'visible' : 'hidden',
            backgroundColor: actionMenuOpen ? '#E8E8E8' : 'transparent',
            '&:hover': {
              backgroundColor: '#ECEDEF',
            },
            width: 24,
            minWidth: 24,
            height: 24,
          }}
          size="small"
          icon={<MoreVertIcon sx={{ color: '#626D82' }} fontSize="small"/>}
          onClick={event => {
            event.stopPropagation()
            setActionMenuOpen(true)
          }}
          onItemClick={event => event.stopPropagation()}
          onClose={() => setActionMenuOpen(false)}
        >
          <Box>
            <MenuItem onClick={() => setSearchParams({ file: fileId, mode: FILES_PROJECT_EDITOR_MODE })}>Edit
              file</MenuItem>
            {
              RESETTABLE_STATUSES.includes(status!) && <MenuItem
                onClick={() => resetFile(fileId)}>
                Reset to last saved
              </MenuItem>
            }
            {
              conflictedBlobId && <MenuItem
                onClick={() => {
                  setSelectedChangeKey(fileId)
                  setSelectedConflictedCommitKey(conflictedBlobId)
                }}
              >
                View conflict
              </MenuItem>
            }
          </Box>
        </MenuButton>
      }
      onClick={() => {
        setSelectedChangeKey(fileId)
        setSelectedConflictedCommitKey(null)
      }}
    >
      <Box display="flex" alignItems="end" width="100%">
        <Box
          sx={{
            overflow: 'hidden',
            padding: 0,
            margin: 0,
            flexDirection: 'column',
          }}
        >
          <Box display={'flex'}>
            <ListItemIcon sx={{ minWidth: 24 }}>
              {
                conflicts.includes(fileId)
                  ? <WarningRoundedIcon fontSize="small" color="warning"/>
                  : <FileIcon/>
              }
            </ListItemIcon>
            <ListItemText
              primary={getFileName(fileId)}
              primaryTypographyProps={{ color: STATUS_COLORS[status!] }}
            />
          </Box>
          <ListItemText
            primary={fileId}
            primaryTypographyProps={{ color: '#626D82' }}
          />
        </Box>
      </Box>
    </ListItem>
  )
})

const RESETTABLE_STATUSES = [
  ADDED_CHANGE_STATUS,
  DELETED_CHANGE_STATUS,
  MODIFIED_CHANGE_STATUS,
  MOVED_CHANGE_STATUS,
]
