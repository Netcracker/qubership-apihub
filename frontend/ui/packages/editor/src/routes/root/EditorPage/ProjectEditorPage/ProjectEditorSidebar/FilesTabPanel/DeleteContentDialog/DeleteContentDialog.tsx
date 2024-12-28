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
import { memo, useEffect, useState } from 'react'
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Typography,
} from '@mui/material'
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import { LoadingButton } from '@mui/lab'
import { useDeleteProjectContent } from './useDeleteProjectContent'
import { useEvent } from 'react-use'
import { SHOW_DELETE_CONTENT_DIALOG } from '../../../../../../EventBusProvider'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'

export const DeleteContentDialog: FC = memo(() => {
  const [open, setOpen] = useState(false)
  const [itemKey, setItemKey] = useState<Key>()
  const [itemName, setItemName] = useState<string>()
  const [isFolder, setIsFolder] = useState<boolean>()

  const [deleteFromGit, setDeleteFromGit] = useState(false)
  const [deleteProjectContent, isDeleteLoading] = useDeleteProjectContent()

  const onClose = (): void => {setOpen(false)}
  useEffect(() => {!isDeleteLoading && onClose()}, [isDeleteLoading])

  useEvent(SHOW_DELETE_CONTENT_DIALOG, ({ detail: { key, name, isFolder } }) => {
    setItemKey(key)
    setItemName(name)
    setIsFolder(isFolder)
    setOpen(true)
  })

  return (
    <Dialog
      open={open}
      onClose={onClose}
    >
      <DialogTitle
        sx={{ fontSize: 15, fontWeight: 600, color: 'black' }}
      >
        {`Delete ${isFolder ? 'folder' : 'file'}`}
        <IconButton
          sx={{ position: 'absolute', right: 8, top: 8, color: '#353C4E' }}
          onClick={onClose}
        >
          <CloseOutlinedIcon fontSize="small"/>
        </IconButton>
      </DialogTitle>

      <DialogContent>
        {
          isFolder
            ? <>
              <Typography variant="body2">{`Are you sure, you want to delete folder "${itemName}"?`}</Typography>
              <Typography variant="body2">{`All files and subdirectories in ${itemName} will be deleted.`}</Typography>
            </>
            : <Typography variant="body2">{`Are you sure, you want to delete file "${itemName}"?`}</Typography>
        }
      </DialogContent>

      <FormControlLabel
        sx={{ p: '8px 24px 0' }}
        label="Delete from GIT"
        control={<Checkbox onChange={(_, checked) => setDeleteFromGit(checked)}/>}
      />
      <DialogActions>
        <LoadingButton
          variant="contained"
          color="error"
          loading={isDeleteLoading}
          onClick={() => deleteProjectContent({ key: itemKey!, deleteFromGit: deleteFromGit })}
        >
          Delete
        </LoadingButton>
        <Button
          variant="outlined"
          onClick={onClose}
        >
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  )
})
