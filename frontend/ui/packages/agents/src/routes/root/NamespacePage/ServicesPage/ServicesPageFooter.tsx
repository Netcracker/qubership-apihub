import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft'
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight'
import { Box, Button, styled } from '@mui/material'
import { type FC, memo } from 'react'

import { useHasPromotableServices } from './ServicesPageBody/CreateSnapshotStep/useHasPromotableServices'
import { COMPLETE_STEP_STATUS, CREATE_SNAPSHOT_STEP_KEY } from './ServicesPageProvider/servicesSteps'
import { useActiveStep, useOpenStep, useSteps } from './ServicesPageProvider/ServicesStepsProvider'

export const ServicesPageFooter: FC = memo(() => {
  const steps = useSteps()
  const { key, index, status } = useActiveStep()
  const openStep = useOpenStep()
  // The snapshot details exist only once the snapshot is published
  const isSnapshotComplete = steps.some(
    step => step.key === CREATE_SNAPSHOT_STEP_KEY && step.status === COMPLETE_STEP_STATUS,
  )
  const hasPromotableServices = useHasPromotableServices(isSnapshotComplete)

  const isFirstStep = index === 0
  const isLastStep = index === steps.length - 1
  // Promote Version lists only the services of the snapshot that have a baseline package
  const isNextBlocked = key === CREATE_SNAPSHOT_STEP_KEY && !hasPromotableServices
  const isNextEnabled = !isLastStep && status === COMPLETE_STEP_STATUS && !isNextBlocked

  return (
    <Footer>
      {!isFirstStep && (
        <Button
          data-testid="BackButton"
          variant="outlined"
          onClick={() => openStep(steps[index - 1].key)}
        >
          <KeyboardArrowLeftIcon fontSize="small" sx={{ ml: -1.5 }} />
          Back
        </Button>
      )}
      <Button
        data-testid="NextButton"
        variant={isNextEnabled ? 'contained' : 'outlined'}
        disabled={!isNextEnabled}
        onClick={() => openStep(steps[index + 1].key)}
      >
        Next
        <KeyboardArrowRightIcon fontSize="small" sx={{ mr: -1.5 }} />
      </Button>
    </Footer>
  )
})

ServicesPageFooter.displayName = 'ServicesPageFooter'

// The card body has no bottom padding, so the footer keeps the buttons off the edge of the card
const Footer = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'flex-end',
  gap: theme.spacing(1),
  paddingTop: theme.spacing(2),
  paddingBottom: theme.spacing(3),
}))
