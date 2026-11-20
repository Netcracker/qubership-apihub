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
