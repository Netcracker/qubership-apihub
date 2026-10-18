import { Box } from '@mui/material'
import { type FC, memo } from 'react'

import { COLOR_TEXT_SECONDARY } from '../themes/colors'
import { TextWithOverflowTooltip } from './TextWithOverflowTooltip'

export type MenuItemContentProps = Partial<{
  maxWidth: string | number
  title: string
  subtitle: string
}>

export const MenuItemContent: FC<MenuItemContentProps> = memo<MenuItemContentProps>(({ maxWidth, title, subtitle }) => {
  return (
    <Box width="100%" maxWidth={maxWidth}>
      {title && (
        <TextWithOverflowTooltip
          tooltipPlacement="right"
          tooltipText={title}
          fontSize="13px"
          data-testid="MenuItemTitle"
        >
          {title}
        </TextWithOverflowTooltip>
      )}
      {subtitle && (
        <TextWithOverflowTooltip
          tooltipPlacement="right"
          tooltipText={subtitle}
          color={COLOR_TEXT_SECONDARY}
          fontSize="12px"
          data-testid="MenuItemSubtitle"
        >
          {subtitle}
        </TextWithOverflowTooltip>
      )}
    </Box>
  )
})

MenuItemContent.displayName = 'MenuItemContent'
