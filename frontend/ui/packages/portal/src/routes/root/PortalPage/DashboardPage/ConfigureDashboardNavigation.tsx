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
import { Box, List, ListItem, ListItemButton, ListItemText } from '@mui/material'
import { styled } from '@mui/material/styles'
import { useParams } from 'react-router-dom'
import { useDeletedReferences } from '../useDeletedReferences'
import { useConflictedReferences } from '../useConflictedReferences'
import { useDashboardReferences } from './DashboardReferencesProvider'
import { isNotEmptyMap, isNotEmptySet } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import { DotIndicator } from '@netcracker/qubership-apihub-ui-shared/components/DotIndicator'
import { PUBLICATION_ERROR_MESSAGES } from '@netcracker/qubership-apihub-ui-shared/utils/publicationErrorMessages'
import { useVersionProblemProcessorContext } from '@netcracker/qubership-apihub-ui-shared/hooks/versions/useVersionProblemProcessorContext'
import { hasVersionProblems } from '@netcracker/qubership-apihub-ui-shared/hooks/versions/versionProblemDetails'

export const ConfigureDashboardNavigation: FC = memo(() => {
  const activeTab = useActiveTabConfigureDashboard()
  const setActiveTab = useSetActiveTabConfigureDashboard()

  const { packageId, versionId } = useParams()
  const { data: deletedReferences } = useDeletedReferences(packageId!, versionId!)
  const { data: conflictedReferences } = useConflictedReferences(packageId!, versionId!)
  const configuredReferences = useDashboardReferences()
  const processorContext = useVersionProblemProcessorContext()
  // The deleted-references cache tracks deleted references at any depth. The backend sets hasErrors of a dashboard
  // when one of its non-excluded references has errors, so the configured rows cover the errors below them.
  // It does not count an outdated api-processor, so a nested reference built by one shows only on its own row.
  const hasPackagesProblems = isNotEmptyMap(deletedReferences) ||
    configuredReferences.some(({ packageReference }) => hasVersionProblems(packageReference, processorContext))

  return (
    <List>
      {CONFIGURE_DASHBOARD_SIDEBAR.map(({ id, title, 'data-testid': dataTestId }) =>
        <ListItem
          key={`configure-dashboard-navigation-list-item-${id}-${title}`}
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
            data-testid={dataTestId}
          >
            <ListItemText primary={
              <Box display="flex">
                {title}
                <PackagesMarkers>
                  {id === PACKAGES_CONFIGURE_DASHBOARD_TAB && hasPackagesProblems && (
                    <DotIndicator
                      color="error"
                      tooltip={PUBLICATION_ERROR_MESSAGES.reference.subtabPackagesHasIssues}
                      tabIndex={-1}
                      data-testid="ProblemAlert"
                    />
                  )}
                  {id === PACKAGES_CONFIGURE_DASHBOARD_TAB && isNotEmptySet(conflictedReferences) && (
                    <DotIndicator
                      color="warning"
                      tooltip="There are conflicts in dashboard configuration"
                      tabIndex={-1}
                      data-testid="ConflictAlert"
                    />
                  )}
                </PackagesMarkers>
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
    'data-testid': 'PackagesButton',
  },
]

const PackagesMarkers = styled(Box)({
  display: 'flex',
  gap: '5px',
  marginLeft: '5px',
})
