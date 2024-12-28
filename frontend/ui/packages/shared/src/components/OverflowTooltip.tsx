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
