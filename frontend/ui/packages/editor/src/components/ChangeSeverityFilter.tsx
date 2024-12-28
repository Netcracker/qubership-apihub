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
import { memo, useCallback, useEffect, useState } from 'react'
import { Badge, Box, capitalize, MenuItem } from '@mui/material'
import CheckRoundedIcon from '@mui/icons-material/CheckRounded'
import FilterAltOutlinedIcon from '@mui/icons-material/FilterAltOutlined'
import type { ChangeSeverity } from '@netcracker/qubership-apihub-ui-shared/entities/change-severities'
import { CHANGE_SEVERITIES, CHANGE_SEVERITY_COLOR_MAP } from '@netcracker/qubership-apihub-ui-shared/entities/change-severities'
import { MenuButton } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/MenuButton'

export type ChangeSeverityFilterProps = {
  value: ChangeSeverity[]
  onChange: (value: ChangeSeverity[]) => void
}

export const ChangeSeverityFilter: FC<ChangeSeverityFilterProps> = memo(({ value, onChange }) => {
  const [severities, setSeverities] = useState<ChangeSeverity[]>(value)

  const updateSeverities = useCallback((severity: ChangeSeverity) => {
    setSeverities(prevState => (
      !prevState.includes(severity)
        ? [...prevState, severity]
        : prevState.filter(diffType => diffType !== severity)
    ))
  }, [])

  useEffect(() => onChange(severities), [severities, onChange])

  return (
    <Badge
      sx={{ '& .MuiBadge-badge': { fontSize: 12, height: 16, width: 16, minWidth: 16 } }}
      badgeContent={severities.length}
      color="primary"
    >
      <MenuButton
        multiple
        variant="outlined"
        icon={<FilterAltOutlinedIcon fontSize="small" sx={{ color: '#353C4E' }}/>}
      >
        {
          [...CHANGE_SEVERITIES].map(type => (
            <MenuItem
              key={type}
              onClick={() => updateSeverities(type)}
            >
              <Box width={30}>{severities.includes(type) ? <CheckRoundedIcon/> : null}</Box>
              <Box sx={{
                borderRadius: '50%',
                background: CHANGE_SEVERITY_COLOR_MAP[type],
                width: 6,
                height: 6,
                mr: 1.25,
              }}/>
              {capitalize(type)} changes
            </MenuItem>
          ))
        }
      </MenuButton>
    </Badge>
  )
})

