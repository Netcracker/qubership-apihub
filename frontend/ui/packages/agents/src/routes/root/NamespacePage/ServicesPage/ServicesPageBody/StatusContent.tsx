import { Box, Typography } from '@mui/material'
import { styled } from '@mui/material/styles'
import type { FC, ReactNode } from 'react'

type StatusContentProps = {
  marker: ReactNode
  text: string
}

export const StatusContent: FC<StatusContentProps> = ({ marker, text }) => (
  <StatusContentRoot>
    {marker}
    <Typography noWrap variant="inherit">
      {text}
    </Typography>
  </StatusContentRoot>
)

StatusContent.displayName = 'StatusContent'

const StatusContentRoot = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
}))
