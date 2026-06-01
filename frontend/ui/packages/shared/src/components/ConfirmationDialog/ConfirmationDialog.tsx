import { LoadingButton } from '@mui/lab'
import { Box, Button, DialogActions, DialogContent, DialogContentText, DialogTitle, IconButton } from '@mui/material'
import type { ButtonPropsColorOverrides } from '@mui/material/Button/Button'
import { styled } from '@mui/material/styles'
import type { OverridableStringUnion } from '@mui/types'
import { type FC, memo, type ReactNode, useEffect } from 'react'

import { CloseIcon } from '../../icons/CloseIcon'
import { DialogForm } from '../DialogForm'

export type ConfirmationDialogProps = {
  open: boolean
  title?: string
  message?: ReactNode
  loading?: boolean
  confirmButtonName?: string
  confirmButtonColor?: ButtonColor
  onConfirm?: () => void
  onCancel?: () => void
}

type ButtonColor = OverridableStringUnion<
  'inherit' | 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning',
  ButtonPropsColorOverrides
>

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
      <StyledDialogTitle>
        <TitleRow>
          {title}
          <CloseIconButton onClick={onCancel}>
            <CloseIcon fontSize="small" />
          </CloseIconButton>
        </TitleRow>
      </StyledDialogTitle>

      {message && (
        <StyledDialogContent>
          <DialogContentText
            variant="body2"
            data-testid="ConfirmationDialogContent"
          >
            {message}
          </DialogContentText>
        </StyledDialogContent>
      )}

      <StyledDialogActions>
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
      </StyledDialogActions>
    </DialogForm>
  )
})

ConfirmationDialog.displayName = 'ConfirmationDialog'

const StyledDialogTitle = styled(DialogTitle)(({ theme }) => ({
  padding: theme.spacing(2.5, 2.5, 0.5),
}))

const TitleRow = styled(Box)({
  display: 'flex',
  alignItems: 'flex-start',
})

const CloseIconButton = styled(IconButton)({
  padding: 0,
  marginLeft: 'auto',
})

const StyledDialogContent = styled(DialogContent)(({ theme }) => ({
  minWidth: 420,
  padding: theme.spacing(0, 6.5, 0.5, 2.5),
}))

const StyledDialogActions = styled(DialogActions)(({ theme }) => ({
  padding: theme.spacing(1.5, 2.5, 2.5),
}))

function useCloseOnSuccess(
  loading?: boolean,
  onClose?: () => void,
): void {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loading === false && onClose?.() }, [loading])
}
