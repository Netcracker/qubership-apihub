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

import { Paper, ToggleButton, ToggleButtonGroup } from '@mui/material'
import type { ReactNode } from 'react'
import React from 'react'
import Tooltip from '@mui/material/Tooltip'
import Box from '@mui/material/Box'
import { genericMemo } from '../utils/components'

export type SelectorWithIconsProps<T extends string> = {
  mode: T
  onChange?: (event: React.MouseEvent<HTMLElement>, value: T) => void
  firstIcon: ReactNode
  firstValue: T
  firstTooltip: string
  firstTestId?: string
  secondIcon: ReactNode
  secondValue: T
  secondTooltip: string
  secondTestId?: string
}

function renderSelector<T extends string>(props: SelectorWithIconsProps<T>): JSX.Element {
  const {
    mode, onChange,
    firstIcon, firstValue, firstTooltip, firstTestId,
    secondIcon, secondValue, secondTooltip, secondTestId,
  } = props

  return (
    <Paper
      sx={{
        backgroundColor: '#F2F3F5',
        borderRadius: 2,
        display: 'flex',
        flexWrap: 'wrap',
      }}
    >
      <ToggleButtonGroup
        sx={{ height: 32 }}
        size="small"
        value={mode}
        exclusive
        onChange={onChange}
      >

        <ToggleButton value={firstValue} data-testid={firstTestId}>
          <Tooltip title={firstTooltip}>
            <Box>{firstIcon}</Box>
          </Tooltip>
        </ToggleButton>

        <ToggleButton value={secondValue} data-testid={secondTestId}>
          <Tooltip title={secondTooltip}>
            <Box>{secondIcon}</Box>
          </Tooltip>
        </ToggleButton>
      </ToggleButtonGroup>
    </Paper>
  )
}

export const SelectorWithIcons = genericMemo(renderSelector)
