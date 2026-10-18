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
import { memo, Suspense, useMemo } from 'react'
import { Box, IconButton, Typography } from '@mui/material'
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import type { OpenAPIV3 } from 'openapi-types'
import { JsonSchemaViewer } from '@netcracker/qubership-apihub-ui-shared/components/JsonSchemaViewer'
import { LoadingIndicator } from '@netcracker/qubership-apihub-ui-shared/components/LoadingIndicator'
import type { SchemaViewMode } from '@netcracker/qubership-apihub-ui-shared/entities/schema-view-mode'
import { DETAILED_SCHEMA_VIEW_MODE } from '@netcracker/qubership-apihub-ui-shared/entities/schema-view-mode'

export const CONTEXT_PANEL_DEFAULT_WIDTH = 300

export type SchemaContextPanelProps = {
  contextSchema?: OpenAPIV3.SchemaObject
  displayMode?: SchemaViewMode
  onClose: () => void
  title?: string | null
}

// First Order Component //
export const SchemaContextPanel: FC<SchemaContextPanelProps> = memo<SchemaContextPanelProps>(({
  contextSchema,
  displayMode = DETAILED_SCHEMA_VIEW_MODE,
  onClose,
  title,
}) => {
  const calculatedTitle = useMemo(() => title ?? (contextSchema as OpenAPIV3.SchemaObject)?.title ?? '', [contextSchema, title])

  return (
    <Suspense fallback={<LoadingIndicator/>}>
      <Box height="100%" width="100%" overflow="hidden" display="flex" flexDirection="column">
        <Box pl={2} pt={2} pb={0} alignItems="center" display="flex" justifyContent="space-between">
          <Typography variant="h2" color="inherit">{calculatedTitle}</Typography>
          <IconButton onClick={onClose}>
            <CloseOutlinedIcon fontSize="small"/>
          </IconButton>
        </Box>
        <Box px={1} overflow="hidden auto">
          <JsonSchemaViewer
            schema={contextSchema}
            expandedDepth={SCHEMA_EXPANDED_DEPTH}
            displayMode={displayMode}
          />
        </Box>
      </Box>
    </Suspense>
  )
})

const SCHEMA_EXPANDED_DEPTH = 1
