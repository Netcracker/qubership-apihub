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
import Paper from '@mui/material/Paper'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'

export type TogglerProps<T = string> = {
  mode: T
  modes: ReadonlyArray<T>
  onChange: (mode: T) => void
  modeToText?: Record<PropertyKey, string>
}

export const Toggler: FC<TogglerProps> = memo<TogglerProps>(({ mode, modes, onChange, modeToText }) => {
  return (
    <Paper
      sx={{
        backgroundColor: '#F2F3F5',
        borderRadius: 2,
        height: 32,
      }}
    >
      <ToggleButtonGroup
        exclusive
        value={mode}
        onChange={(_, newMode) => {
          if (newMode !== null) {
            onChange(newMode)
          }
        }}
      >
        {
          modes.map(mode => (
            <ToggleButton
              sx={{ textTransform: 'capitalize' }}
              key={mode}
              value={mode}
              data-testid={`ModeButton-${mode}`}
            >
              {modeToText?.[mode] ?? mode}
            </ToggleButton>
          ))
        }
      </ToggleButtonGroup>
    </Paper>
  )
})
