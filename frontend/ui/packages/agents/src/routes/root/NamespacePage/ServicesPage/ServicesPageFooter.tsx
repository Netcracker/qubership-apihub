import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft'
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight'
import { Box, Button, styled } from '@mui/material'
import { type FC, memo } from 'react'

import { useActiveStep, useOpenStep, useSteps } from './ServicesPageProvider/ServicesStepsProvider'
import { useOpenableSteps } from './useOpenableSteps'

export const ServicesPageFooter: FC = memo(() => {
  const steps = useSteps()
  const { index } = useActiveStep()
  const openStep = useOpenStep()
  const openableSteps = useOpenableSteps()

  const isFirstStep = index === 0
  const isLastStep = index === steps.length - 1
  const isNextEnabled = !isLastStep && openableSteps[index + 1]

  const handleBackClick = (): void => openStep(steps[index - 1].key)
  const handleNextClick = (): void => openStep(steps[index + 1].key)

  return (
    <Footer>
      {!isFirstStep && (
        <BackButton data-testid="BackButton" variant="outlined" onClick={handleBackClick}>
          <KeyboardArrowLeftIcon fontSize="small" />
          Back
        </BackButton>
      )}
      <NextButton data-testid="NextButton" variant="contained" disabled={!isNextEnabled} onClick={handleNextClick}>
        Next
        <KeyboardArrowRightIcon fontSize="small" />
      </NextButton>
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

// The arrows are children rather than startIcon and endIcon, which a small Button makes 18 px with an 8 px gap; the
// arrow side has less padding, since the arrow shape leaves room of its own
const BackButton = styled(Button)(({ theme }) => ({
  paddingLeft: theme.spacing(1.5),
}))

const NextButton = styled(Button)(({ theme }) => ({
  paddingRight: theme.spacing(1.5),
}))
