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

import { Box, Divider, Tooltip } from '@mui/material'
import type { PropsWithChildren, ReactElement } from 'react'

export type MarkerTooltipProps<V extends string = string, C extends string = string> = PropsWithChildren<{
  variant: V
  variantToDescription: Record<V, string>
  variantToTooltipTitle: Record<V, string>
  variantToColor: Record<V, string>
  disableHoverListener?: boolean
  category?: C
  categoryToTooltipTitle?: Partial<Record<C, string>> // should be garanteed when category is provided
}>

export const MarkerTooltip = <
  V extends string,
  C extends string = string,
>(props: MarkerTooltipProps<V, C>): ReactElement => {
  const {
    children,
    variant,
    variantToDescription,
    variantToTooltipTitle,
    variantToColor,
    disableHoverListener = false,
    category,
    categoryToTooltipTitle,
  } = props

  return (
    <Tooltip
      title={
        <MarkerTooltipContent<V, C>
          variant={variant}
          variantToDescription={variantToDescription}
          variantToTooltipTitle={variantToTooltipTitle}
          variantToColor={variantToColor}
          category={category}
          categoryToTooltipTitle={categoryToTooltipTitle}
        />
      }
      placement="bottom-end"
      disableHoverListener={disableHoverListener}
    >
      <Box>
        {children}
      </Box>
    </Tooltip>
  )
}

type MarkerTooltipContentProps<V extends string, C extends string> = {
  variant: V
  variantToDescription: Record<V, string>
  variantToTooltipTitle: Record<V, string>
  variantToColor: Record<V, string>
  category?: C
  categoryToTooltipTitle?: Partial<Record<C, string>>
}

const MarkerTooltipContent = <
  V extends string,
  C extends string,
>(props: MarkerTooltipContentProps<V, C>): ReactElement => {
  const {
    variant,
    variantToDescription,
    variantToTooltipTitle,
    variantToColor,
    category,
    categoryToTooltipTitle,
  } = props

  const tooltipContent = variantToDescription[variant]
  const categoryTitle = `${category ? `${categoryToTooltipTitle![category]} with ` : ''}${variantToTooltipTitle[variant]}`

  return (
    <Box sx={{ p: '4px 4px' }}>
      <Box display="flex" alignItems="center">
        <Box
          component="span"
          sx={{
            backgroundColor: variantToColor[variant],
            width: 8,
            height: 8,
            borderRadius: '50%',
            mr: 1,
          }}
        />
        {categoryTitle}
      </Box>
      <Divider sx={{ mx: 0, mt: 1, mb: 1 }} orientation="horizontal" />
      <Box>
        {tooltipContent}
      </Box>
    </Box>
  )
}
