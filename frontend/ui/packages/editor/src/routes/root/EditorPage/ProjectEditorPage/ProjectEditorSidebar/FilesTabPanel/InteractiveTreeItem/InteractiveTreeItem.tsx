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

import type { TreeItemProps } from '@mui/lab'
import { TreeItem, treeItemClasses } from '@mui/lab'
import { styled } from '@mui/material/styles'
import { memo, useMemo, useState } from 'react'
import { useEventBus } from '../../../../../../EventBusProvider'
import { useHasEditBranchPermission } from '../../../useHasBranchPermission'
import { useRestoreProjectFile } from './useRestoreProjectFile'
import { useUpdateProjectFileMeta } from '../../../useUpdateProjectFileMeta'
import { Box, Button, Divider, MenuItem, Typography } from '@mui/material'
import FolderIcon from '@mui/icons-material/Folder'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import type { TreeProjectFile } from '@apihub/utils/trees'
import { useSystemInfo } from '@netcracker/qubership-apihub-ui-shared/features/system-info'
import {
  ADDED_CHANGE_STATUS,
  DELETED_CHANGE_STATUS,
  EXCLUDED_CHANGE_STATUS, STATUS_COLORS,
} from '@netcracker/qubership-apihub-ui-shared/entities/change-statuses'
import { isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import { FileIcon } from '@netcracker/qubership-apihub-ui-shared/icons/FileIcon'
import { ComponentIcon } from '@netcracker/qubership-apihub-ui-shared/icons/ComponentIcon'
import { OverflowTooltip } from '@netcracker/qubership-apihub-ui-shared/components/OverflowTooltip'
import { MenuButton } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/MenuButton'

export type InteractiveTreeItemProps = {
  file: TreeProjectFile
  level: number
} & TreeItemProps

export const InteractiveTreeItem = styled(memo<InteractiveTreeItemProps>(({ file, level, ...props }) => {
  const { key, name, status, children, publish } = file
  const [actionMenuOpen, setActionMenuOpen] = useState(false)
  const {
    showImportFromGitDialog,
    showUploadDialog,
    showImportByUrlDialog,
    showCreateFileDialog,
    showRenameFileDialog,
    showMoveFileDialog,
    showDeleteContentDialog,
  } = useEventBus()
  const [restoreProjectFile] = useRestoreProjectFile()
  const hasEditPermission = useHasEditBranchPermission()
  const { productionMode } = useSystemInfo()
  const [updateFileMeta] = useUpdateProjectFileMeta()

  const isFileNotRemoved = useMemo(() => status !== EXCLUDED_CHANGE_STATUS && status !== DELETED_CHANGE_STATUS, [status])
  const isFileCanBeRestored = useMemo(() => status !== ADDED_CHANGE_STATUS && status !== DELETED_CHANGE_STATUS, [status])
  const isDeleteFolderAvailable = useMemo(() => children?.find(({ status }) => status !== DELETED_CHANGE_STATUS && status !== EXCLUDED_CHANGE_STATUS), [children])

  const actionButtonStyle = useMemo(() => {
    return {
      ml: 1,
      visibility: actionMenuOpen ? 'visible' : 'hidden',
      backgroundColor: actionMenuOpen ? '#E8E8E8' : 'transparent',
      '&:hover': {
        backgroundColor: '#ECEDEF',
      },
      width: 24,
      minWidth: 24,
      height: 24,
    }
  }, [actionMenuOpen])

  return (
    <>
      <TreeItem
        {...props}
        label={
          <Box display="flex" alignItems="center" height={24}>
            {isNotEmpty(children)
              ? <FolderIcon sx={{ color: '#FFB02E' }} fontSize="small"/>
              : publish ? <FileIcon/> : <ComponentIcon/>}
            <OverflowTooltip title={name} placement="right">
              <Typography
                noWrap
                variant="body2"
                sx={{
                  ml: 1,
                  color: status && STATUS_COLORS[status],
                  flexGrow: 1,
                  direction: isNotEmpty(children) ? 'rtl' : 'ltr',
                }}
              >
                {name}
              </Typography>
            </OverflowTooltip>
            {hasEditPermission && (
              isFileNotRemoved
                ? (
                  <MenuButton
                    sx={actionButtonStyle}
                    size="small"
                    icon={<MoreVertIcon sx={{ color: '#626D82' }} fontSize="small"/>}
                    onClick={event => {
                      event.stopPropagation()
                      setActionMenuOpen(true)
                    }}
                    onItemClick={event => event.stopPropagation()}
                    onClose={() => setActionMenuOpen(false)}
                  >
                    {isNotEmpty(children)
                      ? (
                        <Box>
                          <MenuItem onClick={() => showImportFromGitDialog({ folderKey: key })}>
                            Import from GIT
                          </MenuItem>
                          <MenuItem onClick={() => showUploadDialog({ path: key })}>
                            Upload
                          </MenuItem>
                          <MenuItem onClick={() => showImportByUrlDialog({ path: key })}>
                            Import by URL
                          </MenuItem>
                          <MenuItem onClick={() => showCreateFileDialog({ path: key })}>
                            Create
                          </MenuItem>
                          {isDeleteFolderAvailable && (
                            <MenuItem sx={{ color: '#FF5260' }}
                                      onClick={() => showDeleteContentDialog({ key: key, name: name, isFolder: true })}>
                              Delete
                            </MenuItem>
                          )}
                          <Divider orientation="horizontal" variant="fullWidth"/>
                          <MenuItem onClick={() => updateFileMeta({ key: key, publish: true, bulk: true })}>
                            Convert to document
                          </MenuItem>
                          <MenuItem onClick={() => updateFileMeta({ key: key, publish: false, bulk: true })}>
                            Convert to component
                          </MenuItem>
                        </Box>
                      )
                      : (
                        <Box>
                          {!productionMode && (
                            <MenuItem onClick={() => showRenameFileDialog({ file })}>
                              Rename
                            </MenuItem>
                          )}
                          {!productionMode && (
                            <MenuItem onClick={() => showMoveFileDialog({ file })}>
                              Move
                            </MenuItem>
                          )}
                          <MenuItem sx={{ color: '#FF5260' }}
                                    onClick={() => showDeleteContentDialog({ key: key, name: name, isFolder: false })}>
                            Delete
                          </MenuItem>
                          <Divider orientation="horizontal" variant="fullWidth"/>
                          <MenuItem onClick={() => updateFileMeta({ key: file.key, publish: !file.publish })}>
                            Convert to {publish ? 'component' : 'document'}
                          </MenuItem>
                        </Box>
                      )}
                  </MenuButton>
                )
                : isFileCanBeRestored
                  ? <Button
                    sx={actionButtonStyle}
                    onClick={event => {
                      event.stopPropagation()
                      restoreProjectFile(key)
                    }}
                  >
                    Restore
                  </Button>
                  : null
            )}
          </Box>
        }
      >
        {isNotEmpty(children) && children?.map((file) => (
          <InteractiveTreeItem key={file.key} nodeId={file.key} file={file} level={level + 1}/>
        ))}
      </TreeItem>
    </>
  )
}))(({ level = 1 }) => ({
  [`& .${treeItemClasses.label}`]: {
    '& .MuiBox-root': {
      '&:hover': {
        '& .MuiButtonBase-root': {
          visibility: 'visible',
        },
      },
    },
  },
  [`& .${treeItemClasses.group}`]: {
    marginLeft: 0,
    [`& .${treeItemClasses.content}`]: {
      paddingLeft: 8 * level * 2 + 8,
    },
  },
}))
