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

import type { FC, PropsWithChildren } from 'react'
import * as React from 'react'
import type { Variant } from '@mui/material/styles/createTypography'
import { OverflowTooltip } from './OverflowTooltip'
import type { Theme } from '@mui/material'
import { Typography } from '@mui/material'
import type { SxProps } from '@mui/system'
import type { TestableProps } from './Testable'

export type TextWithTooltipProps = {
  variant?: Variant | 'inherit'
  tooltipText?: React.ReactNode
  sx?: SxProps<Theme>
} & PropsWithChildren & TestableProps

export const TextWithOverflowTooltip: FC<TextWithTooltipProps> = ({
  variant = 'body2',
  children,
  tooltipText = '',
  sx,
  testId,
  ...props
}) => {
  return (
    <OverflowTooltip
      title={tooltipText}
      {...props}
    >
      <Typography noWrap variant={variant} sx={sx} data-testid={testId}>
        {children}
      </Typography>
    </OverflowTooltip>
  )
}
