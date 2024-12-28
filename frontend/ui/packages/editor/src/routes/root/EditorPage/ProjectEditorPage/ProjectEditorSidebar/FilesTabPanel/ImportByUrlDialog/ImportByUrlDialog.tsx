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
import { memo, useEffect, useState } from 'react'
import { Alert, Button, DialogActions, DialogContent, DialogTitle, TextField, Typography } from '@mui/material'
import { useEvent } from 'react-use'

import { SHOW_IMPORT_BY_URL_DIALOG } from '../../../../../../EventBusProvider'
import { LoadingButton } from '@mui/lab'
import { Controller, useForm } from 'react-hook-form'
import { useProject } from '../../../../../useProject'
import { useImportProjectFile } from './useImportProjectFile'
import { DialogForm } from '@netcracker/qubership-apihub-ui-shared/components/DialogForm'

export const ImportByUrlDialog: FC = memo(() => {
  const [open, setOpen] = useState(false)
  const [path, setPath] = useState('')

  const [project] = useProject()

  useEvent(SHOW_IMPORT_BY_URL_DIALOG, ({ detail }) => {
    const { path } = detail ?? { path: project?.integration?.defaultFolder ?? '/' }
    setPath(path)
    setOpen(true)
    reset()
  })

  const { handleSubmit, control, reset } = useForm<{ url: string; path: string }>()
  const [importProjectFile, isLoading, isError] = useImportProjectFile()

  useEffect(() => {!isLoading && !isError && setOpen(false)}, [isLoading, isError])
  useEffect(() => {!open && reset()}, [open, reset])

  return (
    <DialogForm
      open={open}
      onClose={() => setOpen(false)}
      onSubmit={handleSubmit(importProjectFile)}
    >
      <DialogTitle>
        Import By URL
      </DialogTitle>

      <DialogContent>
        <Controller
          name="url"
          control={control}
          defaultValue=""
          render={({ field }) => (
            <TextField
              {...field}
              autoFocus required
              type="url"
              label="URL"
            />
          )}
        />
        <Typography variant="button">Enter the GIT folder where you want to upload files</Typography>
        <Controller
          name="path"
          control={control}
          defaultValue={path}
          render={({ field }) => (
            <TextField
              {...field}
              label="Folder"
            />
          )}
        />
        {isError && (
          <Alert severity="error" sx={{ mt: 1 }}>
            The file is not available at the URL. Try to download and upload file directly
          </Alert>
        )}
      </DialogContent>

      <DialogActions>
        <LoadingButton variant="contained" type="submit" loading={isLoading}>
          Import
        </LoadingButton>
        <Button variant="outlined" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </DialogActions>
    </DialogForm>
  )
})
