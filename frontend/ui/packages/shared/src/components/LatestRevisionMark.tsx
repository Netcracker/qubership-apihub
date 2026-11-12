import type { FC } from 'react'
import { memo } from 'react'
import { Typography } from '@mui/material'

export type LatestRevisionMarkProps = {
  latest: boolean | undefined
}

export const LatestRevisionMark: FC<LatestRevisionMarkProps> = memo<LatestRevisionMarkProps>(({ latest = false }) => {
  return (
    <Typography
      variant="subtitle2"
      fontSize={13}
    >
      {`${latest ? ' (latest)' : ''}`}
    </Typography>
  )
})
