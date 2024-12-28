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

import type { ChangeEvent, FC, ReactNode } from 'react'
import { memo, useCallback, useEffect, useState } from 'react'
import { Box, Tooltip } from '@mui/material'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import { useEventBus } from '../../../EventBusProvider'
import { useFileActions, useFiles, useFilesLoading } from '../FilesProvider'
import { specTypeViewers } from '@netcracker/qubership-apihub-ui-shared/components/SpecificationDialog/useSpecViewer'
import { isEmpty, isNotEmpty, isNotEmptyRecord } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import { SpecLogo } from '@netcracker/qubership-apihub-ui-shared/components/SpecLogo'
import { getFileExtension, transformFileListToFileArray } from '@netcracker/qubership-apihub-ui-shared/utils/files'
import {
  FileActions,
  FileInfoIcon,
  FileTableUpload,
} from '@netcracker/qubership-apihub-ui-shared/components/FileTableUpload/FileTableUpload'
import { BodyCard } from '@netcracker/qubership-apihub-ui-shared/components/BodyCard'
import { SearchBar } from '@netcracker/qubership-apihub-ui-shared/components/SearchBar'
import { filesRecordToArray, sortFilesRecord } from '@apihub/routes/root/PortalPage/PackagePage/files'
import { find, xorBy } from 'lodash-es'
import { UploadButton } from '@netcracker/qubership-apihub-ui-shared/components/UploadButton'

const PREVIEWABLE_FILE_TYPES = Object.keys(specTypeViewers)

export const VersionConfigurationSubPage: FC = memo(() => {
  const { showSpecificationDialog, showDeleteFileDialog, showEditFileLabelsDialog } = useEventBus()
  const [searchValue, setSearchValue] = useState('')

  const { fileTypesMap, filesWithLabels, replacedFiles, sources } = useFiles()
  const isFilesLoading = useFilesLoading()

  const { addFiles, deleteFile, editFile, restoreFile } = useFileActions()

  const filesWithLabelsArray = filesRecordToArray(filesWithLabels)
  const hasChanges = isNotEmpty(replacedFiles) || isNotEmpty(xorBy(sources, filesWithLabelsArray, 'name'))

  const sortedFiles = sortFilesRecord(filesWithLabels, searchValue)

  const handleAdd = useCallback((files: File[]): void => {
    addFiles(files)
  }, [addFiles])

  const handleOnChange = useCallback(({ target: { files } }: ChangeEvent<HTMLInputElement>) => {
    if (files !== null) {
      handleAdd(transformFileListToFileArray(files))
    }
  }, [handleAdd])

  const handleDelete = useCallback((file: File): void => {
    showDeleteFileDialog({
      file: file,
      onConfirm: () => deleteFile(file.name),
    })
  }, [deleteFile, showDeleteFileDialog])

  const handleEdit = useCallback((file: File): void => {
    showEditFileLabelsDialog({
      file: file,
      labels: sortedFiles[file.name].labels,
      onConfirm: (file, updatedLabels) => editFile(file.name, updatedLabels),
    })
  }, [editFile, sortedFiles, showEditFileLabelsDialog])

  const handleRestore = useCallback((file: File): void => {
    restoreFile(file.name)
  }, [restoreFile])

  const getFileIcon = useCallback((file: File) => <SpecLogo value={fileTypesMap.get(file.name)}/>,
    [fileTypesMap],
  )

  const handleClick = useCallback((file: File): void => {
    file.text().then(value => {
      showSpecificationDialog({
        spec: {
          key: file.name,
          name: file.name,
          extension: getFileExtension(file.name),
          type: fileTypesMap.get(file.name)!,
        },
        value: value,
      })
    })
  }, [fileTypesMap, showSpecificationDialog])

  const getFileClickHandler = useCallback((file: File): ((file: File) => void) | null => {
    return PREVIEWABLE_FILE_TYPES.includes(fileTypesMap.get(file.name)!) ? handleClick : null
  }, [fileTypesMap, handleClick])

  const getFileActions = useCallback((file: File): ReactNode => {
    return <FileActions
      file={file}
      onDeleteAction={handleDelete}
      onEditAction={handleEdit}
      onRestoreAction={find(replacedFiles, ['name', file.name]) ? handleRestore : null}
    />
  }, [handleDelete, handleEdit, replacedFiles, handleRestore])

  const getFileInfoIcon = useCallback(({ name }: File): ReactNode => {
    return find(replacedFiles, { name }) ? <FileInfoIcon/> : null
  }, [replacedFiles])

  useEffect(() => {
    if (!hasChanges) {
      return
    }
    const handleOnBeforeUnload = (event: BeforeUnloadEvent): void => event.preventDefault()
    window.addEventListener('beforeunload', handleOnBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleOnBeforeUnload)
  }, [hasChanges])

  return (
    <BodyCard
      header={
        <Box sx={{
          gap: '4px',
          display: 'flex',
          alignItems: 'center',
        }}>
          Configure Package Version
          <Tooltip
            title="Drag and drop files onto the page or click Browse Files button"
            PopperProps={{
              sx: { '.MuiTooltip-tooltip': { maxWidth: 'unset' } },
            }}
          >
            <InfoOutlinedIcon sx={{ color: '#626D82' }} fontSize="small"/>
          </Tooltip>
        </Box>
      }
      action={
        <Box display="flex" gap={2}>
          {isNotEmptyRecord(filesWithLabels) && <SearchBar
            placeholder="Search file"
            value={searchValue}
            onValueChange={setSearchValue}
            sx={{ width: '240px' }}
            data-testid="SearchFile"
          />}
          <UploadButton
            multiple
            onUpload={handleOnChange}
            variant="contained"
            title="Browse Files"
            data-testid="BrowseFilesButton"
          />
        </Box>
      }
      body={
        <FileTableUpload
          uploadFilesMap={{ ...sortedFiles }}
          onAddFiles={handleAdd}
          getFileClickHandler={getFileClickHandler}
          getFileLeftIcon={getFileIcon}
          getFileRightIcon={getFileInfoIcon}
          getFileActions={getFileActions}
          showPlaceholder={isNotEmptyRecord(filesWithLabels) && isEmpty(sortedFiles)}
          isLoading={isFilesLoading}
        />
      }
      overrideBodySx={{
        p: 3,
        pb: '24px !important', // overrides global MuiCardContent.styleOverrides
      }}
    />
  )
})
