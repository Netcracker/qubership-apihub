import type { FC, PropsWithChildren } from 'react'
import { createContext, memo, useContext, useState } from 'react'
import { createEventBus, slot } from 'ts-event-bus'
import type { NotificationDetail } from '@netcracker/qubership-apihub-ui-shared/components/ExceptionSituationHandler'
import type { ChangeViewDialogDetail } from '../widgets/ChangeViewDialog/ChangeViewDialog'
import { SHOW_CHANGE_VIEW_DIALOG } from '../widgets/ChangeViewDialog/ChangeViewDialog'
import type { Spec } from '@netcracker/qubership-apihub-ui-shared/entities/specs'
import type { Service } from '@agents/entities/services'

export const SHOW_SUCCESS_NOTIFICATION = 'show-success-notification'
export const SHOW_ERROR_NOTIFICATION = 'show-error-notification'
export const SHOW_SPECIFICATION_DIALOG = 'show-specification-dialog'
export const RUN_ROUTING_REPORT_DIALOG = 'run-routing-report-dialog'
export const SHOW_PUBLICATION_ERROR_REPORT_DIALOG = 'show-publication-error-report-dialog'

export type ShowPublicationErrorReportDetail = {
  downloadFilename: string
  errors: string
}

type EventBus = {
  showSuccessNotification: (detail: NotificationDetail) => void
  showErrorNotification: (detail: NotificationDetail) => void
  showSpecificationDialog: (detail: AgentSpecificationDialogDetail) => void
  showChangeViewDialog: (detail: ChangeViewDialogDetail) => void
  showRunRoutingReportDialog: () => void
  showPublicationErrorReportDialog: (detail: ShowPublicationErrorReportDetail) => void
}

function eventBusProvider(): EventBus {
  const eventBus = createEventBus({
    events: {
      showSuccessNotification: slot<NotificationDetail>(),
      showErrorNotification: slot<NotificationDetail>(),
      showSpecificationDialog: slot<AgentSpecificationDialogDetail>(),
      showChangeViewDialog: slot<ChangeViewDialogDetail>(),
      showRunRoutingReportDialog: slot(),
      showPublicationErrorReportDialog: slot<ShowPublicationErrorReportDetail>(),
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

  eventBus.showPublicationErrorReportDialog.on((detail: ShowPublicationErrorReportDetail) => {
    dispatchEvent(new CustomEvent(SHOW_PUBLICATION_ERROR_REPORT_DIALOG, { detail }))
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
