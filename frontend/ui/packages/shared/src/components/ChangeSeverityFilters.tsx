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
import React, { memo } from 'react'
import { Box, ToggleButton } from '@mui/material'
import type { ChangeSeverity } from '../entities/change-severities'
import { CHANGE_SEVERITIES, CHANGE_SEVERITY_COLOR_MAP } from '../entities/change-severities'
import { CustomToggleButtonGroup } from './Buttons/CustomToggleButtonGroup'
import type { ChangesTooltipCategory } from './ChangesTooltip'
import { ChangesTooltip } from './ChangesTooltip'

export type ChangeSeverityFiltersProps = {
  changes: Partial<Record<ChangeSeverity, number>> | undefined
  filters: ChangeSeverity[]
  handleFilters?: (selectedFilters: ChangeSeverity[]) => void
  changeSeverities?: ReadonlySet<ChangeSeverity>
  category?: ChangesTooltipCategory
}

export const ChangeSeverityFilters: FC<ChangeSeverityFiltersProps> = memo<ChangeSeverityFiltersProps>((
  {
    changes,
    changeSeverities = CHANGE_SEVERITIES,
    filters,
    handleFilters,
    category,
  },
) => {

  if (!changes) {
    return null
  }

  const filtersLayout = (Object.keys(changes) as Array<ChangeSeverity>).map(severity => {
    return changeSeverities.has(severity) ? (
      <ToggleButton key={severity} value={severity} data-testid={`ChangesFilterButton-${severity}`}>
        <ChangesTooltip changeType={severity} category={category}>
          <Box alignItems="center" display="flex">
            <Box sx={{
              borderRadius: '50%',
              background: CHANGE_SEVERITY_COLOR_MAP[severity],
              width: 12,
              height: 12,
              mr: '6px',
            }}/>
            <Box sx={{ fontSize: '13px' }}
                 data-testid={`FilterButtonChangesCount-${severity}`}>{changes[severity]}</Box>
          </Box>
        </ChangesTooltip>
      </ToggleButton>
    ) : null
  })

  const isCustomLastButton = filtersLayout.reduce((count, item) => {
    return item !== null ? count + 1 : count
  }, 0) < 2

  return (
    <CustomToggleButtonGroup
      aria-label="text alignment"
      customLastButton={isCustomLastButton}
      value={filters}
      onClick={handleFilters}
    >
      {filtersLayout}
    </CustomToggleButtonGroup>
  )
})
