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
import { Box, Link, Typography } from '@mui/material'
import type { To } from 'react-router-dom'
import { NavLink } from 'react-router-dom'
import { Marker } from 'react-mark.js'
import type { SpecType } from '@netcracker/qubership-apihub-ui-shared/utils/specs'
import type { VersionStatus } from '@netcracker/qubership-apihub-ui-shared/entities/version-status'
import { useEventBus } from '@apihub/routes/EventBusProvider'
import { OverflowTooltip } from '@netcracker/qubership-apihub-ui-shared/components/OverflowTooltip'
import { CustomChip } from '@netcracker/qubership-apihub-ui-shared/components/CustomChip'
import { SpecLogo } from '@netcracker/qubership-apihub-ui-shared/components/SpecLogo'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'

export type ResultCommonHeaderProps = {
  url: To
  title: string
  parents: string[]
  icon?: SpecType | ApiType
  status?: VersionStatus
  breadCrumbsStatus?: VersionStatus
  searchText: string
}

export const ResultCommonHeader: FC<ResultCommonHeaderProps> = memo<ResultCommonHeaderProps>((
  {
    url,
    title,
    parents,
    icon,
    status,
    breadCrumbsStatus,
    searchText,
  },
) => {
  const { hideGlobalSearchPanel } = useEventBus()
  const breadcrumbs = parents.join(' / ')

  return (
    <Box width="inherit">
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <OverflowTooltip title={breadcrumbs}>
          <Typography
            variant="subtitle2"
            noWrap
            data-testid="PathToSearchResultItem"
          >
            {breadcrumbs}
          </Typography>
        </OverflowTooltip>
        {breadCrumbsStatus && <CustomChip value={breadCrumbsStatus} data-testid="VersionStatusChip"/>}
      </Box>

      <Marker mark={searchText}>
        <Box display="flex" gap={1}>
          {icon && <SpecLogo value={icon}/>}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', width: '450px' }}>
            <OverflowTooltip title={title}>
              <Box sx={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', width: 'inherit' }}>
                <Link
                  onClick={hideGlobalSearchPanel}
                  sx={{ '&:hover': { cursor: 'pointer' } }}
                  component={NavLink}
                  to={url}
                >
                  {title}
                </Link>
              </Box>
            </OverflowTooltip>
            {status && <CustomChip value={status} data-testid="VersionStatusChip"/>}
          </Box>
        </Box>
      </Marker>
    </Box>
  )
})
