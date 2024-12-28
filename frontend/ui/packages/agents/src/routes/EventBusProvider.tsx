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

import type { FC, PropsWithChildren } from 'react'
import { createContext, memo, useContext, useState } from 'react'
import { createEventBus, slot } from 'ts-event-bus'
import type { NotificationDetail } from '@netcracker/qubership-apihub-ui-shared/components/ExceptionSituationHandler'
import type { ChangeViewDialogDetail } from '../widgets/ChangeViewDialog/ChangeViewDialog'
import { SHOW_CHANGE_VIEW_DIALOG } from '../widgets/ChangeViewDialog/ChangeViewDialog'
import type { Spec } from '@netcracker/qubership-apihub-ui-shared/entities/specs'
import type { Service } from '@apihub/entities/services'

export const SHOW_SUCCESS_NOTIFICATION = 'show-success-notification'
export const SHOW_ERROR_NOTIFICATION = 'show-error-notification'
export const SHOW_SPECIFICATION_DIALOG = 'show-specification-dialog'
export const RUN_ROUTING_REPORT_DIALOG = 'run-routing-report-dialog'

type EventBus = {
  showSuccessNotification: (detail: NotificationDetail) => void
  showErrorNotification: (detail: NotificationDetail) => void
  showSpecificationDialog: (detail: AgentSpecificationDialogDetail) => void
  showChangeViewDialog: (detail: ChangeViewDialogDetail) => void
  showRunRoutingReportDialog: () => void
}

function eventBusProvider(): EventBus {
  const eventBus = createEventBus({
    events: {
      showSuccessNotification: slot<NotificationDetail>(),
      showErrorNotification: slot<NotificationDetail>(),
      showSpecificationDialog: slot<AgentSpecificationDialogDetail>(),
      showChangeViewDialog: slot<ChangeViewDialogDetail>(),
      showRunRoutingReportDialog: slot(),
    },
  })

  eventBus.showSuccessNotification.on((detail: NotificationDetail) => {
    dispatchEvent(new CustomEvent(SHOW_SUCCESS_NOTIFICATION, { detail }))
  })

  eventBus.showErrorNotification.on((detail: NotificationDetail) => {
    dispatchEvent(new CustomEvent(SHOW_ERROR_NOTIFICATION, { detail }))
  })

  eventBus.showSpecificationDialog.on((detail: AgentSpecificationDialogDetail) => {
    dispatchEvent(new CustomEvent(SHOW_SPECIFICATION_DIALOG, { detail }))
  })

  eventBus.showChangeViewDialog.on((detail: ChangeViewDialogDetail) => {
    dispatchEvent(new CustomEvent(SHOW_CHANGE_VIEW_DIALOG, { detail }))
  })

  eventBus.showRunRoutingReportDialog.on(() => {
    dispatchEvent(new CustomEvent(RUN_ROUTING_REPORT_DIALOG))
  })

  return eventBus as unknown as EventBus
}

const EventBusContext = createContext<EventBus>()

export const EventBusProvider: FC<PropsWithChildren> = memo(({ children }) => {
  const [eventBus] = useState(eventBusProvider)

  return (
    <EventBusContext.Provider value={eventBus}>
      {children}
    </EventBusContext.Provider>
  )
})

export function useEventBus(): EventBus {
  return useContext(EventBusContext)
}

export type AgentSpecificationDialogDetail = {
  spec: Spec
  agentId?: string
  namespaceKey?: string
  service?: Service
}
