import type { FC } from 'react'
import { memo } from 'react'
import { Box, Divider, Typography } from '@mui/material'
import { NamespaceSelector } from './NamespaceSelector'
import { WorkspaceSelector } from './WorkspaceSelector'
import { AgentsSelector } from './AgentsSelector'
import { CloudIcon } from '@netcracker/qubership-apihub-ui-shared/icons/CloudIcon'
import { LARGE_TOOLBAR_SIZE, Toolbar } from '@netcracker/qubership-apihub-ui-shared/components/Toolbar'

const LABEL_COLOR = '#8F9EB4'
const DIVIDER_COLOR = '#D5DCE3'
const FIELD_HEIGHT = 44

// The large toolbar is 72px high, as in the design, and leaves 14px above and below the 44px fields; the design pads
// it by 16px on the sides
export const NamespaceToolbar: FC = memo(() => {
  return (
    <Toolbar
      size={LARGE_TOOLBAR_SIZE}
      headerHeight={FIELD_HEIGHT}
      paddingX={2}
      header={
        <Box
          gap={2}
          display="flex"
          overflow="hidden"
          alignItems="center"
          minWidth="max-content"
          data-testid="NamespaceToolbar"
        >
          <Box display="flex" alignItems="center" gap={1}>
            <CloudIcon />
            <Typography variant="subtitle4" color={LABEL_COLOR}>From</Typography>
            <AgentsSelector />
            <NamespaceSelector />
          </Box>

          <Divider variant="fullWidth" flexItem={false} sx={{ height: 24, borderColor: DIVIDER_COLOR }} />

          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="subtitle4" color={LABEL_COLOR}>To</Typography>
            <WorkspaceSelector />
          </Box>
        </Box>
      }
    />
  )
})
