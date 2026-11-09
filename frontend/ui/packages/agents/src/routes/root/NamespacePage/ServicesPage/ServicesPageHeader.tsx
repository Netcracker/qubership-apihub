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

import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { ButtonBase, CircularProgress, styled, type Theme, Typography } from '@mui/material'
import { type FC, memo, useId } from 'react'

import {
  MUTED_TEXT_COLOR,
  WIZARD_STEP_CURRENT_BACKGROUND_COLOR,
  WIZARD_STEP_SUCCEEDED_BACKGROUND_COLOR,
} from '@netcracker/qubership-apihub-ui-shared/themes/colors'
import type { Pixel } from '@netcracker/qubership-apihub-ui-shared/utils/types'

import { INFO_HINT_HOST_STYLES, InfoHint } from '@agents/components/InfoHint'
import { useActiveStep, useOpenStep, useSteps } from './ServicesPageProvider/ServicesStepsProvider'
import {
  COMPLETE_STEP_STATUS,
  ERROR_STEP_STATUS,
  NONE_STEP_STATUS,
  RUNNING_STEP_STATUS,
  type Step,
  type StepStatus,
} from './ServicesPageProvider/servicesSteps'
import { useIsNextStepAvailable } from './useIsNextStepAvailable'

const STEP_BADGE_SIZE: Pixel = 20
const STEP_INFO_HINT_SIZE: Pixel = 16

type StepLook = 'unreached' | 'idle' | 'current' | 'succeeded' | 'failed'

type StepLookColors = Readonly<{
  background: string
  badge: string
  name: string
}>

const STEP_LOOK_TO_COLORS: Record<StepLook, (theme: Theme) => StepLookColors> = {
  unreached: ({ palette }) => ({
    background: palette.background.default,
    badge: MUTED_TEXT_COLOR,
    name: MUTED_TEXT_COLOR,
  }),
  idle: ({ palette }) => ({
    background: palette.background.default,
    badge: MUTED_TEXT_COLOR,
    name: palette.common.black,
  }),
  current: ({ palette }) => ({
    background: WIZARD_STEP_CURRENT_BACKGROUND_COLOR,
    badge: palette.primary.main,
    name: palette.common.black,
  }),
  succeeded: ({ palette }) => ({
    background: WIZARD_STEP_SUCCEEDED_BACKGROUND_COLOR,
    badge: palette.secondary.main,
    name: palette.common.black,
  }),
  failed: ({ palette }) => ({
    background: palette.error.light,
    badge: palette.error.main,
    name: palette.common.black,
  }),
}

const STEP_STATUS_TO_STATUS_MESSAGE_MAP: Record<StepStatus, string> = {
  [NONE_STEP_STATUS]: '',
  [RUNNING_STEP_STATUS]: 'In Progress',
  [COMPLETE_STEP_STATUS]: 'Success',
  [ERROR_STEP_STATUS]: 'Failed',
}

export const ServicesPageHeader: FC = memo(() => {
  const steps = useSteps()
  const { index: activeStepIndex } = useActiveStep()
  const isNextStepAvailable = useIsNextStepAvailable()

  return (
    <WizardTabs aria-label="Wizard steps">
      {steps.map(step => (
        <li key={step.key}>
          <WizardStepTab
            step={step}
            openable={step.reached || (isNextStepAvailable && step.index === activeStepIndex + 1)}
          />
        </li>
      ))}
    </WizardTabs>
  )
})

ServicesPageHeader.displayName = 'ServicesPageHeader'

type WizardStepTabProps = {
  step: Step
  // A step already reached, or the next step when "Next" would open it
  openable: boolean
}

