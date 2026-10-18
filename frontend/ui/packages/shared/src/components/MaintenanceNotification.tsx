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
import Box from '@mui/material/Box'
import WarningRoundedIcon from '@mui/icons-material/WarningRounded'

type NotificationProps = {
  value: string
}

export const NOTIFICATION_HEIGHT = 40

export const MaintenanceNotification: FC<NotificationProps> = memo<NotificationProps>(({ value }) => {
  return (
    <Box height={NOTIFICATION_HEIGHT} sx={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '8px 12px',
      backgroundColor: '#FFF4CC',
      width: '100%',
    }}>
      <WarningRoundedIcon fontSize="small" color="warning"/>
      <Box sx={{ ml: '10px' }}>{value}</Box>
    </Box>
  )
})
