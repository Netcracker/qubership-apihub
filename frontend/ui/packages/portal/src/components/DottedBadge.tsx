import { styled } from '@mui/material/styles'
import { memo } from 'react'
import type { BadgeProps, BadgePropsColorOverrides } from '@mui/material'
import { Badge } from '@mui/material'
import type { OverridableStringUnion } from '@mui/types'

export const DottedBadge = styled(memo((props: BadgeProps) => (
  <Badge
    {...props}
    variant="dot"
  />
)))(({ color, theme }) => ({
  '& .MuiBadge-badge': {
    backgroundColor: color && DOT_COLORS[color],
    right: 6,
    top: 17,
    border: `2px solid ${theme.palette.background.paper}`,
    padding: 2,
  },
}))

const DOT_COLORS: Record<OverridableStringUnion<'primary' | 'secondary' | 'default' | 'error' | 'info' | 'success' | 'warning', BadgePropsColorOverrides>, string | undefined> = {
  primary: '#0068FF',
  secondary: undefined,
  default: undefined,
  error: undefined,
  info: undefined,
  success: '#00BB5B',
  warning: undefined,
}
