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
import { memo, useCallback } from 'react'
import { Box, Typography } from '@mui/material'
import { FileUpload } from '@netcracker/qubership-apihub-ui-shared/components/FileUpload'
import { UploadButton } from '@netcracker/qubership-apihub-ui-shared/components/UploadButton'
import { UploadedFilePreview } from '@netcracker/qubership-apihub-ui-shared/components/UploadedFilePreview'
import { transformFileListToFileArray } from '@netcracker/qubership-apihub-ui-shared/utils/files'
import { useDownloadExportTemplate } from './useDownloadExportTemplate'
import { useParams } from 'react-router-dom'
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'

export type TemplateUploadProps = {
  uploadedFile: File | undefined
  setUploadedFile: (file: File | undefined) => void
  groupName: string
  apiType: ApiType
  downloadAvailable: boolean
}
export const TemplateUpload: FC<TemplateUploadProps> = memo<TemplateUploadProps>(({
  uploadedFile,
  setUploadedFile,
  groupName,
  apiType,
  downloadAvailable,
}) => {
  const { packageId, versionId } = useParams()
  const [downloadExportTemplate] = useDownloadExportTemplate()

  const onUpload = useCallback(
    ({ target: { files } }: ChangeEvent<HTMLInputElement>) =>
      setUploadedFile(files ? transformFileListToFileArray(files)[0] : undefined),
    [setUploadedFile])

  const onDrop = useCallback(
    ({ dataTransfer: { files } }: DragEvent<HTMLElement>) =>
      setUploadedFile(transformFileListToFileArray(files)[0]),
    [setUploadedFile])

  const onDelete = useCallback(() => setUploadedFile(undefined), [setUploadedFile])

  const onDownload = useCallback(
    () => downloadExportTemplate({
      packageKey: packageId!,
      version: versionId!,
      groupName: groupName,
      apiType: apiType,
    }),
    [apiType, downloadExportTemplate, groupName, packageId, versionId],
  )

  if (uploadedFile) {
    return (
      <UploadedFilePreview
        file={uploadedFile}
        onDelete={onDelete}
        onDownload={downloadAvailable ? onDownload : undefined}
        testId={downloadAvailable ? 'DownloadableFilePreview' : 'NotDownloadableFilePreview'}
      />
    )
  }

  return (
    <Box>
      <FileUpload onDrop={onDrop}>
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
          <CloudUploadOutlinedIcon sx={{ mr: 1, color: 'grey' }}/>
          <Typography variant="subtitle2" fontSize={13}>
            Drop YAML or JSON file here to attach or
          </Typography>

          <UploadButton
            title="browse"
            onUpload={onUpload}
            buttonSxProp={{ p: 0, ml: 0.5, minWidth: 'auto', height: 1, display: 'flex' }}
            data-testid="BrowseButton"
          />
        </Box>
      </FileUpload>
    </Box>
  )
})
