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

import { useIsSettingsProjectEditorMode } from '../useProjectEditorMode'
import { Box, List, ListItemButton, ListItemText, Typography } from '@mui/material'
import { useSettingSearchParam } from '../useSettingSearchParam'
import { SidebarTabPanel } from '@apihub/components/SidebarTabPanel'
import { SETTINGS_PROJECT_EDITOR_MODE } from '@apihub/entities/editor-modes'

export const GENERAL_SETTINGS_TAB = 'general'
export type SettingsTab =
  | typeof GENERAL_SETTINGS_TAB

export const SettingsTabPanel: FC = memo(() => {
  const [selectedSetting, setSelectedSetting] = useSettingSearchParam()
  const visible = useIsSettingsProjectEditorMode()

  if (!visible) {
    return null
  }

  return (
    <SidebarTabPanel
      value={SETTINGS_PROJECT_EDITOR_MODE}
      header={
        <Typography variant="h3" noWrap>
          Settings
        </Typography>
      }
      body={
        <List>
          <ListItemButton
            selected={selectedSetting === GENERAL_SETTINGS_TAB}
            onClick={() => setSelectedSetting(GENERAL_SETTINGS_TAB)}
            sx={{ justifyContent: 'center' }}
          >
            <Box>
              <ListItemText primary="General"/>
              <ListItemText primary="Project information" primaryTypographyProps={{ color: '#626D82' }}/>
            </Box>
          </ListItemButton>
        </List>
      }
    />
  )
})
