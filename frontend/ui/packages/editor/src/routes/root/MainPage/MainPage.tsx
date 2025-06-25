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

import KeyboardArrowDownOutlinedIcon from '@mui/icons-material/KeyboardArrowDownOutlined'
import { Card, CardContent, CardHeader, MenuItem, Paper } from '@mui/material'
import { MenuButton } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/MenuButton'
import { NoIntegrationPlaceholder } from '@netcracker/qubership-apihub-ui-shared/components/NoIntegrationPlaceholder'
import { PageLayout } from '@netcracker/qubership-apihub-ui-shared/components/PageLayout'
import { useSystemInfo } from '@netcracker/qubership-apihub-ui-shared/features/system-info'
import { useUser } from '@netcracker/qubership-apihub-ui-shared/hooks/authorization/useUser'
import type { FC } from 'react'
import { memo, useMemo } from 'react'
import { useEventBus } from '../../EventBusProvider'
import { useGitlabIntegrationCheck } from '../EditorPage/useGitlabIntegrationCheck'
import { CreateGroupDialog } from './CreateGroupDialog'
import { CreateProjectDialog } from './CreateProjectDialog/CreateProjectDialog'
import { GroupsAndProjectsFilterer } from './GroupsAndProjectsFilterer'
import { GroupsAndProjectsTable } from './GroupsAndProjectsTable'
import { GroupsAndProjectsTree } from './GroupsAndProjectsTree'
import { useIsFavoriteMainViewMode, useIsTableMainViewMode, useIsTreeMainViewMode } from './useMainPageMode'

export const MainPage: FC = memo(() => {
  const [user] = useUser()
  const { showCreateProjectDialog, showCreateGroupDialog } = useEventBus()
  const isTreeMainPageMode = useIsTreeMainViewMode()
  const isTableMainPageMode = useIsTableMainViewMode()
  const isFavoriteMainPageMode = useIsFavoriteMainViewMode()
  const { productionMode } = useSystemInfo()
  const groupCreationAvailable = useMemo(
    () => (productionMode && (user?.key === 'user001' || user?.key === 'user002')) || !productionMode,
    [user?.key, productionMode],
  )

  const isIntegratedWithGitlab = useGitlabIntegrationCheck()

  if (user && !isIntegratedWithGitlab) {
    return <NoIntegrationPlaceholder />
  }

  return (
    <PageLayout
      body={
        <Card sx={{ display: 'grid', gridTemplateRows: 'max-content 1fr' }}>
          <CardHeader
            title="Groups & Projects"
            sx={{ px: 4, py: 3 }}
            action={
              <Paper sx={{ display: 'flex', gap: 2 }}>
                <GroupsAndProjectsFilterer />
                <MenuButton
                  variant="added"
                  title="Create"
                  icon={<KeyboardArrowDownOutlinedIcon />}
                >
                  <MenuItem onClick={showCreateProjectDialog}>Project</MenuItem>
                  {groupCreationAvailable && <MenuItem onClick={showCreateGroupDialog}>Group</MenuItem>}
                </MenuButton>

                <CreateProjectDialog />
                <CreateGroupDialog />
              </Paper>
            }
          />
          <CardContent sx={{ px: 4, py: 0 }}>
            {isTreeMainPageMode && (
              <GroupsAndProjectsTree />
            )}
            {(isTableMainPageMode || isFavoriteMainPageMode) && (
              <GroupsAndProjectsTable />
            )}
          </CardContent>
        </Card>
      }
    />
  )
})
