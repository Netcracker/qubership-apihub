import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft'
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight'
import { Box, Button, styled } from '@mui/material'
import { type FC, memo } from 'react'

import { useActiveStep, useOpenStep, useSteps } from './ServicesPageProvider/ServicesStepsProvider'
import { useIsNextStepAvailable } from './useIsNextStepAvailable'

export const ServicesPageFooter: FC = memo(() => {
  const steps = useSteps()
  const { index } = useActiveStep()
  const openStep = useOpenStep()
  const isNextEnabled = useIsNextStepAvailable()

  const isFirstStep = index === 0

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
