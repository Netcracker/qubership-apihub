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
import { useEvent } from 'react-use'
import type { LinkType, NotificationDetail } from '../../EventBusProvider'
import {
  SHOW_ERROR_NOTIFICATION,
  SHOW_INFO_NOTIFICATION,
  SHOW_SUCCESS_NOTIFICATION,
  useEventBus,
} from '../../EventBusProvider'
import { Box, IconButton, Link, Slide, Snackbar, SnackbarContent, Typography } from '@mui/material'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import ErrorOutlinedIcon from '@mui/icons-material/ErrorOutlined'
import InfoIcon from '@mui/icons-material/Info'

export const Notification: FC = memo(() => {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [link, setLink] = useState<LinkType>()
  const [title, setTitle] = useState('')
  const [type, setType] = useState(SUCCESS_NOTIFICATION_TYPE)

  useEvent(SHOW_SUCCESS_NOTIFICATION, ({ detail: { title = 'Success', message, link } }) => {
    setType(SUCCESS_NOTIFICATION_TYPE)
    setTitle(title)
    setMessage(message)
    setLink(link)
    setOpen(true)
  })

  useEvent(SHOW_ERROR_NOTIFICATION, ({ detail: { title = 'Error', message = 'Something went wrong', link } }) => {
    setType(ERROR_NOTIFICATION_TYPE)
    setTitle(title)
    setMessage(message)
    setLink(link)
    setOpen(true)
  })

  useEvent(SHOW_INFO_NOTIFICATION, ({ detail: { message, link } }) => {
    setType(INFO_NOTIFICATION_TYPE)
    setTitle('')
    setMessage(message)
    setLink(link)
    setOpen(true)
  })

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

const SUCCESS_NOTIFICATION_TYPE = 'success'
const ERROR_NOTIFICATION_TYPE = 'error'
const INFO_NOTIFICATION_TYPE = 'info'

export function useShowSuccessNotification(): (detail: NotificationDetail) => void {
  const { showSuccessNotification } = useEventBus()
  return (detail: NotificationDetail) => showSuccessNotification(detail)
}

export function useShowErrorNotification(): (detail: NotificationDetail) => void {
  const { showErrorNotification } = useEventBus()
  return (detail: NotificationDetail) => showErrorNotification(detail)
}

export function useShowInfoNotification(): (detail: NotificationDetail) => void {
  const { showInfoNotification } = useEventBus()
  return (detail: NotificationDetail) => showInfoNotification(detail)
}
