import type { FC, ReactNode } from 'react'
import { memo } from 'react'
import { Box, Typography } from '@mui/material'
import type { SxProps } from '@mui/system'
import type { Theme } from '@mui/material/styles'
import type { TestableProps } from '@netcracker/qubership-apihub-ui-shared/components/Testable'

export type TitledValueProps = { sx?: SxProps<Theme> } & {
  title: string
  value?: ReactNode
} & TestableProps

export const TitledValue: FC<TitledValueProps> = memo<TitledValueProps>(({ title, value, sx, 'data-testid': dataTestId }) => {
  return <Box sx={sx}>
    <Typography noWrap variant="subtitle2">{title}</Typography>
    <Typography noWrap variant="body2" data-testid={dataTestId}>{value}</Typography>
  </Box>
})
