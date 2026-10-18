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
import { Box, IconButton, Link, Slide, Snackbar, SnackbarContent, Typography } from '@mui/material'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import ErrorOutlinedIcon from '@mui/icons-material/ErrorOutlined'
import InfoIcon from '@mui/icons-material/Info'
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import type { INFO_NOTIFICATION_TYPE } from '../../utils/notifications'
import { ERROR_NOTIFICATION_TYPE, SUCCESS_NOTIFICATION_TYPE } from '../../utils/notifications'

export type NotificationData = {
  title: string
  message: string
  type: NotificationType
  link?: LinkType
}

export type LinkType = {
  name: string
  href: string
}

export type NotificationType =
  | typeof SUCCESS_NOTIFICATION_TYPE
  | typeof ERROR_NOTIFICATION_TYPE
  | typeof INFO_NOTIFICATION_TYPE

export type NotificationProps = NotificationData & Readonly<{
  open: boolean
  setOpen: (value: boolean) => void
}>

export const Notification: FC<NotificationProps> = memo<NotificationProps>((props) => {
  const {
    open,
    setOpen,
    title,
    message,
    link,
    type,
  } = props

  if (!open) {
    return null
  }

  return (
    <Snackbar
      open={open}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      TransitionComponent={(props) => <Slide {...props} direction="up"/>}
      onClose={() => setOpen(false)}
      data-testid="Snackbar"
    >
      <SnackbarContent
        message={
          <Box sx={{ display: 'flex' }}>
            {
              type === SUCCESS_NOTIFICATION_TYPE
                ? <CheckCircleOutlinedIcon color="secondary" data-testid="SuccessIcon"/>
                : type === ERROR_NOTIFICATION_TYPE
                  ? <ErrorOutlinedIcon color="error" data-testid="ErrorIcon"/>
                  : <InfoIcon color="primary" data-testid="InfoIcon"/>
            }
            <Box sx={{ display: 'flex', flexDirection: 'column', ml: 1, pr: 3, overflow: 'hidden' }}>
              <Typography variant="subtitle1">{title}</Typography>
              <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>{message}</Typography>
              {link && <Link variant="subtitle2" href={link.href}>{link.name}</Link>}
            </Box>

            <IconButton
              sx={{ position: 'absolute', right: 8, top: 8, color: '#353C4E' }}
              onClick={() => setOpen(false)}
            >
              <CloseOutlinedIcon fontSize="small"/>
            </IconButton>
          </Box>
        }
      />
    </Snackbar>
  )
})
