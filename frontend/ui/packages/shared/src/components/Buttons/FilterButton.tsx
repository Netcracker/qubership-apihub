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
import ToggleButton from '@mui/material/ToggleButton'
import Paper from '@mui/material/Paper'
import { Badge } from '@mui/material'
import Tooltip from '@mui/material/Tooltip'
import { FilterIcon } from '../../icons/FilterIcon'

export type FilterButtonProps = {
  selected: boolean
  onSelect?: () => void
  showBadge: boolean
}

// First Order Component //
export const FilterButton: FC<FilterButtonProps> = memo<FilterButtonProps>(({ selected, onSelect, showBadge }) => {
  return (
    <Paper
      sx={{
        backgroundColor: '#F2F3F5',
        borderRadius: 2,
        height: 32,
        width: 32,
      }}
    >
      <Tooltip title={showBadge ? FILTERS_APPLIED_TOOLTIP : SHOW_FILTER_PANEL_TOOLTIP}>
        <ToggleButton
          sx={{ height: 'inherit', width: 'inherit' }}
          value="check"
          selected={selected}
          onChange={onSelect}
          data-testid="FiltersButton"
        >
          {showBadge
            ? (
              <Badge variant="dot" color="primary">
                <FilterIcon/>
              </Badge>
            )
            : <FilterIcon/>}
        </ToggleButton>
      </Tooltip>
    </Paper>
  )
})

const FILTERS_APPLIED_TOOLTIP = 'Filters applied'
const SHOW_FILTER_PANEL_TOOLTIP = 'Show/hide filter panel'
