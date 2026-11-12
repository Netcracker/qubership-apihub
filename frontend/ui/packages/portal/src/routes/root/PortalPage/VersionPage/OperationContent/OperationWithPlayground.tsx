import { Examples } from '@portal/routes/root/PortalPage/VersionPage/OperationContent/Playground/Examples/Examples'
import { Playground } from '@portal/routes/root/PortalPage/VersionPage/OperationContent/Playground/Playground'
import {
  usePlaygroundEvents,
} from './Playground/hooks/usePlaygroundEvents'
import { Box } from '@mui/material'
import { ModuleFetchingErrorBoundary } from '@netcracker/qubership-apihub-ui-shared/components/ModuleFetchingErrorBoundary/ModuleFetchingErrorBoundary'
import { NAVIGATION_MAX_WIDTH } from '@netcracker/qubership-apihub-ui-shared/utils/page-layouts'
import { Resizable } from 're-resizable'
import type { FC, ReactNode } from 'react'
import { memo } from 'react'
import { CreateCustomServerDialog } from './Playground/components/CreateCustomServerDialog'
import { DeleteCustomServerDialog } from './Playground/components/DeleteCustomServerDialog'
import { ExamplesDialog } from './Playground/Examples/ExamplesDialog'

export type OperationWithPlaygroundProps = {
  changedOperationContent: string
  customServers: string
  operationComponent: ReactNode
  isPlaygroundMode: boolean
  isExamplesMode: boolean
  isPlaygroundSidebarOpen: boolean
}

export const OperationWithPlayground: FC<OperationWithPlaygroundProps> = memo<OperationWithPlaygroundProps>((props) => {
  const {
    changedOperationContent,
    customServers,
    operationComponent,
    isPlaygroundSidebarOpen,
    isPlaygroundMode,
    isExamplesMode,
  } = props

  usePlaygroundEvents()

  return (
    <Box display="grid" gridTemplateColumns="1fr auto" height="inherit">
      <Box overflow="auto" height="100%">
        {operationComponent}
      </Box>

      {isPlaygroundSidebarOpen && (
        <Resizable
          style={{
            borderLeft: '1px solid #D5DCE3',
            backgroundColor: '#FFFFFF',
            paddingRight: '24px',
          }}
          enable={{
            top: false,
            right: false,
            bottom: false,
            left: true,
            topRight: false,
            bottomRight: false,
            bottomLeft: false,
            topLeft: false,
          }}
          boundsByDirection={true}
          defaultSize={{ width: PLAYGROUND_DEFAULT_WIDTH, height: '100%' }}
          maxWidth={PLAYGROUND_MAX_WIDTH}
          minWidth="300px"
        >
          <ModuleFetchingErrorBoundary>
            {isPlaygroundMode && <Playground document={changedOperationContent} customServers={customServers} />}
            {isExamplesMode && <Examples document={changedOperationContent} />}
          </ModuleFetchingErrorBoundary>
        </Resizable>
      )}

      <CreateCustomServerDialog />
      <DeleteCustomServerDialog />
      <ExamplesDialog document={changedOperationContent} />
    </Box>
  )
})

export const PLAYGROUND_DEFAULT_WIDTH = 300
export const PLAYGROUND_MAX_WIDTH = NAVIGATION_MAX_WIDTH
