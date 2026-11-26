import type { FC } from 'react'
import { memo } from 'react'
import { Box, Divider, Typography } from '@mui/material'
import { NamespaceSelector } from './NamespaceSelector'
import { WorkspaceSelector } from './WorkspaceSelector'
import { AgentsSelector } from './AgentsSelector'
import { CloudIcon } from '@netcracker/qubership-apihub-ui-shared/icons/CloudIcon'
import { LARGE_TOOLBAR_SIZE, Toolbar } from '@netcracker/qubership-apihub-ui-shared/components/Toolbar'
import { GREY_LONDON_FOG_COLOR, GREY_NIAGARA_COLOR } from '@netcracker/qubership-apihub-ui-shared/themes/colors'
import { useCreateSnapshotStepStatus } from './ServicesPage/ServicesPageBody/CreateSnapshotStep/useCreateSnapshotStepStatus'
import { RUNNING_STEP_STATUS } from './ServicesPage/ServicesPageProvider/servicesSteps'

const FIELD_HEIGHT = 44

// The large toolbar is 72px high, as in the design, and leaves 14px above and below the 44px fields; the design pads
// it by 16px on the sides
export const NamespaceToolbar: FC = memo(() => {
  // Another cloud, namespace, or workspace clears the snapshots of the wizard: the outcome of a running publication
  // would show nowhere, and a create request answered later would lose its snapshot or add it to another workspace
  const areSelectorsLocked = useCreateSnapshotStepStatus() === RUNNING_STEP_STATUS

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
            <Typography variant="subtitle4" color={GREY_NIAGARA_COLOR}>From</Typography>
            <AgentsSelector disabled={areSelectorsLocked} />
            <NamespaceSelector disabled={areSelectorsLocked} />
          </Box>

          <Divider variant="fullWidth" flexItem={false} sx={{ height: 24, borderColor: GREY_LONDON_FOG_COLOR }} />

          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="subtitle4" color={GREY_NIAGARA_COLOR}>To</Typography>
            <WorkspaceSelector disabled={areSelectorsLocked} />
          </Box>
        </Box>
      }
    />
  )
})
