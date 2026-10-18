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
import { memo, useCallback, useMemo } from 'react'
import type { ButtonProps, Theme } from '@mui/material'
import { Box, Button, CircularProgress, Divider, Step, StepLabel, Stepper, Tooltip, Typography } from '@mui/material'
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft'
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight'
import type { Step as ServicesPageStep, StepKey, StepStatus } from './ServicesPageProvider/ServicesStepsProvider'
import {
  CREATE_SNAPSHOT_STEP_KEY,
  DISCOVER_SERVICES_STEP_KEY,
  ERROR_STEP_STATUS,
  INITIAL_STEP_STATUS,
  PROMOTE_VERSION_STEP_KEY,
  RUNNING_STEP_STATUS,
  SUCCESS_STEP_STATUS,
  useCreateSnapshotStep,
  useDiscoverServicesStep,
  usePromoteVersionStep,
  useValidationResultsStep,
  VALIDATION_RESULTS_STEP_KEY,
} from './ServicesPageProvider/ServicesStepsProvider'
import type { Color } from '@netcracker/qubership-apihub-ui-shared/utils/types'

export const ServicesPageHeader: FC = memo(() => {
  const [activeStepIndex, allSteps, backButtonProps, nextButtonProps] = useHeaderData()

  return (
    <Box
      sx={{
        display: 'grid',
        columnGap: 1,
        gridTemplateColumns: '1fr max-content',
        gridTemplateAreas: `
          'stepper actions'
        `,
      }}
    >
      <Stepper
        sx={{ gridArea: 'stepper' }}
        activeStep={activeStepIndex}
      >
        {allSteps.map(({ key, name, status }) => (
          <Step key={key}>
            <Tooltip title={STEP_KEY_TO_TOOLTIP_MESSAGE_MAP[key]}>
              <StepLabel
                data-testid={`StepIndicator-${key}`}
                StepIconProps={{
                  sx: (theme) => ({
                    color: `${STEP_STATUS_TO_COLOR_MAP[status](theme)} !important`,
                  }),
                }}
                icon={status === RUNNING_STEP_STATUS && <CircularProgress size={24}/>}
                optional={
                  <Box data-testid="StepStatus" display="flex">
                    <Typography data-testid={status} noWrap
                                variant="caption">{STEP_STATUS_TO_STATUS_MESSAGE_MAP[status]}</Typography>
                  </Box>
                }
              >
                {name}
              </StepLabel>
            </Tooltip>
          </Step>
        ))}
      </Stepper>

      <Box
        sx={{
          gridArea: 'actions',
          display: 'flex',
          gap: 2,
          alignItems: 'center',
        }}
      >
        <Divider orientation="vertical"/>
        <Button {...backButtonProps} data-testid="BackButton" variant="outlined">
          <KeyboardArrowLeftIcon fontSize="small" sx={{ ml: -1.5 }}/>
          Back
        </Button>
        <Button {...nextButtonProps} data-testid="NextButton">
          Next
          <KeyboardArrowRightIcon fontSize="small" sx={{ mr: -1.5 }}/>
        </Button>
      </Box>
    </Box>
  )
})

type ActiveStepIndex = number
type AllSteps = ReadonlyArray<ServicesPageStep>
type BackButtonProps = ButtonProps
type NextButtonProps = ButtonProps

