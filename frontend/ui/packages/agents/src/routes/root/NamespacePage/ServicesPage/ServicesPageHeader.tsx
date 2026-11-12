import { ButtonBase, CircularProgress, styled, type Theme, Typography, type TypographyProps } from '@mui/material'
import { type FC, memo, useId } from 'react'

import { InfoHint, VISIBLE_ON_HOVER_HOST_STYLES } from '@netcracker/qubership-apihub-ui-shared/components/InfoHint'
import { CheckCircleIcon } from '@netcracker/qubership-apihub-ui-shared/icons/CheckCircleIcon'
import {
  WIZARD_STEP_CURRENT_BACKGROUND_COLOR,
  WIZARD_STEP_SUCCEEDED_BACKGROUND_COLOR,
} from '@netcracker/qubership-apihub-ui-shared/themes/colors'
import type { Pixel } from '@netcracker/qubership-apihub-ui-shared/utils/types'

import { useOpenStep, useSteps } from './ServicesPageProvider/ServicesStepsProvider'
import {
  COMPLETE_STEP_STATUS,
  ERROR_STEP_STATUS,
  NONE_STEP_STATUS,
  RUNNING_STEP_STATUS,
  type Step,
  type StepStatus,
} from './ServicesPageProvider/servicesSteps'
import { useOpenableSteps } from './useOpenableSteps'

// CheckCircleIcon has the default MUI size of 24 px and draws its circle 17 units wide in a 20-unit view box, so the
// circle is 20.4 px wide and 1.8 px away from each edge. The number badge copies that box to line up with the icon.
const STEP_ICON_SIZE: Pixel = 24
const STEP_BADGE_SIZE: Pixel = STEP_ICON_SIZE * 17 / 20
const STEP_BADGE_MARGIN: Pixel = (STEP_ICON_SIZE - STEP_BADGE_SIZE) / 2

const IDLE_STEP_LOOK = 'idle'
const CURRENT_STEP_LOOK = 'current'
const SUCCEEDED_STEP_LOOK = 'succeeded'
const FAILED_STEP_LOOK = 'failed'

type StepLook =
  | typeof IDLE_STEP_LOOK
  | typeof CURRENT_STEP_LOOK
  | typeof SUCCEEDED_STEP_LOOK
  | typeof FAILED_STEP_LOOK

type StepLookColors = Readonly<{
  background: string
  badge: string
  name: string
}>

const STEP_LOOK_TO_COLORS: Record<StepLook, (theme: Theme) => StepLookColors> = {
  // A step not reached is drawn in the disabled grey of the theme, the grey of the info icon
  [IDLE_STEP_LOOK]: ({ palette }) => ({
    background: palette.background.default,
    badge: palette.action.disabled,
    name: palette.action.disabled,
  }),
  [CURRENT_STEP_LOOK]: ({ palette }) => ({
    background: WIZARD_STEP_CURRENT_BACKGROUND_COLOR,
    badge: palette.primary.main,
    name: palette.common.black,
  }),
  [SUCCEEDED_STEP_LOOK]: ({ palette }) => ({
    background: WIZARD_STEP_SUCCEEDED_BACKGROUND_COLOR,
    badge: palette.secondary.main,
    name: palette.common.black,
  }),
  [FAILED_STEP_LOOK]: ({ palette }) => ({
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
  const openableSteps = useOpenableSteps()

  return (
    <WizardTabs aria-label="Wizard steps">
      {steps.map(step => (
        <li key={step.key}>
          <WizardStepTab step={step} openable={openableSteps[step.index]} />
        </li>
      ))}
    </WizardTabs>
  )
})

ServicesPageHeader.displayName = 'ServicesPageHeader'

type WizardStepTabProps = {
  step: Step
  openable: boolean
}

const WizardStepTab: FC<WizardStepTabProps> = ({ step, openable }) => {
  const { key, name, tooltip, status, active } = step
  const openStep = useOpenStep()
  const look = stepLookOf(step)
  const caption = STEP_STATUS_TO_STATUS_MESSAGE_MAP[status]
  const hintId = useId()

  const handleClick = (): void => {
    if (openable) {
      openStep(key)
    }
  }

  // A tab that opens nothing gets aria-disabled instead of `disabled`: a disabled ButtonBase takes no pointer events,
  // so the tab would not show its info icon on hover
  return (
    <WizardTab
      look={look}
      aria-current={active ? 'step' : undefined}
      aria-describedby={hintId}
      aria-disabled={!openable}
      tabIndex={openable ? 0 : -1}
      onClick={handleClick}
      data-testid={`StepIndicator-${key}`}
    >
      <StepBadge step={step} look={look}/>
      <StepText>
        <StepTitle>
          <StepName look={look} component="span" variant="body2" noWrap>
            {name}
          </StepName>
          <InfoHint
            tooltip={tooltip}
            fontSize="extra-small"
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
    return <StepProgress size={STEP_BADGE_SIZE}/>
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
    ...VISIBLE_ON_HOVER_HOST_STYLES,
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

// The theme's body2 sets its own color, so the name cannot take the color from the tab
const StepName = styled(Typography, { shouldForwardProp: prop => prop !== 'look' })<
  TypographyProps<'span'> & { component: 'span'; look: StepLook }
>(
  ({ theme, look }) => ({
    color: STEP_LOOK_TO_COLORS[look](theme).name,
  }),
)

const NumberBadge = styled('span', { shouldForwardProp: prop => prop !== 'look' })<{ look: StepLook }>(
  ({ theme, look }) => ({
    display: 'inline-flex',
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    width: STEP_BADGE_SIZE,
    height: STEP_BADGE_SIZE,
    margin: STEP_BADGE_MARGIN,
    borderRadius: '50%',
    backgroundColor: STEP_LOOK_TO_COLORS[look](theme).badge,
    color: theme.palette.common.white,
    // A button takes the font of the browser rather than of its parent, so the badge sets the font itself
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body2.fontSize,
    fontWeight: 700,
    // The trim cuts the line box down to the height of the digits, so the flex centering centers the digits themselves
    // rather than a box with the ascent and the descent of the font. Line height 1 keeps the digits close to the
    // center in a browser without text-box.
    lineHeight: 1,
    textBox: 'trim-both cap alphabetic',
  }),
)

// The margin keeps the step name from shifting when the number badge turns into the spinner
const StepProgress = styled(CircularProgress)({
  flexShrink: 0,
  margin: STEP_BADGE_MARGIN,
})

const CompletedIcon = styled(CheckCircleIcon)(({ theme }) => ({
  color: theme.palette.secondary.main,
}))

// The status decides the color before the open step does: an open step that failed is red. A step that is not open
// and has no status stays grey, whether or not it was opened before.
function stepLookOf({ active, status }: Step): StepLook {
  if (status === ERROR_STEP_STATUS) {
    return FAILED_STEP_LOOK
  }
  if (status === COMPLETE_STEP_STATUS) {
    return SUCCEEDED_STEP_LOOK
  }
  if (active || status === RUNNING_STEP_STATUS) {
    return CURRENT_STEP_LOOK
  }
  return IDLE_STEP_LOOK
}
