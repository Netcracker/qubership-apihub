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
import { Box, ToggleButton, Typography } from '@mui/material'
import { PUBLISH_STATUSES, VERSION_STATUSES } from '@netcracker/qubership-apihub-ui-shared/entities/version-status'
import { CustomToggleButtonGroup } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/CustomToggleButtonGroup'
import { SearchBar } from '@netcracker/qubership-apihub-ui-shared/components/SearchBar'
import type { VersionStatusFilter } from './VersionsPackageSettingsTab'
import { ALL_VERSION } from './VersionsPackageSettingsTab'

export type PackageVersionsSettingsControlsProps = Readonly<{
  status: VersionStatusFilter
  onStatusFilterChange: (value: VersionStatusFilter) => void
  onSearchValueChange: (value: string) => void
}>
export const PackageVersionsSettingsControls: FC<PackageVersionsSettingsControlsProps> = memo<PackageVersionsSettingsControlsProps>(({
  onSearchValueChange,
  status,
  onStatusFilterChange,
}) => {

// TODO: delete property exclusive from ToggleButtonGroup when BE part will be ready "Extend API for Admin UI" and we can choose several statuses
  return (
    <Box sx={{ display: 'flex', mb: 2, gap: 2, order: 1 }}>
      <CustomToggleButtonGroup
        exclusive
        value={status}
        onClick={onStatusFilterChange}
      >
        <ToggleButton value={ALL_VERSION} sx={{ gap: 1 }}>
          <Typography fontSize={11}>{ALL_VERSION}</Typography>
        </ToggleButton>
        {
          VERSION_STATUSES.map(status => (
            <ToggleButton key={status} value={status} sx={{ gap: 1 }}>
              <Typography fontSize={11}>{PUBLISH_STATUSES.get(status)}</Typography>
            </ToggleButton>
          ))
        }
      </CustomToggleButtonGroup>

      <Box sx={{ flex: 1, maxWidth: 336 }}>
        <SearchBar
          placeholder="Search"
          onValueChange={onSearchValueChange}
          data-testid="SearchVersions"
        />
      </Box>
    </Box>
  )
})
