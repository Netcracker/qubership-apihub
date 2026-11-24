import type { FC } from 'react'
import { memo, useCallback, useMemo } from 'react'
import { Button, DialogActions, DialogContent, DialogContentText, DialogTitle, IconButton } from '@mui/material'
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import { styled } from '@mui/material/styles'
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
  file?: File
  title?: string
  message?: string
  onConfirm: () => void
}

export const DeleteFilePopup: FC<PopupProps> = memo<PopupProps>(({ open, setOpen, detail }) => {
  const [file, title, message, onConfirm] = useMemo(() => {
    const { file, title, message, onConfirm } = detail as ShowDeleteFileDetail
    return [file, title, message, onConfirm]
  }, [detail])

  const dialogTitle = title ?? `Delete ${file?.name}?`

  const onConfirmCallback = useCallback((): void => {
    setOpen(false)
    onConfirm()
  }, [onConfirm, setOpen])

  const onClose = useCallback(() => {
    setOpen(false)
  }, [setOpen])

  return (
    <DialogForm
      open={open}
      onClose={onClose}
      width={message ? '420px' : '330px'}
    >
      <DeleteDialogTitle>
        {dialogTitle}
        <CloseDialogButton onClick={onClose}>
          <CloseOutlinedIcon fontSize="small"/>
        </CloseDialogButton>
      </DeleteDialogTitle>
      {message && (
        <DeleteDialogContent>
          <DeleteDialogContentText variant="body2">
            {message}
          </DeleteDialogContentText>
        </DeleteDialogContent>
      )}
      <DeleteDialogActions $hasMessage={!!message}>
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
      </DeleteDialogActions>
    </DialogForm>
  )
})

const DeleteDialogTitle = styled(DialogTitle)(({ theme }) => ({
  paddingRight: theme.spacing(6),
  whiteSpace: 'normal',
  overflowWrap: 'anywhere',
  color: theme.palette.text.primary,
}))

const CloseDialogButton = styled(IconButton)(({ theme }) => ({
  position: 'absolute',
  right: 8,
  top: 8,
  color: theme.palette.text.secondary,
}))

const DeleteDialogContent = styled(DialogContent)({
  minWidth: 'unset',
  width: 'auto',
  paddingBottom: 0,
})

const DeleteDialogContentText = styled(DialogContentText)(({ theme }) => ({
  color: theme.palette.text.primary,
  overflowWrap: 'anywhere',
}))

const DeleteDialogActions = styled(DialogActions, {
  shouldForwardProp: prop => prop !== '$hasMessage',
})<{ $hasMessage: boolean }>(({ $hasMessage }) => ({
  paddingTop: $hasMessage ? undefined : 0,
}))
