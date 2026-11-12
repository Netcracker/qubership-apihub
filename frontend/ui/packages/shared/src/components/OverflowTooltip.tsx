import type { FC } from 'react'
import { memo, useState } from 'react'
import Tooltip from '@mui/material/Tooltip'
import type { TooltipProps } from '@mui/material/Tooltip/Tooltip'

type OverflowTooltipProps = {
  checkOverflow?: (currentTarget: EventTarget & HTMLDivElement) => boolean
} & TooltipProps

export const OverflowTooltip: FC<OverflowTooltipProps> = memo<OverflowTooltipProps>(({
  children,
  checkOverflow,
  ...props
}) => {
  const [open, setOpen] = useState(false)

  const handleOnMouseEnter = ({ currentTarget }: { currentTarget: EventTarget & HTMLDivElement }): void => {
    const hasOverflow = checkOverflow?.(currentTarget) || currentTarget.scrollWidth > currentTarget.clientWidth
    setOpen(hasOverflow)
  }

  return (
    <Tooltip
      {...props}
      onMouseEnter={handleOnMouseEnter}
      onMouseLeave={() => setOpen(false)}
      open={open}
      PopperProps={{
        ...props.PopperProps,
        onMouseEnter: () => setOpen(true),
        onMouseLeave: () => setOpen(false),
      }}
    >
      {children}
    </Tooltip>
  )
})
