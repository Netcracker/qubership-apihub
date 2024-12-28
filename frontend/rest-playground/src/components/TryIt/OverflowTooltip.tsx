import type { FC } from 'react'
import * as React from 'react'
import { memo, useState } from 'react'
import { Tooltip, TooltipProps } from '@mui/material'

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
