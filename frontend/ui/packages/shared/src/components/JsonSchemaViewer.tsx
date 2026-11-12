import type { FC } from 'react'
import { memo } from 'react'
import { Box } from '@mui/material'
import type { JsonSchemaViewerProps as JsonSchemaViewerElementProps } from '@netcracker/qubership-apihub-api-doc-viewer'
import { JsonSchemaViewer as JsonSchemaViewerElement } from '@netcracker/qubership-apihub-api-doc-viewer'
import '@netcracker/qubership-apihub-api-doc-viewer/dist/style.css'

export type JsonSchemaViewerProps = JsonSchemaViewerElementProps

// First Order Component //
export const JsonSchemaViewer: FC<JsonSchemaViewerProps> = /* @__PURE__ */ memo<JsonSchemaViewerProps>((props) => {
  return (
    <Box lineHeight={1.5} height="100%" data-testid="JsonSchemaViewer">
      <JsonSchemaViewerElement
        {...props}
      />
    </Box>
  )
})
