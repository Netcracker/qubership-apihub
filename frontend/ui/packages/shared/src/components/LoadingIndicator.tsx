import type { FC } from 'react'
import { memo } from 'react'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'

export const LoadingIndicator: FC = memo(() => {
  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        p: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <CircularProgress/>
    </Box>
  )
})
