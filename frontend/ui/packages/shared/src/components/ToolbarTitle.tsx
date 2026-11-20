import type { FC, ReactNode } from 'react'
import { memo } from 'react'
import type { TypographyProps } from '@mui/material'
import Typography from '@mui/material/Typography'
import { OverflowTooltip } from './OverflowTooltip'

export type ToolbarTitleProps = Partial<{
  value: string | ReactNode | undefined | null
  titleTypographyProps?: TypographyProps
}>

export const ToolbarTitle: FC<ToolbarTitleProps> = memo<ToolbarTitleProps>(({ value, titleTypographyProps }) => {
  return (
    <OverflowTooltip title={value ?? ''}>
      {typeof value === 'string' ? (
        <Typography data-testid="ToolbarTitleTypography" noWrap variant="inherit" {...titleTypographyProps}>
          {value}
        </Typography>
      ) : <>{value}</>}
    </OverflowTooltip>
  )
})
