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
import { Dialog, DialogContent, DialogTitle, IconButton } from '@mui/material'
import { Examples } from './Examples'
import { CloseOutlined as CloseOutlinedIcon } from '@mui/icons-material'
import { SHOW_EXAMPLES_DIALOG } from '@apihub/routes/EventBusProvider'
import type { PopupProps } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'
import { PopupDelegate } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'

export type ExamplesDialogProps = {
  document: string
}

export const ExamplesDialog: FC<ExamplesDialogProps> = memo<ExamplesDialogProps>(({ document }) => {
  return (
    <PopupDelegate
      type={SHOW_EXAMPLES_DIALOG}
      render={props => <ExamplesPopup {...props} document={document}/>}
    />
  )
})

export type ExamplesPopupProps = PopupProps & ExamplesDialogProps
export const ExamplesPopup: FC<ExamplesPopupProps> = memo<ExamplesPopupProps>(({ open, setOpen, document }) => {
  const onClose = useCallback(() => setOpen(false), [setOpen])

  return (
    <Dialog
      fullWidth
      maxWidth={false}
      open={open}
      onClose={onClose}
    >
      <DialogTitle sx={{ height: '12px', marginLeft: 'auto' }}>
        <IconButton
          sx={{ color: '#353C4E' }}
          onClick={onClose}
        >
          <CloseOutlinedIcon/>
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ width: '100%', height: '100vh', overflow: 'hidden', paddingBottom: '16px' }}>
        <Examples document={document} fullScreenAvailable={false}/>
      </DialogContent>
    </Dialog>
  )
})
