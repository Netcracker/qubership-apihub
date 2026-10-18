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

import type { ReactNode } from 'react'
import { useCallback, useMemo, useState } from 'react'
import type { NotificationData } from '../../components/Notifications/Notification'
import { Notification } from '../../components/Notifications/Notification'
import { SUCCESS_NOTIFICATION_TYPE } from '../../utils/notifications'

export type NotificationDataCatcherFn = (data: NotificationData) => void

const defaultState: NotificationData = {
  message: '',
  title: '',
  type: SUCCESS_NOTIFICATION_TYPE,
}

export function useGlobalNotification(): [
  ReactNode,
  NotificationDataCatcherFn,
] {
  const [notificationState, setNotificationState] = useState<NotificationData>(defaultState)
  const [open, setOpen] = useState<boolean>(false)

  const dataCatcher = useCallback(({ type, title, message, link }: NotificationData) => {
    setNotificationState({
      title: title,
      message: message,
      link: link,
      type: type,
    })
    setOpen(true)
  }, [])

  const node = useMemo(() => (
    <Notification
      open={open}
      setOpen={setOpen}
      title={notificationState.title}
      message={notificationState.message}
      type={notificationState.type}
      link={notificationState.link}
    />
  ), [notificationState, open])

  return [node, dataCatcher]
}
