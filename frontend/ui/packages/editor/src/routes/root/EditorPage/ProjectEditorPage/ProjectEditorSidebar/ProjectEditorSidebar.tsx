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
import { memo, useEffect } from 'react'
import { Box, Tab, Tooltip } from '@mui/material'
import { TabContext, TabList } from '@mui/lab'

import { SettingsTabPanel } from './SettingsTabPanel'
import { useModeSearchParam } from '../../../useModeSearchParam'
import { useBranchSearchParam } from '../../../useBranchSearchParam'

import { useBranchChangeCount } from '../useBranchChanges'
import { useNavigation } from '../../../../NavigationProvider'
import {
  CHANGES_PROJECT_EDITOR_MODE,
  FILES_PROJECT_EDITOR_MODE,
  PUBLISH_PROJECT_EDITOR_MODE, SETTINGS_PROJECT_EDITOR_MODE,
} from '@apihub/entities/editor-modes'
import { BRANCH_SEARCH_PARAM, MODE_SEARCH_PARAM } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { FileIcon } from '@netcracker/qubership-apihub-ui-shared/icons/FileIcon'
import { MergeIcon } from '@netcracker/qubership-apihub-ui-shared/icons/MergeIcon'
import { ShareIcon } from '@netcracker/qubership-apihub-ui-shared/icons/ShareIcon'
import { DottedBadge } from '@apihub/components/DottedBadge'
import { SettingIcon } from '@netcracker/qubership-apihub-ui-shared/icons/SettingIcon'
import { FilesTabPanel } from './FilesTabPanel/FilesTabPanel'
import { PublishTabPanel } from './PublishTabPanel/PublishTabPanel'
import { ChangesTabPanel } from './ChangesTabPanel/ChangesTabPanel'

export const ProjectEditorSidebar: FC = memo(() => {
  const [mode, setMode] = useModeSearchParam()
  const [branch] = useBranchSearchParam()
  const { navigateToProject } = useNavigation()
  const changeCount = useBranchChangeCount()

  useEffect(() => {
    if (!mode) {
      setMode(FILES_PROJECT_EDITOR_MODE)
    }
  })

  return (
    <Box display="flex" height="100%">
      <TabContext value={mode!}>
        <TabList
          sx={{
            minWidth: 52,
            height: '100%',
            backgroundColor: '#F5F5FA',
            '.MuiTabs-flexContainer': { gap: 0, height: '100%' },
            '.MuiTab-root': {
              '&.Mui-selected': {
                backgroundColor: '#FFFFFF',
              },
            },
          }}
          TabIndicatorProps={{ sx: { backgroundColor: '#FFFFFF' } }}
          orientation="vertical"
          onChange={(_, value) => navigateToProject({
            search: {
              [BRANCH_SEARCH_PARAM]: { value: branch },
              [MODE_SEARCH_PARAM]: { value },
            },
            replace: true,
          })}
        >
          <Tooltip title="Files" placement="right" {...{ value: FILES_PROJECT_EDITOR_MODE }}>
            <Tab
              icon={<FileIcon/>}
              value={FILES_PROJECT_EDITOR_MODE}
            />
          </Tooltip>

          <Tooltip title={`Changes (${changeCount})`} placement="right" {...{ value: CHANGES_PROJECT_EDITOR_MODE }}>
            <Tab
              label={<DottedBadge color="primary" invisible={changeCount === 0}><MergeIcon/></DottedBadge>}
              value={CHANGES_PROJECT_EDITOR_MODE}
            />
          </Tooltip>

          <Tooltip title="Publish" placement="right" {...{ value: PUBLISH_PROJECT_EDITOR_MODE }}>
            <Tab
              icon={<ShareIcon/>}
              value={PUBLISH_PROJECT_EDITOR_MODE}
            />
          </Tooltip>

          <Tooltip title="Settings" placement="right" {...{ value: SETTINGS_PROJECT_EDITOR_MODE }}>
            <Tab
              sx={{ marginTop: 'auto' }}
              icon={<SettingIcon/>}
              value={SETTINGS_PROJECT_EDITOR_MODE}
            />
          </Tooltip>
        </TabList>

        <Box display="grid" gridTemplateRows="1fr" height="100%" width="100%">
          <FilesTabPanel/>
          {mode === PUBLISH_PROJECT_EDITOR_MODE && <PublishTabPanel/>}
          <ChangesTabPanel/>
          <SettingsTabPanel/>
        </Box>
      </TabContext>
    </Box>
  )
})
