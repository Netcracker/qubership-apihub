import { useEvent } from 'react-use'
import { useEventBus } from '@portal/routes/EventBusProvider'

const CREATE_CUSTOM_SERVER_EVENT = 'create-custom-server'
const DELETE_CUSTOM_SERVER_EVENT = 'delete-custom-server'
const OPEN_FULLSCREEN_EXAMPLES_POPUP_EVENT = 'open-fullscreen-examples-popup'

export function usePlaygroundEvents(): void {
  const { showCreateCustomServerDialog, showExamplesDialog, showDeleteCustomServerDialog } = useEventBus()

  useEvent(CREATE_CUSTOM_SERVER_EVENT, () => showCreateCustomServerDialog())

  useEvent(DELETE_CUSTOM_SERVER_EVENT, (event: CustomEvent<{ url: string }>) => {
    showDeleteCustomServerDialog(event.detail)
  })

  useEvent(OPEN_FULLSCREEN_EXAMPLES_POPUP_EVENT, () => showExamplesDialog())
}
