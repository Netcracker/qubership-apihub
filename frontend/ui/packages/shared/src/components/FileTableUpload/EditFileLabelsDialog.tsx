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
import { Button, DialogActions, DialogContent, DialogTitle, IconButton } from '@mui/material'
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import type { PopupProps } from '../PopupDelegate'
import { PopupDelegate } from '../PopupDelegate'
import { DialogForm } from '../DialogForm'
import { Controller, useForm } from 'react-hook-form'
import { LabelsAutocomplete } from '../LabelsAutocomplete'
import { TextWithOverflowTooltip } from '../TextWithOverflowTooltip'

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

export const EditFileLabelsPopup: FC<PopupProps> = memo<PopupProps>(({ open, setOpen, detail }) => {
  const [file, onConfirm, labels] = useMemo(() => {
    const { file, onConfirm, labels } = detail as ShowEditFileLabelsDetail
    return [file, onConfirm, labels]
  }, [detail])

  const defaultValues = useMemo(() => ({
    labels: labels,
  }), [labels])

  const { control, getValues } = useForm<{ labels?: string[] | undefined }>({ defaultValues })

  const onConfirmCallback = useCallback((): void => {
    setOpen(false)
    onConfirm(file, getValues().labels ?? [])
  }, [setOpen, onConfirm, file, getValues])

  const onClose = useCallback(() => {
    setOpen(false)
  }, [setOpen])

  const dialogTitle = `Edit Labels for ${file.name}`

  return (
    <DialogForm
      open={open}
      onClose={onClose}
      width="440px"
    >
      <DialogTitle>
        <TextWithOverflowTooltip tooltipText={dialogTitle} variant="inherit">
          {dialogTitle}
        </TextWithOverflowTooltip>
        <IconButton
          sx={{ position: 'absolute', right: 8, top: 8, color: '#626D82' }}
          onClick={onClose}
        >
          <CloseOutlinedIcon fontSize="small"/>
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ width: 'inherit' }}>
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
      </DialogContent>

      <DialogActions>
        <Button
          variant="contained"
          onClick={onConfirmCallback}
          data-testid="SaveButton"
        >
          Save
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
