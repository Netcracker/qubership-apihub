import type { FC } from 'react'
import React, { memo } from 'react'
import { Box, ListItemText, Typography } from '@mui/material'
import { OverflowTooltip } from './OverflowTooltip'

// First Order Component //
export type CustomListItemProps = {
  title: string
  strikeThrough?: boolean
  badgeTitle?: string
  badgeColor?: string
}
export const CustomListItem: FC<CustomListItemProps> = memo<CustomListItemProps>((props) => {
  const { title, strikeThrough, badgeTitle, badgeColor } = props

  return (
    <Box display="flex" alignItems="center" width="100%">
      <ListItemText
        primary={
          <OverflowTooltip title={title}>
            <Box width="inherit" textOverflow="ellipsis" overflow="hidden">{title}</Box>
          </OverflowTooltip>
        }
        primaryTypographyProps={{
          sx: {
            mt: 0.25,
            textDecoration: strikeThrough ? 'line-through' : 'none',
          },
        }}
      />
      {badgeTitle && (
        <Typography variant="button" sx={{ color: `${badgeColor}` }}>
          {badgeTitle}
        </Typography>
      )}
    </Box>
  )
})
