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
import { memo } from 'react'
import { Box, IconButton } from '@mui/material'
import Typography from '@mui/material/Typography'
import { DeleteIcon } from '../icons/DeleteIcon'
import { FileIcon } from '../icons/FileIcon'
import type { TestableProps } from './Testable'

export type UploadedFilePreviewProps = {
  file: File
  onDelete: () => void
  onDownload?: () => void
} & TestableProps

export const UploadedFilePreview: FC<UploadedFilePreviewProps> = memo<UploadedFilePreviewProps>(({
  file,
  onDelete,
  onDownload,
  testId,
}) => {
  const color = onDownload ? DOWNLOAD_AVAILABLE_COLOR : 'black'

  return (
    <Box display="flex" alignItems="center" data-testid={testId}>
      <Box onClick={onDownload} sx={{ display: 'flex', gap: 0.5, cursor: onDownload ? 'pointer' : 'default' }}>
        <FileIcon color={color}/>
        <Typography variant="subtitle2" fontSize={13} color={color}>{file.name}</Typography>
      </Box>
      <IconButton onClick={onDelete} sx={{ ml: 'auto' }} data-testid="DeleteButton">
        <DeleteIcon color="#353C4E"/>
      </IconButton>
    </Box>
  )
})

export const DOWNLOAD_AVAILABLE_COLOR = '#005DCF'
