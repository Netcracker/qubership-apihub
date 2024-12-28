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
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material'
import { useEvent } from 'react-use'
import type { ForceSaveChangesDialogDetail } from '../../../../../EventBusProvider'
import { SHOW_FORCE_SAVE_CHANGES_DIALOG, useEventBus } from '../../../../../EventBusProvider'
import WarningRoundedIcon from '@mui/icons-material/WarningRounded'
import { getFileName } from '@netcracker/qubership-apihub-ui-shared/utils/files'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'

export const ForceSaveChangesDialog: FC = memo(() => {
  const [open, setOpen] = useState(false)
  const [conflicts, setConflicts] = useState<Key[]>([])
  const { showSaveChangesDialog } = useEventBus()

  useEvent(SHOW_FORCE_SAVE_CHANGES_DIALOG, ({ detail: { conflicts: conflictFiles } }: CustomEvent<ForceSaveChangesDialogDetail>) => {
    setConflicts(conflictFiles)
    setOpen(true)
  })

  return (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
    >
      <DialogTitle>
        Save Conflicts
      </DialogTitle>

      <DialogContent sx={{ width: 500 }}>
        <>
          <Typography variant="body2">
            There are some files with conflict with GIT:
          </Typography>
          <List sx={{ maxHeight: 188 }}>
            {conflicts.map(conflict => (
              <ListItem key={conflict} sx={{ alignItems: 'start', pb: 0 }}>
                <ListItemIcon sx={{ minWidth: 2 }}>
                  <WarningRoundedIcon fontSize="small" color="warning" sx={{ mr: 1 }}/>
                </ListItemIcon>
                <ListItemText
                  primary={getFileName(conflict)}
                  secondary={conflict}
                  primaryTypographyProps={{ fontSize: '13px' }}
                  secondaryTypographyProps={{ fontSize: '11px' }}
                />
              </ListItem>
            ))}
          </List>
        </>
      </DialogContent>

      <DialogActions>
        <Button
          variant="contained"
          onClick={() => {
            setOpen(false)
            showSaveChangesDialog({ saveToNewBranch: true })
          }}>
          Save to New Branch
        </Button>
        <Button variant="outlined" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button
          variant="outlined"
          style={{ marginLeft: 'auto' }}
          onClick={() => {
            setOpen(false)
            showSaveChangesDialog()
          }}>
          Force Save
        </Button>
      </DialogActions>
    </Dialog>
  )
})
