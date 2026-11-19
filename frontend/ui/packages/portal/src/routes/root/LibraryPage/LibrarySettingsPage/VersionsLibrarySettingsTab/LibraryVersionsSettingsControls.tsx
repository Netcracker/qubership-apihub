import { Box, ToggleButton, Typography } from '@mui/material'
import { type FC, memo } from 'react'

import { CustomToggleButtonGroup } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/CustomToggleButtonGroup'
import { SearchBar } from '@netcracker/qubership-apihub-ui-shared/components/SearchBar'
import { PUBLISH_STATUSES, VERSION_STATUSES } from '@netcracker/qubership-apihub-ui-shared/entities/version-status'

import { ALL_VERSION, type VersionStatusFilter } from './VersionsLibrarySettingsTab'

type LibraryVersionsSettingsControlsProps = Readonly<{
  status: VersionStatusFilter
  onStatusFilterChange: (value: VersionStatusFilter) => void
  onSearchValueChange: (value: string) => void
}>

export const LibraryVersionsSettingsControls: FC<LibraryVersionsSettingsControlsProps> = memo<
  LibraryVersionsSettingsControlsProps
>(({
  onSearchValueChange,
  status,
  onStatusFilterChange,
}) => {
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
        {VERSION_STATUSES.map(status => (
          <ToggleButton key={status} value={status} sx={{ gap: 1 }}>
            <Typography fontSize={11}>{PUBLISH_STATUSES.get(status)}</Typography>
          </ToggleButton>
        ))}
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
LibraryVersionsSettingsControls.displayName = 'LibraryVersionsSettingsControls'
