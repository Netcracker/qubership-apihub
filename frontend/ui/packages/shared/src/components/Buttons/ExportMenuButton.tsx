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
import { memo } from 'react'
import KeyboardArrowDownOutlinedIcon from '@mui/icons-material/KeyboardArrowDownOutlined'
import { Box, MenuItem, Paper, Typography } from '@mui/material'
import { MenuButton } from './MenuButton'
import { DownloadIcon } from '../../icons/DownloadIcon'
import { DISABLED_BUTTON_COLOR, ENABLED_BUTTON_COLOR } from '../../entities/operation-groups'

export type ExportMenuButtonProps = {
  title: string
  disabled?: boolean
  allDownloadText: string
  filteredDownloadText: string
  downloadAll?: () => void
  downloadFiltered?: () => void
}

// First Order Component //
export const ExportMenuButton: FC<ExportMenuButtonProps> = memo(({
  title,
  disabled,
  allDownloadText,
  filteredDownloadText,
  downloadAll,
  downloadFiltered,
}) => {
  return (
    <Paper>
      <MenuButton
        disabled={disabled}
        variant="outlined"
        startIcon={<DownloadIcon color={disabled ? DISABLED_BUTTON_COLOR : ENABLED_BUTTON_COLOR}/>}
        endIcon={<KeyboardArrowDownOutlinedIcon/>}
        sx={{
          '&.MuiButton-root': {
            width: '48px',
            '& .MuiButton-startIcon': {
              marginRight: '0px',
            },
            '& .MuiButton-endIcon': {
              marginLeft: '0px',
            },
          },
        }}
        data-testid="ExportMenuButton"
      >
        <Box component="div">
          <Typography sx={EXPORT_MENU_DELIMITER_STYLES}>
            {title}
          </Typography>
          <MenuItem onClick={downloadAll} data-testid="DownloadAllMenuItem">
            {allDownloadText}
          </MenuItem>
          <MenuItem onClick={downloadFiltered} data-testid="DownloadFilteredMenuItem">
            {filteredDownloadText}
          </MenuItem>
        </Box>
      </MenuButton>
    </Paper>
  )
})

const EXPORT_MENU_DELIMITER_STYLES = {
  color: '#626D82',
  fontSize: '13px',
  fontWeight: 400,
  lineHeight: '20px',
  padding: '8px',
}
