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
import { memo, useState } from 'react'
import { useEventBus } from '../../../../../EventBusProvider'
import { useSetSelectedConflictedBlobKey } from '../../ConflictedBlobKeyProvider'
import { LoadingButton } from '@mui/lab'
import { Box, List, ListItemButton, ListItemIcon, ListItemText, MenuItem, Typography } from '@mui/material'

import { useBranchConfig } from '../../useBranchConfig'
import { useHasEditBranchPermission } from '../../useHasBranchPermission'
import { useProjectFileContent } from '../../useProjectFileContent'
import { useResetBranch } from './useResetBranch'
import { useChangeSearchParam } from '../../../../useChangeSearchParam'

import { useIsChangesProjectEditorMode } from '../../useProjectEditorMode'
import { useSelectedChange } from '../../useSelectedChange'
import { CollapsibleNavPanel } from '../CollapsibleNavPanel'
import { ChangesTabItem } from './ChangesTabItem'
import { SaveChangesDialog } from './SaveChangesDialog'
import { ForceSaveChangesDialog } from './ForceSaveChangesDialog'
import { useBranchChangeCount, useBranchChanges } from '../../useBranchChanges'
import { useBranchConflicts } from '../../useBranchConflicts'
import { WarningMarker } from '../WarningMarker'
import { SidebarTabPanel } from '@apihub/components/SidebarTabPanel'
import { CHANGES_PROJECT_EDITOR_MODE } from '@apihub/entities/editor-modes'
import { DRAFT_COMMIT_KEY } from '@apihub/entities/commits'
import { NAVIGATION_PLACEHOLDER_AREA, Placeholder } from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'
import type { ChangeType } from '@apihub/entities/branches'
import { NONE_CHANGE_TYPE } from '@apihub/entities/branches'
import { FileIcon } from '@netcracker/qubership-apihub-ui-shared/icons/FileIcon'
import { getFileName, getFilePath } from '@netcracker/qubership-apihub-ui-shared/utils/files'
import { MultiButton } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/MultiButton'
import { isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import { ConfirmationDialog } from '@apihub/components/ConfirmationDialog'
import { useBranchCacheDocument } from '../../useBranchCache'
import { UNKNOWN_SPEC_TYPE } from '@netcracker/qubership-apihub-ui-shared/utils/specs'

export const ChangesTabPanel: FC = memo(() => {
  const visible = useIsChangesProjectEditorMode()

  const [changes] = useBranchChanges()
  const [branchConfig, isBranchConfigLoading] = useBranchConfig()
  const changeCount = useBranchChangeCount()

  const setSelectedConflictedCommitKey = useSetSelectedConflictedBlobKey()
  const [selectedChangeKey, setSelectedChangeKey] = useChangeSearchParam()
  const { name } = useSelectedChange() ?? {}
  const [conflicts] = useBranchConflicts()

  const [afterFileContent] = useProjectFileContent(selectedChangeKey ?? '', DRAFT_COMMIT_KEY)
  const hasEditPermission = useHasEditBranchPermission()
  const [{ type = UNKNOWN_SPEC_TYPE } = {}] = useBranchCacheDocument(selectedChangeKey ?? '')

  if (!visible) {
    return null
  }

  return (
    <>
      <SidebarTabPanel
        value={CHANGES_PROJECT_EDITOR_MODE}
        header={
          <Box display="flex" width="100%" alignItems="center" flexGrow={1} gap={1}>
            <Typography variant="h3" noWrap>Changes</Typography>
            {conflicts.length > 0 && <WarningMarker/>}
            {hasEditPermission && changeCount > 0 && <SaveChangesButton/>}
          </Box>
        }
        body={
          <Placeholder
            invisible={changeCount > 0 && !isBranchConfigLoading}
            area={NAVIGATION_PLACEHOLDER_AREA}
            message="Nothing to commit"
          >
            <List
              sx={{
                '& .MuiListItemButton-root:hover': {
                  '& .MuiBox-root': {
                    '& .MuiButtonBase-root': {
                      visibility: 'visible',
                    },
                  },
                },
              }}
            >
              {
                branchConfig && branchConfig.changeType !== NONE_CHANGE_TYPE && <ListItemButton
                  key={branchConfig.key}
                  sx={{ borderLeft: `2px solid ${CHANGE_TYPE_COLORS[branchConfig.changeType]}` }}
                  selected={selectedChangeKey === branchConfig.key}
                  onClick={() => {
                    setSelectedChangeKey(branchConfig?.key)
                    setSelectedConflictedCommitKey(null)
                  }}
                >
                  <Box display="flex" alignItems="end" height={24} width="100%">
                    <ListItemIcon sx={{ minWidth: 24 }}>
                      <FileIcon/>
                    </ListItemIcon>
                    <ListItemText
                      primary={getFileName(branchConfig.key)}
                      primaryTypographyProps={{ color: CHANGE_TYPE_COLORS[branchConfig.changeType] }}
                    />
                  </Box>
                  <ListItemText
                    primary={getFilePath(branchConfig.key).slice(0, -1)}
                    primaryTypographyProps={{ color: '#626D82' }}
                  />
                </ListItemButton>
              }
              {
                changes.map(({ fileId, status, conflictedBlobId }) => (
                  <ChangesTabItem key={fileId} fileId={fileId} status={status} conflictedBlobId={conflictedBlobId}/>
                ))
              }
            </List>
          </Placeholder>
        }
      />

      <CollapsibleNavPanel
        filename={name}
        content={afterFileContent}
        type={type}
      />

      <SaveChangesDialog/>
      <ForceSaveChangesDialog/>
    </>
  )
})

const SaveChangesButton: FC = memo(() => {
  const { showSaveChangesDialog, showForceSaveChangesDialog } = useEventBus()
  const [resetBranch, isLoading] = useResetBranch()
  const [confirmationOpen, setConfirmationOpen] = useState(false)
  const [, isFetching, getBranchConflicts] = useBranchConflicts()

  return (<>
    <MultiButton
      sx={{ ml: 'auto' }}
      buttonGroupProps={{ sx: { marginLeft: 'auto', marginRight: 4, minWidth: 'max-content' } }}
      primary={
        <LoadingButton
          loading={isFetching}
          variant="contained"
          onClick={() => {
            getBranchConflicts().then(({ data }) => {
              if (isNotEmpty(data)) {
                showForceSaveChangesDialog({ conflicts: data! })
              } else {
                showSaveChangesDialog()
              }
            })
          }}>
          Save
        </LoadingButton>
      }
      secondary={
        <Box>
          <MenuItem onClick={() => {
            showSaveChangesDialog({ saveToNewBranch: true })
          }}>
            Save in new branch
          </MenuItem>
          <MenuItem onClick={() => {
            setConfirmationOpen(true)
          }}>
            Reset to last saved
          </MenuItem>
          <MenuItem onClick={() => {
            getBranchConflicts()
          }}>
            Check conflicts
          </MenuItem>
        </Box>
      }
    />
    <ConfirmationDialog
      open={confirmationOpen}
      title="Reset branch"
      message="Are you sure, you want to reset branch to last saved? All changes will be lost"
      loading={isLoading}
      confirmButtonName="Reset"
      onConfirm={() => resetBranch()}
      onCancel={() => setConfirmationOpen(false)}
    />
  </>)
})

const CHANGE_TYPE_COLORS: Record<ChangeType, string> = {
  none: '#000000',
  added: '#00BB5B',
  deleted: '#FF5260',
  updated: '#0068FF',
}
