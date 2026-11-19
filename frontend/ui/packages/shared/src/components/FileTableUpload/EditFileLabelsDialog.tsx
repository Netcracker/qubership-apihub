import type { FC } from 'react'
import { memo, useCallback, useMemo } from 'react'
import { Button, DialogActions, DialogContent, DialogTitle, IconButton, Typography } from '@mui/material'
import { styled } from '@mui/material/styles'
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import type { PopupProps } from '../PopupDelegate'
import { PopupDelegate } from '../PopupDelegate'
import { DialogForm } from '../DialogForm'
import { Controller, useForm } from 'react-hook-form'
import { LabelsAutocomplete } from '../LabelsAutocomplete'

export const EditFileLabelsDialog: FC = memo(() => {
  return (
    <PopupDelegate
      type={SHOW_EDIT_FILE_LABELS_DIALOG}
      render={props => <EditFileLabelsPopup {...props}/>}
    />
  )
})

export const SHOW_EDIT_FILE_LABELS_DIALOG = 'show-edit-file-labels-dialog'

export type ShowEditFileLabelsDetail = {
  file: File
  onConfirm: (file: File, updatedLabels: string[]) => void
  labels: string[] | undefined
}

type EditFileLabelsFormData = {
  labels?: string[]
}

export const EditFileLabelsPopup: FC<PopupProps> = memo<PopupProps>(({ open, setOpen, detail }) => {
  const [file, onConfirm, labels] = useMemo(() => {
    const { file, onConfirm, labels } = detail as ShowEditFileLabelsDetail
    return [file, onConfirm, labels]
  }, [detail])

  const defaultValues = useMemo(() => ({
    labels: labels,
  }), [labels])

  const { control, handleSubmit } = useForm<EditFileLabelsFormData>({ defaultValues })

  const onConfirmCallback = useCallback((data: EditFileLabelsFormData): void => {
    setOpen(false)
    onConfirm(file, data.labels ?? [])
  }, [setOpen, onConfirm, file])

  const onClose = useCallback(() => {
    setOpen(false)
  }, [setOpen])

  return (
    <DialogForm
      open={open}
      onClose={onClose}
      onSubmit={handleSubmit(onConfirmCallback)}
      width="440px"
    >
      <StyledDialogTitle>
        Edit Labels
        <CloseDialogButton onClick={onClose}>
          <CloseOutlinedIcon fontSize="small"/>
        </CloseDialogButton>
      </StyledDialogTitle>

      <StyledDialogContent>
        <Controller
          name="labels"
          control={control}
          render={({ field: { onChange, value } }) => {
            return (
              <LabelsAutocomplete
                onChange={(_, value) => {onChange(value)}}
                value={value}
              />
            )
          }}
        />
        <FileNameCaption variant="body2">
          {`Edit Labels for ${file.name}.`}
        </FileNameCaption>
      </StyledDialogContent>

      <DialogActions>
        <Button
          variant="contained"
          type="submit"
          data-testid="SaveButton"
        >
          Save
        </Button>
        <Button
          variant="outlined"
          type="button"
          onClick={onClose}
          data-testid="CancelButton"
        >
          Cancel
        </Button>
      </DialogActions>
    </DialogForm>
  )
})

const StyledDialogTitle = styled(DialogTitle)(({ theme }) => ({
  color: theme.palette.text.primary,
}))

const CloseDialogButton = styled(IconButton)(({ theme }) => ({
  position: 'absolute',
  right: 8,
  top: 8,
  color: theme.palette.text.secondary,
}))

const StyledDialogContent = styled(DialogContent)({
  width: 'inherit',
  minWidth: 'unset',
  lineHeight: 'normal',
})

const FileNameCaption = styled(Typography)(({ theme }) => ({
  marginTop: theme.spacing(1),
  color: theme.palette.text.primary,
}))
