/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
