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
import * as React from 'react'
import { memo } from 'react'
import { useActiveTabConfigureDashboard, useSetActiveTabConfigureDashboard } from './ConfigureDashboardSubPage'
import type { ConfigureDashboardNavItemProps } from './configure-dashboard'
import { PACKAGES_CONFIGURE_DASHBOARD_TAB } from './configure-dashboard'
import { Box, List, ListItem, ListItemButton, ListItemText, Tooltip } from '@mui/material'
import { useParams } from 'react-router-dom'
import { useDeletedReferences } from '../useDeletedReferences'
import { useConflictedReferences } from '../useConflictedReferences'
import { isNotEmptyMap, isNotEmptySet } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import { RedWarningIcon, YellowWarningIcon } from '@netcracker/qubership-apihub-ui-shared/icons/WarningIcon'

export const ConfigureDashboardNavigation: FC = memo(() => {
  const activeTab = useActiveTabConfigureDashboard()
  const setActiveTab = useSetActiveTabConfigureDashboard()

  const { packageId, versionId } = useParams()
  const { data: deletedReferences } = useDeletedReferences(packageId!, versionId!)
  const { data: conflictedReferences } = useConflictedReferences(packageId!, versionId!)

  return (
    <List>
      {CONFIGURE_DASHBOARD_SIDEBAR.map(({ id, title, testId }) =>
        <ListItem
          key={crypto.randomUUID()}
          sx={{ p: 0 }}
        >
          <ListItemButton
            sx={{
              backgroundColor: id === activeTab ? '#F5F5FA' : 'transparent',
              height: '36px',
              alignItems: 'center',
            }}
            selected={id === activeTab}
            onClick={() => setActiveTab(id)}
            data-testid={testId}
          >
            <ListItemText primary={
              <Box display="flex">
                {title}
                <Box ml="5px" display="flex">
                  {id === PACKAGES_CONFIGURE_DASHBOARD_TAB && isNotEmptySet(conflictedReferences) &&
                    <Tooltip title="There are conflicts in dashboard configuration" placement="right">
                      <Box data-testid="ConflictAlert">
                        <YellowWarningIcon/>
                      </Box>
                    </Tooltip>}
                  {id === PACKAGES_CONFIGURE_DASHBOARD_TAB && isNotEmptyMap(deletedReferences) &&
                    <Tooltip title="Some included package/dashboard versions no longer exist" placement="right">
                      <Box data-testid="NotExistAlert">
                        <RedWarningIcon/>
                      </Box>
                    </Tooltip>}
                </Box>
              </Box>
            } primaryTypographyProps={{ sx: { mt: 1 } }}/>
          </ListItemButton>
        </ListItem>,
      )}
    </List>
  )
})

const CONFIGURE_DASHBOARD_SIDEBAR: ConfigureDashboardNavItemProps[] = [
  {
    id: PACKAGES_CONFIGURE_DASHBOARD_TAB,
    title: 'Packages',
    testId: 'PackagesButton',
  },
]
