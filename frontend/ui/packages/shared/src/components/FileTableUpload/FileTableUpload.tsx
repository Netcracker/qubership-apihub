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

import { Box, Button, IconButton, Tooltip, Typography } from '@mui/material'
import type { ChangeEvent, DragEvent, FC, PropsWithChildren, ReactNode } from 'react'
import { memo, useCallback, useMemo, useState } from 'react'
import borderSvg from './border.svg'
import { ClockBackwardIcon } from '../../icons/ClockBackwardIcon'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import { CloudUploadIcon } from '../../icons/CloudUploadIcon'
import { transformFileListToFileArray } from '../../utils/files'
import { DeleteIcon } from '../../icons/DeleteIcon'
import { isNotEmptyRecord } from '../../utils/arrays'
import { FileTable } from './FileTable'
import { EditIcon } from '../../icons/EditIcon'

export type FileLabelsRecord = Record<string, { file: File; labels: string[] }>

export type FileTableUploadProps = PropsWithChildren<{
  acceptableFileTypes?: string[]
  uploadFilesMap: FileLabelsRecord
  onAddFiles: (files: File[]) => void
  getFileClickHandler: (file: File) => ((file: File) => void) | null
  getFileLeftIcon: (files: File) => ReactNode
  getFileRightIcon: (files: File) => ReactNode
  getFileActions: (file: File) => ReactNode
  showPlaceholder?: boolean
  isLoading: boolean
}>

export const FileTableUpload: FC<FileTableUploadProps> = memo<FileTableUploadProps>(({
  acceptableFileTypes,
  uploadFilesMap,
  onAddFiles,
  getFileClickHandler,
  getFileLeftIcon,
  getFileRightIcon,
  getFileActions,
  showPlaceholder,
  isLoading,
}) => {
  const [isDragOver, setIsDragOver] = useState<boolean>(false)
  const hasFiles = isNotEmptyRecord(uploadFilesMap)
  const showTable = showPlaceholder || isLoading

  const handleCommonDragEvent = (event: DragEvent<HTMLElement>): void => {
    event.stopPropagation()
    event.preventDefault()
  }

  const dragEvents = useMemo(
    () => ({
      onDragEnter: (event: DragEvent<HTMLElement>): void => {
        handleCommonDragEvent(event)
        setIsDragOver(true)
      },
      onDragLeave: (event: DragEvent<HTMLElement>): void => {
        handleCommonDragEvent(event)
        setIsDragOver(false)
      },
      onDragOver: (event: DragEvent<HTMLElement>): void => {
        handleCommonDragEvent(event)
      },
      onDrop: (event: DragEvent<HTMLElement>): void => {
        handleCommonDragEvent(event)
        setIsDragOver(false)
        const { dataTransfer: { files } } = event
        onAddFiles(transformFileListToFileArray(files))
      },
    }),
    [onAddFiles],
  )

  const onFileInputChange = useCallback(({ target: { files } }: ChangeEvent<HTMLInputElement>) => {
    if (files !== null) {
      onAddFiles(transformFileListToFileArray(files))
    }
  }, [onAddFiles])

  const filesTable = useMemo(() => (
      <>
        {showTable && (
          <FileTable
            isLoading={isLoading}
            showPlaceholder={showPlaceholder}
            filesMap={uploadFilesMap}
            getFileClickHandler={getFileClickHandler}
            getFileActions={getFileActions}
            getFileLeftIcon={getFileLeftIcon}
            getFileRightIcon={getFileRightIcon}
          />
        )}
      </>
    ),
    [showTable, isLoading, showPlaceholder, uploadFilesMap, getFileClickHandler, getFileActions, getFileLeftIcon, getFileRightIcon],
  )

  if (!isDragOver && showTable) {
    return (
      <Box
        {...dragEvents}
        sx={{
          height: 1,
        }}
        children={filesTable}
      />
    )
  }

  return (
    <Box
      component="label"
      {...dragEvents}
      htmlFor="file-upload"
      sx={{
        position: 'relative',
        cursor: 'pointer',
        display: 'flex',
        height: 1,
      }}
      data-testid="FileUpload"
    >
      <Box
        component="input"
        id="file-upload"
        multiple
        type="file"
        accept={acceptableFileTypes?.toString()}
        onChange={onFileInputChange}
        sx={{ display: 'none' }}
      />
      <Box
        sx={{
          position: 'absolute',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: '8px',
          pointerEvents: 'none',
          backgroundColor: 'rgba(242, 243, 245, 0.4)',
          backgroundImage: `url(${borderSvg})`,
          boxSizing: 'border-box',
          borderRadius: '10px',
          width: 1,
          height: 1,
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
          <CloudUploadIcon sx={{ fontSize: 56, color: '#626D82' }}/>
          <Box sx={{ display: 'flex', gap: 0.5, width: 'fit-content', alignItems: 'center' }}>
            <Typography variant="h2" color="#626D82">
              {hasFiles ? 'Drop files here to attach' : 'Drop files here to attach or'}
            </Typography>
            {!hasFiles &&
              <Button sx={{ p: 0, lineHeight: '22px', fontSize: '15px', minWidth: 'fit-content' }} data-testid="BrowseButton">browse</Button>
            }
          </Box>
        </Box>
      </Box>
      <Box sx={{ pointerEvents: 'none' }}>
        {filesTable}
      </Box>
    </Box>
  )
})

export const FileActions: FC<{
  file: File
  onDeleteAction: (file: File) => void
  onEditAction: (file: File) => void
  onRestoreAction?: ((file: File) => void) | null
}> = memo(({
  file,
  onDeleteAction,
  onEditAction,
  onRestoreAction,
}) => {
  const handleDelete = useCallback(() => {
    onDeleteAction(file)
  }, [onDeleteAction, file])

  const handleEdit = useCallback(() => {
    onEditAction(file)
  }, [onEditAction, file])

  const handleRestore = useCallback(() => {
    onRestoreAction?.(file)
  }, [onRestoreAction, file])

  return (
    <Box
      sx={{
        display: 'flex',
        gap: '8px',
        justifyContent: 'flex-end',
      }}
    >
      {onRestoreAction && <Tooltip title="Restore previous file">
        <IconButton
          size="small"
          sx={{ visibility: 'hidden', p: 0 }}
          className="hoverable"
          onClick={handleRestore}
          data-testid="RestoreButton"
        >
          <ClockBackwardIcon sx={{ color: '#626D82', fontSize: 20 }}/>
        </IconButton>
      </Tooltip>}
      <Tooltip title="Remove">
        <IconButton
          sx={{ visibility: 'hidden', p: 0 }}
          className="hoverable"
          onClick={handleDelete}
          data-testid="RemoveButton"
        >
          <DeleteIcon color="#626D82"/>
        </IconButton>
      </Tooltip>
      <Tooltip title="Edit">
        <IconButton
          sx={{ visibility: 'hidden', p: 0 }}
          className="hoverable"
          onClick={handleEdit}
          data-testid="EditButton"
        >
          <EditIcon color="#626D82"/>
        </IconButton>
      </Tooltip>
    </Box>
  )
})

export const FileInfoIcon: FC = memo(() => {
  return <Tooltip
    title={
      <>
        This file has replaced one with the same name.<br/>
        You can restore previous file in place of the new one by clicking Restore icon.
      </>
    }
    PopperProps={{
      sx: { '.MuiTooltip-tooltip': { maxWidth: 'unset' } },
    }}
  >
    <InfoOutlinedIcon sx={{ color: '#626D82', cursor: 'pointer', marginLeft: '6px' }} fontSize="small"/>
  </Tooltip>
})
