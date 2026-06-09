import { type FC, memo, useCallback } from 'react'

import { ButtonWithHint } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/ButtonWithHint'
import { RobotIcon } from '@netcracker/qubership-apihub-ui-shared/icons/RobotIcon'

import { useEventBus } from '@netcracker/qubership-apihub-ui-portal/src/routes/EventBusProvider'
import { usePanel } from './state/panelContext'

export const AiAssistantButton: FC = memo(() => {
  const { open } = usePanel()
  const { showAiAssistantPanel, hideAiAssistantPanel } = useEventBus()

  const handleClick = useCallback((): void => {
    if (open) {
      hideAiAssistantPanel()
      return
    }
    showAiAssistantPanel()
  }, [hideAiAssistantPanel, open, showAiAssistantPanel])

  return (
    <ButtonWithHint
      hint="AI Assistant"
      startIcon={<RobotIcon />}
      aria-label="AI Assistant"
      size="large"
      color="inherit"
      data-testid="AiAssistantButton"
      onClick={handleClick}
    />
  )
})

AiAssistantButton.displayName = 'AiAssistantButton'