function useHeaderData(): [
  ActiveStepIndex,
  AllSteps,
  BackButtonProps,
  NextButtonProps,
] {
  const [discoverServicesStep, setDiscoverServicesStep] = useDiscoverServicesStep()
  const [createSnapshotStep, setCreateSnapshotStep] = useCreateSnapshotStep()
  const [validationResultsStep, setValidationResultsStep] = useValidationResultsStep()
  const [promoteVersionStep, setPromoteVersionStep] = usePromoteVersionStep()

  const allSteps = useMemo(() => {
    const steps = [discoverServicesStep, createSnapshotStep, validationResultsStep]
    steps.push(promoteVersionStep)
    return steps
  }, [createSnapshotStep, discoverServicesStep, promoteVersionStep, validationResultsStep])
  const activeStep = useMemo(() => allSteps.find(step => step.active)!, [allSteps])
  const activeStepIndex = activeStep.index

  const onBackButtonClick = useCallback(() => {
    if (createSnapshotStep.active) {
      setCreateSnapshotStep(prevState => ({ ...prevState, active: false }))
      setDiscoverServicesStep(prevState => ({ ...prevState, active: true }))
    }
    if (validationResultsStep.active) {
      setValidationResultsStep(prevState => ({ ...prevState, active: false }))
      setCreateSnapshotStep(prevState => ({ ...prevState, active: true }))
    }
    if (promoteVersionStep.active) {
      setPromoteVersionStep(prevState => ({ ...prevState, active: false }))
      setValidationResultsStep(prevState => ({ ...prevState, active: true }))
    }
  }, [createSnapshotStep.active, validationResultsStep.active, promoteVersionStep.active, setCreateSnapshotStep, setDiscoverServicesStep, setValidationResultsStep, setPromoteVersionStep])

  const onNextButtonClick = useCallback(() => {
    if (discoverServicesStep.active) {
      setDiscoverServicesStep(prevState => ({ ...prevState, active: false }))
      setCreateSnapshotStep(prevState => ({ ...prevState, active: true }))
    }
    if (createSnapshotStep.active) {
      setCreateSnapshotStep(prevState => ({ ...prevState, active: false }))
      setValidationResultsStep(prevState => ({ ...prevState, active: true }))
    }
    if (validationResultsStep.active) {
      setValidationResultsStep(prevState => ({ ...prevState, active: false }))
      setPromoteVersionStep(prevState => ({ ...prevState, active: true }))
    }
  }, [discoverServicesStep.active, createSnapshotStep.active, validationResultsStep.active, setDiscoverServicesStep, setCreateSnapshotStep, setValidationResultsStep, setPromoteVersionStep])

  const nextButtonVariant = useMemo(() => {
    if (activeStep.status === SUCCESS_STEP_STATUS) {
      return 'contained'
    }
    return 'outlined'
  }, [activeStep.status])

  const nextButtonDisabled = useMemo(() => {
    if (activeStep.status !== SUCCESS_STEP_STATUS) {
      return true
    }
    return activeStepIndex === allSteps.length - 1
  }, [activeStepIndex, activeStep.status, allSteps.length])

  return [
    activeStepIndex,
    allSteps,
    {
      disabled: activeStepIndex === 0,
      onClick: onBackButtonClick,
    },
    {
      variant: nextButtonVariant,
      disabled: nextButtonDisabled,
      onClick: onNextButtonClick,
    },
  ]
}

const STEP_STATUS_TO_STATUS_MESSAGE_MAP: Record<StepStatus, string> = {
  [INITIAL_STEP_STATUS]: '',
  [RUNNING_STEP_STATUS]: 'In Progress',
  [SUCCESS_STEP_STATUS]: 'Success',
  [ERROR_STEP_STATUS]: 'Failed',
}

const STEP_KEY_TO_TOOLTIP_MESSAGE_MAP: Record<StepKey, string> = {
  [DISCOVER_SERVICES_STEP_KEY]: 'Browse services and API documents',
  [CREATE_SNAPSHOT_STEP_KEY]: 'Publish draft to APIHUB',
  [VALIDATION_RESULTS_STEP_KEY]: 'Check BWC status and changes',
  [PROMOTE_VERSION_STEP_KEY]: 'Publish release to APIHUB',
}

const STEP_STATUS_TO_COLOR_MAP: Record<StepStatus, (theme: Theme) => Color | undefined> = {
  [INITIAL_STEP_STATUS]: () => undefined,
  [RUNNING_STEP_STATUS]: () => undefined,
  [SUCCESS_STEP_STATUS]: ({ palette: { success } }) => success.main,
  [ERROR_STEP_STATUS]: ({ palette: { error } }) => error.main,
}
