import type { ReactNode } from 'react'
import { useMemo } from 'react'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'

type CustomToggleButtonGroupProps<T> = {
  value: T
  onClick?: (value: T) => void
  children: ReactNode
  exclusive?: boolean
  customLastButton?: boolean
}

export function CustomToggleButtonGroup<T>(
  props: CustomToggleButtonGroupProps<T>,
): JSX.Element {
  const { value, onClick, children, exclusive, customLastButton } = props

  return useMemo(() =>
    (
      <ToggleButtonGroup
        sx={{
          '.MuiToggleButtonGroup-grouped': {
            padding: '15px 16px',
            '&.Mui-selected': {
              backgroundColor: 'rgba(46, 58, 82, 0.09)',
              boxShadow: 0,
            },
            margin: 0,
            border: '1px solid #D5DCE3',
            '&:first-of-type': {
              borderRadius: '6px 0px 0px 6px',
            },
            '&:not(:first-of-type)': {
              borderRadius: 0,
            },
            '&:last-of-type': {
              borderRadius: customLastButton ? '6px' : '0px 6px 6px 0px',
            },
            '&:hover': {
              backgroundColor: onClick ? '#F9F9F9' : 'transparent',
            },
            '&:focus': {
              outline: 'none',
            },
          },
        }}
        exclusive={exclusive}
        size="small"
        value={value}
        onChange={(event, value) => {
          onClick?.(value)
        }
        }
      >
        {children}
      </ToggleButtonGroup>
    ), [children, customLastButton, exclusive, onClick, value],
  )
}
