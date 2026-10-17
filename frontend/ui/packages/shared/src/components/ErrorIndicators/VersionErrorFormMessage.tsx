import Box from '@mui/material/Box'
import { styled } from '@mui/material/styles'
import Typography from '@mui/material/Typography'
import { type FC, memo } from 'react'

import { ErrorIcon } from '../../icons/ErrorIcon'
import type { TestableProps } from '../Testable'

type VersionErrorFormMessageProps = TestableProps & {
  message?: string
}

export const VersionErrorFormMessage: FC<VersionErrorFormMessageProps> = memo(({
  message,
  'data-testid': dataTestId = 'VersionErrorFormMessage',
}) => {
  if (!message) {
    return null
  }

  return (
    <FormMessageRoot>
      <ErrorIcon color="error" fontSize="small" />
      <FormMessageText variant="body2" data-testid={dataTestId}>
        {message}
      </FormMessageText>
    </FormMessageRoot>
  )
})

VersionErrorFormMessage.displayName = 'VersionErrorFormMessage'

const FormMessageRoot = styled(Box)({
  display: 'flex',
})

const FormMessageText = styled(Typography)(({ theme }) => ({
  marginLeft: theme.spacing(0.5),
}))
