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
import { memo, useCallback, useEffect, useState } from 'react'
import { Button, DialogActions, DialogContent, DialogTitle, TextField, Typography } from '@mui/material'
import { useEvent } from 'react-use'
import { SHOW_UPLOAD_DIALOG } from '../../../../../../EventBusProvider'

import { LoadingButton } from '@mui/lab'
import { useProject } from '../../../../../useProject'
import { Controller, useForm } from 'react-hook-form'
import { useUploadProjectFiles } from './useUploadProjectFiles'
import { DialogForm } from '@netcracker/qubership-apihub-ui-shared/components/DialogForm'
import { FileListPreview } from '@apihub/components/FileListPreview'
import { FileUpload } from '@netcracker/qubership-apihub-ui-shared/components/FileUpload'
import { UploadButton } from '@netcracker/qubership-apihub-ui-shared/components/UploadButton'

export const UploadFileDialog: FC = memo(() => {
  const [open, setOpen] = useState(false)
  const [path, setPath] = useState('')

  const [project] = useProject()

  useEvent(SHOW_UPLOAD_DIALOG, ({ detail }) => {
    const { path } = detail ?? { path: project?.integration?.defaultFolder ?? '/' }
    setPath(path)
    setOpen(true)
    reset()
  })

  const { handleSubmit, control, reset } = useForm<{ path: string }>()
  const [uploadFiles, setUploadFiles] = useState<File[]>([])
  const [uploadProjectFiles, isLoading] = useUploadProjectFiles()

  useEffect(
    () => {
      if (!isLoading) {
        // TODO: Move to `handleSubmit`
        setUploadFiles([])
        setOpen(false)
      }
    },
    [isLoading],
  )

  const preloadFiles = useCallback(
    (files: FileList | null) => {
      if (files === null) {
        return
      }
      setUploadFiles(prevState => [
        ...prevState,
        ...getUploadFiles(files),
      ])
    },
    [],
  )

  // TODO: Use `DialogForm` component
  return (
    <>
      <DialogForm
        open={open}
        onClose={() => setOpen(false)}
        onSubmit={handleSubmit(() => uploadProjectFiles({ files: uploadFiles, path: path }))}
      >
        <DialogTitle>
          Upload File
        </DialogTitle>

        <DialogContent sx={{ pb: 0, overflow: 'hidden' }}>
          <UploadButton
            multiple
            withIcon
            title="Browse files"
            onUpload={({ target: { files } }) => preloadFiles(files)}
          />
          <Typography variant="button">
            or drop them here
          </Typography>

          <FileUpload onDrop={({ dataTransfer: { files } }) => preloadFiles(files)}>
            <FileListPreview
              value={uploadFiles}
              onDelete={file => setUploadFiles(prevState => prevState.filter(prevFile => prevFile !== file))}
            />
          </FileUpload>

          <Typography variant="button">
            Enter the GIT folder where you want to upload files
          </Typography>
          <Controller
            name="path"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                value={path}
                label="Folder"
                onChange={({ target: { value } }) => setPath(value)}
              />
            )}
          />
        </DialogContent>

        <DialogActions>
          <LoadingButton
            variant="contained"
            type="submit"
            loading={isLoading}
          >
            Add
          </LoadingButton>
          <Button
            variant="outlined"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
        </DialogActions>
      </DialogForm>
    </>
  )
})

function getUploadFiles(files: FileList): File[] {
  const acceptedFiles: File[] = []
  for (const file of files) {
    acceptedFiles.push(file)
  }
  return acceptedFiles
}
