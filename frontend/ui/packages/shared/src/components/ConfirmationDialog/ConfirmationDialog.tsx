import { LoadingButton } from '@mui/lab'
import { Box, Button, DialogActions, DialogContent, DialogContentText, DialogTitle, IconButton } from '@mui/material'
import type { ButtonPropsColorOverrides } from '@mui/material/Button/Button'
import type { OverridableStringUnion } from '@mui/types'
import { type FC, memo, useEffect } from 'react'
import { CloseIcon } from '../../icons/CloseIcon'
import { DialogForm } from '../DialogForm'

const STYLE_DIALOG_TITLE = {
  px: 2.5,
  pt: 2.5,
  pb: 0.5,
}

const STYLE_DIALOG_CONTENT = {
  minWidth: 420,
  pl: 2.5,
  pr: 6.5,
  pb: 0.5,
}

const STYLE_DIALOG_ACTIONS = {
  px: 2.5,
  pt: 1.5,
  pb: 2.5,
}

export type ConfirmationDialogProps = {
  open: boolean
  title?: string
  message?: string
  loading?: boolean
  confirmButtonName?: string
  confirmButtonColor?: ButtonColor
  onConfirm?: () => void
  onCancel?: () => void
}

export const ConfirmationDialog: FC<ConfirmationDialogProps> = memo<ConfirmationDialogProps>(({
  loading,
  message,
  onConfirm,
  onCancel,
  open,
  title,
  confirmButtonName = 'Delete',
  confirmButtonColor = 'error',
}) => {
  useCloseOnSuccess(loading, onCancel)

  return (
    <DialogForm
      open={open}
      onClose={onCancel}
      width="420px"
    >
      <DialogTitle
        sx={STYLE_DIALOG_TITLE}
      >
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          {title}
          <IconButton
            onClick={onCancel}
            sx={{ p: 0 }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>

      {message && (
        <DialogContent sx={STYLE_DIALOG_CONTENT}>
          <DialogContentText
            variant="body2"
            data-testid="ConfirmationDialogContent"
          >
            {message}
          </DialogContentText>
        </DialogContent>
      )}

      <DialogActions sx={STYLE_DIALOG_ACTIONS}>
        <LoadingButton
          variant="contained"
          color={confirmButtonColor}
          loading={loading}
          onClick={onConfirm}
          data-testid={`${confirmButtonName}Button`}
        >
          {confirmButtonName}
        </LoadingButton>
        <Button
          variant="outlined"
          disabled={loading}
          onClick={onCancel}
          data-testid="CancelButton"
        >
          Cancel
        </Button>
      </DialogActions>
    </DialogForm>
  )
})

function useCloseOnSuccess(
  loading?: boolean,
  onClose?: () => void,
): void {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loading === false && onClose?.() }, [loading])
}

type ButtonColor = OverridableStringUnion<
  'inherit' | 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning',
  ButtonPropsColorOverrides
>
