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
