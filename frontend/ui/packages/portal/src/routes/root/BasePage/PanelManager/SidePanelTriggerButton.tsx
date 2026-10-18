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
