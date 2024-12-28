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

import type { Dispatch, FC, SetStateAction, SyntheticEvent } from 'react'
import { memo, useEffect, useMemo, useState } from 'react'

import { useEventBus } from '../../../../../EventBusProvider'
import { useBranchConfig } from '../../useBranchConfig'
import { useHasAllBranchPermission } from '../../useHasBranchPermission'
import { useFileSearchParam } from '../../../../useFileSearchParam'
import { TreeView } from '@mui/lab'
import ChevronRightOutlinedIcon from '@mui/icons-material/ChevronRightOutlined'
import ExpandMoreOutlinedIcon from '@mui/icons-material/ExpandMoreOutlined'
import KeyboardArrowDownOutlinedIcon from '@mui/icons-material/KeyboardArrowDownOutlined'
import { Box, MenuItem, Tooltip, Typography } from '@mui/material'

import { FilesTabPanelSidebarSkeleton } from './FilesTabPanelSidebarSkeleton'
import { InteractiveTreeItem } from './InteractiveTreeItem/InteractiveTreeItem'
import { useIsFilesProjectEditorMode } from '../../useProjectEditorMode'
import { useSelectedFile } from '../../useSelectedFile'
import { CollapsibleNavPanel } from '../CollapsibleNavPanel'
import { ImportFromGitDialog } from './ImportFromGitDialog/ImportFromGitDialog'
import { UploadFileDialog } from './UploadFileDialog/UploadFileDialog'
import { ImportByUrlDialog } from './ImportByUrlDialog/ImportByUrlDialog'
import { CreateFileDialog } from './CreateFileDialog/CreateFileDialog'
import { RenameFileDialog } from './RenameFileDialog/RenameFileDialog'
import { MoveFileDialog } from './MoveFileDialog'

