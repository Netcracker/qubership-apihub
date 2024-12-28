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
import { useOtherEditors } from './ChangesTabPanel/useOtherEditors'
import { Box, Tooltip, Typography } from '@mui/material'
import WarningRoundedIcon from '@mui/icons-material/WarningRounded'
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined'

export const WarningMarker: FC = memo(() => {
  const otherEditors = useOtherEditors()

  return (
    <Tooltip title={<>
      <Box sx={{ display: 'flex', gap: 0.5, pb: 1 }}>
        <WarningRoundedIcon fontSize="small" color="warning"/>
        <Typography variant="body2">There are some conflicts. Save your changes to a new branch or they will be
          lost.</Typography>
      </Box>
      {
        otherEditors.map(({ name }) => (
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <PersonOutlinedIcon fontSize="small"/>
            <Typography variant="body2" color="#0068FF">{name}</Typography>
            <Typography variant="body2">also editing this project.</Typography>
          </Box>
        ))
      }
    </>}>
      <WarningRoundedIcon fontSize="small" color="warning"/>
    </Tooltip>
  )
})
