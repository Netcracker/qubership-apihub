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

import type { ChangeEvent, DragEvent, FC } from 'react'
import * as React from 'react'
import { memo, useCallback, useMemo } from 'react'
import { Alert, Box, Typography } from '@mui/material'
import { FileUpload } from './FileUpload'
import { UploadButton } from './UploadButton'
import { UploadedFilePreview } from './UploadedFilePreview'
import { CloudUploadIcon } from '../icons/CloudUploadIcon'
import type { FileExtension } from '../utils/files'
import { createFileFormatEnumeration, transformFileListToFileArray } from '../utils/files'
import ErrorOutlinedIcon from '@mui/icons-material/ErrorOutlined'

export type FileUploadFieldProps = {
  uploadedFile: File | undefined
  setUploadedFile: (file: File | undefined) => void
  onDownload?: () => void
  downloadAvailable: boolean
  acceptableExtensions: FileExtension[]
  errorMessage?: string
}

export const FileUploadField: FC<FileUploadFieldProps> = memo<FileUploadFieldProps>(({
  uploadedFile,
  setUploadedFile,
  onDownload,
  downloadAvailable,
  acceptableExtensions,
  errorMessage,
}) => {

  const onUpload = useCallback(
    ({ target: { files } }: ChangeEvent<HTMLInputElement>) =>
      setUploadedFile(files ? transformFileListToFileArray(files)[0] : undefined),
    [setUploadedFile])

  const onDrop = useCallback(
    ({ dataTransfer: { files } }: DragEvent<HTMLElement>) =>
      setUploadedFile(transformFileListToFileArray(files)[0]),
    [setUploadedFile])

  const onDelete = useCallback(() => setUploadedFile(undefined), [setUploadedFile])

  const alert = useMemo(
    () => (
      errorMessage && (
        <Alert
          icon={<ErrorOutlinedIcon color="error"/>}
          severity="error"
          sx={{ p: 0, py: '1px', pl: 2, alignItems: 'center' }}
        >
          {errorMessage}
        </Alert>
      )),
    [errorMessage],
  )

  if (uploadedFile) {
    return (
      <>
        <UploadedFilePreview
          file={uploadedFile}
          onDelete={onDelete}
          onDownload={downloadAvailable ? onDownload : undefined}
        />
        {alert}
      </>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <FileUpload
        onDrop={onDrop}
        acceptableFileTypes={acceptableExtensions}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgb(242, 243, 245)',
            boxSizing: 'border-box',
            borderRadius: '10px',
            width: 1,
            height: '44px',
          }}
        >
          <CloudUploadIcon sx={{ color: '#626D82', mr: '8px' }}/>
          <Typography variant="subtitle2" fontSize={13}>
            {`Drop ${createFileFormatEnumeration(acceptableExtensions)} file here to attach or`}
          </Typography>

          <UploadButton
            title="browse"
            onUpload={onUpload}
            buttonSxProp={{ p: 0, ml: 0.5, minWidth: 'auto', height: 1, display: 'flex' }}
            data-testid="BrowseButton"
            acceptableFileTypes={acceptableExtensions}
          />
        </Box>
      </FileUpload>
      {alert}
    </Box>
  )
})