import { useDereferencedSpec } from '../../useDereferencedSpec'
import { buildProjectFileTree, getRelatives } from '@apihub/utils/trees'
import { useSetSearchParams } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSetSearchParams'
import { FILES_PROJECT_EDITOR_MODE } from '@apihub/entities/editor-modes'
import { NAVIGATION_PLACEHOLDER_AREA, Placeholder } from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'
import { isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import { MenuButton } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/MenuButton'
import { DeleteContentDialog } from './DeleteContentDialog/DeleteContentDialog'
import { EMPTY_GIT_FILE } from '@apihub/entities/git-files'
import { UNKNOWN_FILE_FORMAT } from '@netcracker/qubership-apihub-ui-shared/utils/files'
import { UNMODIFIED_CHANGE_STATUS } from '@netcracker/qubership-apihub-ui-shared/entities/change-statuses'
import { SidebarTabPanel } from '@apihub/components/SidebarTabPanel'
import { useBranchCacheDocument } from '../../useBranchCache'
import { UNKNOWN_SPEC_TYPE } from '@netcracker/qubership-apihub-ui-shared/utils/specs'

export const FilesTabPanel: FC = memo(() => {
  const visible = useIsFilesProjectEditorMode()
  const { key: selectedFileKey, name: selectedFileName } = useSelectedFile() ?? { key: '', name: '' }
  const { showImportFromGitDialog, showUploadDialog, showImportByUrlDialog, showCreateFileDialog } = useEventBus()
  const [branchConfig, isLoading] = useBranchConfig()
  const fileTree = useMemo(() => buildProjectFileTree([...(branchConfig?.files ?? [])]), [branchConfig?.files])
  const setSearchParams = useSetSearchParams()
  const [expanded, setExpanded] = useExpanded()
  const hasAllPermission = useHasAllBranchPermission()
  const [dereferencedSpec] = useDereferencedSpec(selectedFileKey)
  const [{ type = UNKNOWN_SPEC_TYPE } = {}] = useBranchCacheDocument(selectedFileKey)

  if (!visible) {
    return null
  }

  return (
    <>
      <SidebarTabPanel
        value={FILES_PROJECT_EDITOR_MODE}
        header={
          <Typography variant="h3" noWrap>Files</Typography>
        }
        body={
          <>
            {
              isLoading
                ? <FilesTabPanelSidebarSkeleton count={6}/>
                : <Placeholder
                  invisible={isNotEmpty(fileTree)}
                  area={NAVIGATION_PLACEHOLDER_AREA}
                  message="No files"
                >
                  <TreeView
                    sx={{
                      flexGrow: 1,
                      maxWidth: '100%',
                      overflow: 'auto',
                      px: 0.25,
                      py: 2,
                      p: 0,
                    }}
                    defaultCollapseIcon={<ExpandMoreOutlinedIcon/>}
                    defaultExpandIcon={<ChevronRightOutlinedIcon/>}
                    selected={selectedFileKey}
                    expanded={expanded}
                    onNodeToggle={(_: SyntheticEvent, nodeIds: string[]) => setExpanded(nodeIds)}
                    onNodeSelect={(_: SyntheticEvent, nodeId: string) => {
                      const selectedFile = branchConfig?.files.find(({ key }) => key === nodeId)
                      if (selectedFile) {
                        setSearchParams({ file: selectedFile.key })
                      }
                    }}
                  >
                    {
                      fileTree.map(file => (
                        <InteractiveTreeItem key={file.key} nodeId={file.key} file={file} level={1}/>
                      ))
                    }
                  </TreeView>
                </Placeholder>
            }
            {!isLoading &&
              <Tooltip
                title={!hasAllPermission ? 'You do not have permissions to commit to the current branch in GitLab' : ''}
                placement={'right'}
              >
                <Box sx={{ mb: 2, mx: 2 }}>
                  <MenuButton
                    sx={{
                      '&.MuiButtonBase-root.MuiButton-root.Mui-disabled': {
                        color: 'white',
                        backgroundColor: 'rgba(0, 187, 91, 0.4)',
                      },
                      width: '100%',
                      }}
                    disabled={!hasAllPermission}
                    variant="added"
                    title="Add"
                    icon={<KeyboardArrowDownOutlinedIcon/>}
                    alignItems="center"
                  >
                    <MenuItem onClick={() => showImportFromGitDialog()}>Import from GIT</MenuItem>
                    <MenuItem onClick={() => showUploadDialog()}>Upload</MenuItem>
                    <MenuItem onClick={() => showImportByUrlDialog()}>Import by URL</MenuItem>
                    <MenuItem onClick={() => showCreateFileDialog()}>Create</MenuItem>
                  </MenuButton>
                </Box>
              </Tooltip>
            }
          </>
        }
      />

      <CollapsibleNavPanel
        filename={selectedFileName}
        content={dereferencedSpec}
        type={type}
      />

      <ImportFromGitDialog/>
      <UploadFileDialog/>
      <ImportByUrlDialog/>
      <CreateFileDialog/>
      <RenameFileDialog/>
      <MoveFileDialog/>
      <DeleteContentDialog/>
    </>
  )
})

function useExpanded(): [string[], Dispatch<SetStateAction<string[]>>] {
  const [branchConfig] = useBranchConfig()
  const fileTree = useMemo(() => buildProjectFileTree([...(branchConfig?.files ?? [])]), [branchConfig?.files])
  const [file] = useFileSearchParam()
  const setSearchParams = useSetSearchParams()
  const [expanded, setExpanded] = useState<string[]>([])

  useEffect(() => {
    const selectedFile = branchConfig?.files.find(({ key }) => key === file)
    if (selectedFile) {
      const { parents } = getRelatives(selectedFile.key, {
        ...EMPTY_GIT_FILE,
        format: UNKNOWN_FILE_FORMAT,
        status: UNMODIFIED_CHANGE_STATUS,
        children: fileTree,
      })
      const parentKeys = parents.map(({ key }) => key)
      const selectedFileKey = selectedFile.key.replace(`/${selectedFile.name}`, '')
      parentKeys.length > 0 && !expanded.includes(selectedFileKey) && setExpanded([...expanded, ...parentKeys])
    }
  }, [expanded, file, fileTree, branchConfig?.files, setSearchParams])

  return [expanded, setExpanded]
}
