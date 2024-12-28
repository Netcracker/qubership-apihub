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
import { memo } from 'react'
import type { ChangeSeverity } from '../entities/change-severities'
import {
  CHANGE_SEVERITY_COLOR_MAP,
  CHANGE_SEVERITY_DESCRIPTION_MAP,
  CHANGE_SEVERITY_NAME_MAP,
} from '../entities/change-severities'
import { Box, Divider, Tooltip } from '@mui/material'
import ListItem from '@mui/material/ListItem'

export type ChangesTooltipProps = PropsWithChildren<{
  changeType: ChangeSeverity
  disableHoverListener?: boolean
  category?: ChangesTooltipCategory
}>

export const ChangesTooltip: FC<ChangesTooltipProps> = memo<ChangesTooltipProps>(props => {
  const {
    children,
    changeType,
    disableHoverListener = false,
    category,
  } = props

  return (
    <Tooltip
      title={
        <ChangesTooltipContent
          changeType={changeType}
          category={category}
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
})

type ChangesTooltipContentProps = {
  changeType: ChangeSeverity
  category?: ChangesTooltipCategory
}

const ChangesTooltipContent: FC<ChangesTooltipContentProps> = memo<ChangesTooltipContentProps>(({
  changeType,
  category,
}) => {
  const tooltipContent = CHANGE_SEVERITY_DESCRIPTION_MAP[changeType]
  const categoryTitle = `${category ? `${TOOLTIP_TITLE_BY_CATEGORY[category]} with ` : ''}${CHANGE_SEVERITY_NAME_MAP[changeType]} Changes`

  return (
    <Box sx={{ p: '4px 4px' }}>
      <Box display="flex" alignItems="center">
        <Box
          component="span"
          sx={{
            background: CHANGE_SEVERITY_COLOR_MAP[changeType],
            width: 8,
            height: 8,
            borderRadius: '50%',
            mr: 1,
          }}
        />
        {categoryTitle}
      </Box>
      <Divider sx={{ mx: 0, mt: 1, mb: 1 }} orientation="horizontal"/>
      <Box>
        {tooltipContent.text}
        {tooltipContent.options && tooltipContent.options.map((item, index) => (
          <ListItem sx={{ display: 'list-item', py: 0 }} key={index}>
            {item}
          </ListItem>
        ))}
      </Box>
    </Box>
  )
})

export const CATEGORY_OPERATION = 'operation'
export const CATEGORY_PACKAGE = 'packages'

const TOOLTIP_TITLE_BY_CATEGORY = {
  [CATEGORY_OPERATION]: 'Operations',
  [CATEGORY_PACKAGE]: 'Packages',
}

export type ChangesTooltipCategory = typeof CATEGORY_OPERATION | typeof CATEGORY_PACKAGE
