import type { FC } from 'react'
import { memo } from 'react'
import { Box } from '@mui/material'
import { RawSpecView } from './RawSpecView'
import type { SpecViewMode } from '../SpecViewToggler'
import { DOC_SPEC_VIEW_MODE, RAW_SPEC_VIEW_MODE } from '../SpecViewToggler'
import { JsonSchemaViewer } from '@netcracker/qubership-apihub-api-doc-viewer'
import { toJsonSchema } from '../../utils/specifications'
import type { Spec } from '../../entities/specs'

export const JSON_SCHEMA_VIEW_MODES: SpecViewMode[] = [DOC_SPEC_VIEW_MODE, RAW_SPEC_VIEW_MODE]

export type JsonSchemaSpecViewerProps = {
  view: SpecViewMode
  spec: Spec
  value: string
}

export const JsonSchemaSpecViewer: FC<JsonSchemaSpecViewerProps> = /* @__PURE__ */ memo<JsonSchemaSpecViewerProps>(({
  view,
  spec,
  value,
}) => {

  if (view === DOC_SPEC_VIEW_MODE) {
    return (
      <Box height="100%" overflow="scroll">
        <JsonSchemaViewer schema={toJsonSchema(value) as object}/>
      </Box>
    )
  }

  return (
    <RawSpecView
      sx={{ px: 4, height: '100%' }}
      value={value}
      {...spec}
    />
  )
})
