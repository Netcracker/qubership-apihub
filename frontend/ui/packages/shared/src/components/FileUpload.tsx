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

import { Box } from '@mui/material'
import type { DragEvent, FC, PropsWithChildren } from 'react'
import { memo, useMemo, useState } from 'react'

export type FileUploadProps = PropsWithChildren<{
  acceptableFileTypes?: string[]
  onDrop: (event: DragEvent<HTMLElement>) => void
}>

// TODO: Replace with native `FileUpload` component when it will be ready
//  Details: https://mui.com/material-ui/discover-more/roadmap/#main-content
export const FileUpload: FC<FileUploadProps> = memo<FileUploadProps>(({ acceptableFileTypes, onDrop, children }) => {
  const [isDragOver, setIsDragOver] = useState<boolean>(false)

  const dragEvents = useMemo(
    () => ({
      onDragEnter: (event: DragEvent<HTMLElement>): void => {
        event.stopPropagation()
        event.preventDefault()
        setIsDragOver(true)
      },
      onDragLeave: (event: DragEvent<HTMLElement>): void => {
        event.stopPropagation()
        event.preventDefault()
        setIsDragOver(false)
      },
      onDragOver: (event: DragEvent<HTMLElement>): void => {
        event.stopPropagation()
        event.preventDefault()
      },
      onDrop: (event: DragEvent<HTMLElement>): void => {
        event.stopPropagation()
        event.preventDefault()
        setIsDragOver(false)
        onDrop(event)
      },
    }),
    [onDrop],
  )

  if (!isDragOver) {
    return (
      <Box
        {...dragEvents}
        children={children}
      />
    )
  }

  return (
    <Box
      component="label"
      {...dragEvents}
      htmlFor="file-upload"
      sx={{
        overflow: 'hidden',
        cursor: 'pointer',
        textAlign: 'center',
        display: 'flex',
        '&:hover p,&:hover svg,& img': { opacity: 1 },
        '& p, svg': { opacity: 1 },
        '&:hover img': { opacity: 0.3 },
        '& img': { opacity: 0.3 },
      }}
    >
      <Box
        component="input"
        id="file-upload"
        multiple
        type="file"
        accept={acceptableFileTypes?.toString()}
        sx={{ display: 'none' }}
        data-testid="FileUpload"
      />

      <Box
        sx={{
          pointerEvents: 'none',
          backgroundColor: 'rgba(242, 243, 245, 0.4)',
          border: '1px dashed #B4BFCF',
          boxSizing: 'border-box',
          borderRadius: '10px',
          width: 1,
          height: 1,
        }}
        children={children}
      />
    </Box>
  )
})
