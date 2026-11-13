import Paper from '@mui/material/Paper'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import type { ReactElement } from 'react'

export type TogglerProps<T extends string> = {
  mode: T
  modes: ReadonlyArray<T>
  onChange: (mode: T) => void
  modeToText?: Record<PropertyKey, string>
}

// TODO 23.06.25 // Restore "memo"
export function Toggler<T extends string>(props: TogglerProps<T>): ReactElement {
  const { mode, modes, onChange, modeToText } = props

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
              data-testid={`ModeButton-${mode.toLowerCase()}`}
            >
              {modeToText?.[mode] ?? mode}
            </ToggleButton>
          ))
        }
      </ToggleButtonGroup>
    </Paper>
  )
}
