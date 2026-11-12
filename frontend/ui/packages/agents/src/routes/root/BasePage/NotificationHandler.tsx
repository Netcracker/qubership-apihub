import type { FC } from 'react'
import { memo } from 'react'
import { useEvent } from 'react-use'
import { SHOW_ERROR_NOTIFICATION, SHOW_SUCCESS_NOTIFICATION, useEventBus } from '../../EventBusProvider'
import { useGlobalNotification } from '@netcracker/qubership-apihub-ui-shared/hooks/notifications/useGlobalNotificationPpopup'
import { ERROR_NOTIFICATION_TYPE, SUCCESS_NOTIFICATION_TYPE } from '@netcracker/qubership-apihub-ui-shared/utils/notifications'
import type { NotificationDetail } from '@netcracker/qubership-apihub-ui-shared/components/ExceptionSituationHandler'

export const ErrorNotificationHandler: FC = memo(() => {
  const [notification, dataCatcher] = useGlobalNotification()

  useEvent(SHOW_ERROR_NOTIFICATION, ({ detail }) => dataCatcher({
    ...detail,
    type: ERROR_NOTIFICATION_TYPE,
    title: detail.title ?? 'Error',
  }))

  return <>{notification}</>
})

// TODO: Rewrite useGlobalNotification logic
export const SuccessNotificationHandler: FC = memo(() => {
  const [notification, dataCatcher] = useGlobalNotification()

  useEvent(SHOW_SUCCESS_NOTIFICATION, ({ detail }) => dataCatcher({
    ...detail,
    type: SUCCESS_NOTIFICATION_TYPE,
    title: detail.title ?? 'Success',
  }))

  return <>{notification}</>
})

export function useShowSuccessNotification(): (detail: NotificationDetail) => void {
  const { showSuccessNotification } = useEventBus()
  return (detail: NotificationDetail) => showSuccessNotification(detail)
}

export function useShowErrorNotification(): (detail: NotificationDetail) => void {
  const { showErrorNotification } = useEventBus()
  return (detail: NotificationDetail) => showErrorNotification(detail)
}
