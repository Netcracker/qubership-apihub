import { Box, FormHelperText, Typography } from '@mui/material'
import { memo } from 'react'

interface ServerUrlDisplayProps {
  serverUrl?: string
  errorMessage?: string
}

export const ServerUrlDisplay = memo<ServerUrlDisplayProps>(({ serverUrl, errorMessage }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', my: 1 }}>
    <Typography variant="subtitle2">Server URL:</Typography>
    <Typography
      variant="body2"
      sx={{ wordBreak: 'break-word' }}
    >
      {/*Break at "/" by inserting a zero‑width space*/}
      {serverUrl?.replace(/\//g, '/\u200B')}
    </Typography>
    {!!errorMessage && <FormHelperText error>{errorMessage}</FormHelperText>}
  </Box>
))

ServerUrlDisplay.displayName = 'ServerUrlDisplay'
