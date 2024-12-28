import * as React from 'react'
import { FC, memo } from 'react'
import { Box, Typography } from '@mui/material'
import { OverflowTooltip } from './OverflowTooltip'

export type MenuItemContentProps = Partial<{
  maxWidth: string;
  title: string;
  subtitle: string;
}>;

export const MenuItemContent: FC<MenuItemContentProps> = memo<MenuItemContentProps>(({ maxWidth, title, subtitle }) => {
  return (
    <Box width="100%" maxWidth={maxWidth}>
      {title && (
        <OverflowTooltip placement="right" title={title}>
          <Typography variant="body2" noWrap fontSize="13px">
            {title}
          </Typography>
        </OverflowTooltip>
      )}
      {subtitle && (
        <OverflowTooltip placement="right" title={subtitle}>
          <Typography variant="body2" noWrap color="#626D82" fontSize="12px">
            {subtitle}
          </Typography>
        </OverflowTooltip>
      )}
    </Box>
  )
})
