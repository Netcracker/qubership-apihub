import Box from '@mui/material/Box'
import { styled, type SxProps } from '@mui/material/styles'
import Typography from '@mui/material/Typography'
import { type FC, memo } from 'react'

import {
  CONTENT_PLACEHOLDER_AREA,
  Placeholder,
  ROBOT_PLACEHOLDER_VARIANT,
} from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'

const IMAGE_MAX_HEIGHT = 160

export const AiAssistantPlaceholder: FC = memo(() => {
  return (
    <Placeholder
      invisible={false}
      area={CONTENT_PLACEHOLDER_AREA}
      variant={ROBOT_PLACEHOLDER_VARIANT}
      message={
        <Box>
          <PrimaryMessage variant="h5">
            Describe your task or ask a question
          </PrimaryMessage>
          <SecondaryMessage variant="body2">
            Design, document, and integrate APIs faster
          </SecondaryMessage>
        </Box>
      }
      sx={placeholderSx}
      data-testid="AiAssistantPlaceholder"
    />
  )
})

AiAssistantPlaceholder.displayName = 'AiAssistantPlaceholder'

const placeholderSx: SxProps = { maxHeight: IMAGE_MAX_HEIGHT }

const PrimaryMessage = styled(Typography)(({ theme }) => ({
  fontWeight: theme.typography.fontWeightMedium,
}))

PrimaryMessage.displayName = 'PrimaryMessage'

const SecondaryMessage = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
}))

SecondaryMessage.displayName = 'SecondaryMessage'
