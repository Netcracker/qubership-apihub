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
import { memo, useCallback, useMemo } from 'react'
import { Button, DialogActions, DialogTitle, IconButton } from '@mui/material'
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import type { PopupProps } from '../PopupDelegate'
import { PopupDelegate } from '../PopupDelegate'
import { DialogForm } from '../DialogForm'

export const DeleteFileDialog: FC = memo(() => {
  return (
    <PopupDelegate
      type={SHOW_DELETE_FILE_DIALOG}
      render={props => <DeleteFilePopup {...props}/>}
    />
  )
})

export const SHOW_DELETE_FILE_DIALOG = 'show-delete-file-dialog'

export type ShowDeleteFileDetail = {
  file: File
  onConfirm: (file: File) => void
}

export const DeleteFilePopup: FC<PopupProps> = memo<PopupProps>(({ open, setOpen, detail }) => {
  const [file, onConfirm] = useMemo(() => {
    const { file, onConfirm } = detail as ShowDeleteFileDetail
    return [file, onConfirm]
  }, [detail])

  const onConfirmCallback = useCallback((): void => {
    setOpen(false)
    onConfirm(file)
  }, [onConfirm, file, setOpen])

  const onClose = useCallback(() => {
    setOpen(false)
  }, [setOpen])

  return (
    <DialogForm
      open={open}
      onClose={onClose}
      width="330px"
    >
      <DialogTitle>
        Delete {file.name} document?
        <IconButton
          sx={{ position: 'absolute', right: 8, top: 8, color: '#626D82' }}
          onClick={onClose}
        >
          <CloseOutlinedIcon fontSize="small"/>
        </IconButton>
      </DialogTitle>
      <DialogActions sx={{ pt: 0 }}>
        <Button
          variant="contained"
          color="error"
          onClick={onConfirmCallback}
          data-testid="DeleteButton"
        >
          Delete
        </Button>
        <Button
          variant="outlined"
          onClick={onClose}
          data-testid="CancelButton"
        >
          Cancel
        </Button>
      </DialogActions>
    </DialogForm>
  )
})
