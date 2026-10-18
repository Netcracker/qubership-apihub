import * as React from 'react'
import { FC, memo } from 'react'
import { Box, Button, Tooltip } from '@mui/material'

export const GenerateButton: FC = memo(() => {
  return (
    <Tooltip title="Coming soon">
      <Box sx={{ cursor: 'pointer' }}>
        <Button disableRipple className="MuiButtonBase-root custom" variant="contained" disabled={true} sx={{ ml: 3 }}>
          Generate
        </Button>
      </Box>
    </Tooltip>
  )
})
