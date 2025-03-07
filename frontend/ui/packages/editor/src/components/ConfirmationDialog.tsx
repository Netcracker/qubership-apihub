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
import { memo, useEffect } from 'react'
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, IconButton } from '@mui/material'
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import { LoadingButton } from '@mui/lab'

export type ConfirmationDialogProps = {
  open: boolean
  title?: string
  message?: string
  loading?: boolean
  confirmButtonName?: string
  onConfirm?: () => void
  onCancel?: () => void
  shouldCloseOnLoadingFinish?: boolean
}

export const ConfirmationDialog: FC<ConfirmationDialogProps> = memo<ConfirmationDialogProps>(({
  loading,
  message,
  onConfirm,
  onCancel,
  open,
  title,
  confirmButtonName = 'Delete',
  shouldCloseOnLoadingFinish = true,
}) => {
  useCloseOnLoadingFinish(loading, onCancel, shouldCloseOnLoadingFinish)

  return (
    <Dialog
      open={open}
      onClose={onCancel}
    >
      <DialogTitle
        sx={{ fontSize: 15, fontWeight: 600, color: 'black' }}
      >
        {title}
        <IconButton
          sx={{ position: 'absolute', right: 8, top: 8, color: '#353C4E' }}
          onClick={onCancel}
        >
          <CloseOutlinedIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <DialogContentText variant="body2">
          {message}
        </DialogContentText>
      </DialogContent>

      <DialogActions>
        <LoadingButton
          variant="contained"
          color="error"
          loading={loading}
          onClick={onConfirm}
        >
          {confirmButtonName}
        </LoadingButton>
        <Button
          variant="outlined"
          onClick={onCancel}
        >
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  )
})

function useCloseOnLoadingFinish(
  loading?: boolean,
  onClose?: () => void,
  enabled?: boolean,
): void {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { enabled && !loading && onClose?.() }, [enabled, loading])
}
