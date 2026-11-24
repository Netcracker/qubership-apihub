import type { FC } from 'react'
import { memo } from 'react'
import { Box, Divider, Typography } from '@mui/material'
import { NamespaceSelector } from './NamespaceSelector'
import { WorkspaceSelector } from './WorkspaceSelector'
import { AgentsSelector } from './AgentsSelector'
import { CloudIcon } from '@netcracker/qubership-apihub-ui-shared/icons/CloudIcon'

export const NamespaceToolbar: FC = memo(() => {
  return (
    <Box
      gap={2}
      display="flex"
      overflow="hidden"
      alignItems="center"
      minWidth="max-content"
      data-testid="NamespaceToolbar"
    >
      <CloudIcon/>

      <Typography variant="subtitle2">From</Typography>

      <AgentsSelector/>

      <NamespaceSelector/>

      <Divider orientation="vertical"/>

      <Typography variant="subtitle2">To</Typography>

      <WorkspaceSelector/>
    </Box>
  )
})