const WizardStepTab: FC<WizardStepTabProps> = ({ step, openable }) => {
  const { key, name, tooltip, status, active } = step
  const openStep = useOpenStep()
  const look = stepLookOf(step)
  const caption = STEP_STATUS_TO_STATUS_MESSAGE_MAP[status]
  const hintId = useId()

  // A tab that opens nothing gets aria-disabled instead of `disabled`: a disabled ButtonBase takes no pointer events,
  // so the tab would not show its info icon on hover
  return (
    <WizardTab
      look={look}
      aria-current={active ? 'step' : undefined}
      aria-describedby={hintId}
      aria-disabled={!openable}
      tabIndex={openable ? 0 : -1}
      onClick={openable ? () => openStep(key) : undefined}
      data-testid={`StepIndicator-${key}`}
    >
      <StepBadge step={step} look={look}/>
      <StepText>
        <StepTitle>
          <Typography
            component="span"
            variant="body2"
            noWrap
            sx={theme => ({ color: STEP_LOOK_TO_COLORS[look](theme).name })}
          >
            {name}
          </Typography>
          <InfoHint
            title={tooltip}
            size={STEP_INFO_HINT_SIZE}
            descriptionId={hintId}
            data-testid={`StepInfoHint-${key}`}
          />
        </StepTitle>
        {caption && (
          <Typography component="span" variant="subtitle2" noWrap data-testid="StepStatus">
            {caption}
          </Typography>
        )}
      </StepText>
    </WizardTab>
  )
}

WizardStepTab.displayName = 'WizardStepTab'

type StepBadgeProps = {
  step: Step
  look: StepLook
}

const StepBadge: FC<StepBadgeProps> = ({ step: { index, status, completed }, look }) => {
  if (status === RUNNING_STEP_STATUS) {
    return <CircularProgress size={STEP_BADGE_SIZE}/>
  }
  if (completed) {
    return <CompletedIcon/>
  }
  return <NumberBadge look={look}>{index + 1}</NumberBadge>
}

StepBadge.displayName = 'StepBadge'

// The tabs form an ordered list, the usual markup of a stepper
const WizardTabs = styled('ol')(({ theme }) => ({
  display: 'grid',
  gridAutoFlow: 'column',
  gridAutoColumns: 'minmax(0, 1fr)',
  gap: theme.spacing(2),
  margin: 0,
  padding: 0,
  listStyle: 'none',
}))

const WizardTab = styled(ButtonBase, { shouldForwardProp: prop => prop !== 'look' })<{ look: StepLook }>(
  ({ theme, look }) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: theme.spacing(1),
    width: '100%',
    minHeight: 44,
    padding: theme.spacing(0.5, 1.5),
    borderRadius: 8,
    // A button takes the font of the browser, not of its parent
    fontFamily: theme.typography.fontFamily,
    textAlign: 'left',
    backgroundColor: STEP_LOOK_TO_COLORS[look](theme).background,
    cursor: 'pointer',
    '&[aria-disabled="true"]': {
      cursor: 'default',
    },
    // The card header clips what overflows its title, so the focus ring is drawn inside the tab
    '&.Mui-focusVisible': {
      outlineOffset: -4,
    },
    ...INFO_HINT_HOST_STYLES,
  }),
)

// A tab is a button, so its parts are spans
const StepText = styled('span')({
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
})

const StepTitle = styled('span')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
}))

const NumberBadge = styled('span', { shouldForwardProp: prop => prop !== 'look' })<{ look: StepLook }>(
  ({ theme, look }) => ({
    display: 'inline-flex',
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    width: STEP_BADGE_SIZE,
    height: STEP_BADGE_SIZE,
    borderRadius: '50%',
    backgroundColor: STEP_LOOK_TO_COLORS[look](theme).badge,
    color: theme.palette.common.white,
    fontSize: 12,
    fontWeight: 500,
  }),
)

// The circle of the icon takes 20 of its 24 px, so the icon overflows by 2 px on each side to match the number badges
const CompletedIcon = styled(CheckCircleIcon)(({ theme }) => ({
  fontSize: 24,
  margin: -2,
  color: theme.palette.secondary.main,
}))

// The status decides the color before the open step does: an open step that failed is red
function stepLookOf({ reached, active, status }: Step): StepLook {
  if (!reached) {
    return 'unreached'
  }
  if (status === ERROR_STEP_STATUS) {
    return 'failed'
  }
  if (status === COMPLETE_STEP_STATUS) {
    return 'succeeded'
  }
  if (active || status === RUNNING_STEP_STATUS) {
    return 'current'
  }
  return 'idle'
}
