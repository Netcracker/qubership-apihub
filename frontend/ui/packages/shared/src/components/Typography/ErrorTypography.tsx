import type { FC, PropsWithChildren } from 'react'
import { Typography } from '@mui/material'

export const ErrorTypography: FC<PropsWithChildren> = ({ children }) => (
  <Typography data-testid="ErrorTypography" variant="body2" color="#FF5260">{children}</Typography>
)
