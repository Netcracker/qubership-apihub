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
import { LoadingButton } from '@mui/lab'
import { Box, Button, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material'
import type { FC } from 'react'
import { memo, useCallback, useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'

import { DialogForm } from '@netcracker/qubership-apihub-ui-shared/components/DialogForm'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'

import { useSaveNavSection } from '@portal/api-hooks/docs-backend/admin/useNavigationMutations'
import type { NavSectionRequest } from '@portal/api-hooks/docs-backend/types'
import { ErrorTextField } from '@portal/components/ErrorTextField'

export type NavSectionDraft = Readonly<{
  // undefined = create
  id?: Key
  request: NavSectionRequest
}>

export type NavSectionDialogProps = Readonly<{
  draft: NavSectionDraft | null
  onClose: () => void
}>

type FormData = { title: string; displayOrder: number }

export const NavSectionDialog: FC<NavSectionDialogProps> = memo<NavSectionDialogProps>(({ draft, onClose }) => {
  const open = !!draft
  const [saveSection, isSaving] = useSaveNavSection()
  const { control, handleSubmit, reset, clearErrors } = useForm<FormData>({ defaultValues: { title: '', displayOrder: 0 } })

  useEffect(() => {
    if (draft) {
      reset({ title: draft.request.title, displayOrder: draft.request.displayOrder })
    }
  }, [draft, reset])

  const handleSave = useCallback((data: FormData) => {
    if (!draft) {
      return
    }
    saveSection({ id: draft.id, request: { ...draft.request, title: data.title.trim(), displayOrder: data.displayOrder } }, onClose)
  }, [draft, onClose, saveSection])

  return (
    <DialogForm open={open} onClose={onClose} onSubmit={handleSubmit(handleSave)} maxWidth="xs">
      <DialogTitle>{draft?.id ? 'Edit Section' : 'Create Section'}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Controller
          name="title"
          control={control}
          rules={{ required: 'Title is required' }}
          render={({ field, fieldState }) => (
            <ErrorTextField field={field} fieldState={fieldState} clearErrors={clearErrors} required autoFocus label="Title" disabled={isSaving} data-testid="SectionTitleTextField"/>
          )}
        />
        <Controller
          name="displayOrder"
          control={control}
          render={({ field }) => (
            <TextField {...field} type="number" label="Order" disabled={isSaving} onChange={event => field.onChange(Number(event.target.value))} data-testid="SectionOrderTextField"/>
          )}
        />
      </DialogContent>
      <DialogActions>
        <Box display="flex" gap={1}>
          <LoadingButton variant="contained" type="submit" loading={isSaving} data-testid="SaveSectionButton">Save</LoadingButton>
          <Button variant="outlined" onClick={onClose} data-testid="CancelButton">Cancel</Button>
        </Box>
      </DialogActions>
    </DialogForm>
  )
})
