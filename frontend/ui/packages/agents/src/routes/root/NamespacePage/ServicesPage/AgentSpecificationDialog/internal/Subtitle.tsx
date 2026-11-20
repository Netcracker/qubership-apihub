import type { FC } from 'react'
import { memo } from 'react'
import { Box, Typography } from '@mui/material'
import { OverflowTooltip } from '@netcracker/qubership-apihub-ui-shared/components/OverflowTooltip'

type SubtitleProps = {
  label: string
  value?: string
}

export const Subtitle: FC<SubtitleProps> = memo<SubtitleProps>(({ label, value }) => {
  return (
    <Box display="flex" gap="2px">
      <Typography
        variant="caption"
        fontWeight="bold"
        flexShrink={0}
        minWidth="50px"
      >
        {label}:
      </Typography>
      <OverflowTooltip title={value}>
        <Typography
          variant="caption"
          textOverflow="ellipsis"
          overflow="hidden"
          noWrap
          flexShrink={3}
          maxWidth="18vw"
        >
          {value}
        </Typography>
      </OverflowTooltip>
    </Box>
  )
})
