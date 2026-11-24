import type { GraphQLOperationViewerProps } from '@netcracker/qubership-apihub-api-doc-viewer'
import { GraphQLOperationViewer } from '@netcracker/qubership-apihub-api-doc-viewer'
import '@netcracker/qubership-apihub-api-doc-viewer/dist/style.css'
import type { FC } from 'react'
import { memo } from 'react'
import { Box } from '@mui/material'

export type GraphQlOperationViewerProps = GraphQLOperationViewerProps
export const GraphQlOperationViewer: FC<GraphQlOperationViewerProps> = memo<GraphQlOperationViewerProps>(({
  source,
  displayMode,
  operationType,
  operationName,
}) => {
  return (
    <Box lineHeight={1.5} height="100%">
      <GraphQLOperationViewer
        source={source}
        displayMode={displayMode}
        operationType={operationType}
        operationName={operationName}
      />
    </Box>
  )
})
