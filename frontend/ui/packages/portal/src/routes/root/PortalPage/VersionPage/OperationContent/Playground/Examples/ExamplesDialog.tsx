import type { FC } from 'react'
import * as React from 'react'
import { memo, useCallback } from 'react'
import { Dialog, DialogContent, DialogTitle, IconButton } from '@mui/material'
import { Examples } from './Examples'
import { CloseOutlined as CloseOutlinedIcon } from '@mui/icons-material'
import { SHOW_EXAMPLES_DIALOG } from '@portal/routes/EventBusProvider'
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
