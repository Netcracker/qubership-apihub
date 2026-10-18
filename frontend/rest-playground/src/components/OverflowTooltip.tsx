import { Tooltip, TooltipProps } from '@mui/material'
import { type FC, memo, useState } from 'react'

export const OverflowTooltip: FC<TooltipProps> = memo<TooltipProps>(({ children, ...props }) => {
  const [open, setOpen] = useState(false)

  return (
    <Tooltip
      {...props}
      onMouseEnter={({ currentTarget: { clientWidth, scrollWidth } }) => setOpen(scrollWidth > clientWidth)}
      onMouseLeave={() => setOpen(false)}
      open={open}
    >
      {children}
    </Tooltip>
  )
})

OverflowTooltip.displayName = 'OverflowTooltip'
