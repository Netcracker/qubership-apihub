import type { FC, ReactElement } from 'react'
import { memo } from 'react'

import { ButtonWithHint } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/ButtonWithHint'

import type { SidePanelId } from './SidePanelManager'
import { useSidePanel } from './SidePanelManager'

export type SidePanelTriggerButtonProps = {
  panelId: SidePanelId
  hint: string
  icon: ReactElement
  testId: string
  ariaLabel?: string
}

export const SidePanelTriggerButton: FC<SidePanelTriggerButtonProps> = memo(({
  panelId,
  hint,
  icon,
  testId,
  ariaLabel,
}) => {
  const { togglePanel } = useSidePanel(panelId)

  return (
    <ButtonWithHint
      hint={hint}
      startIcon={icon}
      aria-label={ariaLabel ?? hint}
      size="large"
      color="inherit"
      data-testid={testId}
      onClick={togglePanel}
    />
  )
})

SidePanelTriggerButton.displayName = 'SidePanelTriggerButton'
