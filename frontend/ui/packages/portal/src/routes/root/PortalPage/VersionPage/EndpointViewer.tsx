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
import { Box, Chip, IconButton, Link, Typography } from '@mui/material'
import KeyboardArrowDownOutlinedIcon from '@mui/icons-material/KeyboardArrowDownOutlined'
import KeyboardArrowRightOutlinedIcon from '@mui/icons-material/KeyboardArrowRightOutlined'
import type { To } from 'react-router-dom'
import { NavLink } from 'react-router-dom'
import { CustomChip } from '@netcracker/qubership-apihub-ui-shared/components/CustomChip'
import { OverflowTooltip } from '@netcracker/qubership-apihub-ui-shared/components/OverflowTooltip'

export type ViewData = Partial<{
  isSubTable: boolean
  canExpand: boolean
  isExpanded: boolean
  onToggleExpander: () => void
}>

export type EndpointData = {
  title: string
  link: To
  method?: string
  path?: string
  deprecated?: boolean
  onClickLink?: () => void
}

export type EndpointViewerProps = {
  view?: ViewData
  endpoint: EndpointData
}

export const EndpointViewer: FC<EndpointViewerProps> = (props) => {
  const {
    view: {
      isSubTable = false,
      canExpand = false,
      isExpanded = false,
      onToggleExpander,
    } = {},
    endpoint: {
      title,
      link,
      deprecated = false,
      method,
      path,
      onClickLink,
    },
  } = props

  return (
    <Box sx={{ ml: isSubTable ? 3 : 0 }}>
      <Box display="flex">
        {canExpand &&
          <IconButton sx={{ p: 0, mr: 1 }} onClick={onToggleExpander}>
            {isExpanded
              ? <KeyboardArrowDownOutlinedIcon sx={{ fontSize: '16px' }}/>
              : <KeyboardArrowRightOutlinedIcon sx={{ fontSize: '16px' }}/>}
          </IconButton>
        }

        <OverflowTooltip title={title}>
          <Box sx={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
            <Link
              component={NavLink}
              sx={{
                '&:hover': {
                  cursor: 'pointer',
                },
              }}
              to={link}
              onClick={onClickLink}
            >
              {title}
            </Link>
            {deprecated && <Chip
              label="Deprecated"
              sx={{
                marginLeft: '8px',
                color: 'white',
                backgroundColor: '#EF9206',
                fontSize: '11px',
                height: '14px',
              }}/>
            }
          </Box>
        </OverflowTooltip>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        {method && (
          <CustomChip sx={{ mr: 1 }} value={method} variant="outlined"/>
        )}
        {path && (
          <OverflowTooltip title={path}>
            <Typography noWrap variant="inherit">
              {path}
            </Typography>
          </OverflowTooltip>
        )}
      </Box>
    </Box>
  )
}
