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

import type { FC, HTMLAttributes, ReactNode } from 'react'
import * as React from 'react'
import { memo } from 'react'
import type { TooltipProps } from '@mui/material'
import { Box, ListItem, Tooltip, Typography } from '@mui/material'
import { OverflowTooltip } from './OverflowTooltip'
import type { TestableProps } from './Testable'

export type OptionItemProps = {
  props: HTMLAttributes<HTMLLIElement>
  title: string
  disabled?: boolean
  subtitle?: string
  chip?: ReactNode
  tooltipProps?: Omit<TooltipProps, 'children'>
} & TestableProps

export const OptionItem: FC<OptionItemProps> = memo<OptionItemProps>(({
  props,
  title,
  disabled,
  subtitle,
  chip,
  tooltipProps: { title: tooltipTitle, ...rest } = {},
  'data-testid': dataTestId,
}) => {
  return (
    <Tooltip
      placement="right"
      title={tooltipTitle}
      {...rest}
    >
      <Box>
        <ListItem
          {...props}
          data-testid={dataTestId}
          // todo 'disabled' prop is deprecated and does not work properly, transition to ListItemButton is required
          sx={{ pointerEvents: disabled ? 'none' : 'auto' }}
          disabled={disabled}
        >
          <Box width="100%" display="flex" alignItems="center">
            <Box width="100%" maxWidth="300px">
              <OverflowTooltip placement="right" title={title}>
                <Typography variant="body2" noWrap>{title}</Typography>
              </OverflowTooltip>
              {subtitle && (
                <OverflowTooltip placement="right" title={subtitle}>
                  <Typography variant="body2" noWrap color="#626D82">{subtitle}</Typography>
                </OverflowTooltip>
              )}
            </Box>
            {chip && <Box sx={{ marginLeft: 'auto' }}>{chip}</Box>}
          </Box>
        </ListItem>
      </Box>
    </Tooltip>
  )
})
