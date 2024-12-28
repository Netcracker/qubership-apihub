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
