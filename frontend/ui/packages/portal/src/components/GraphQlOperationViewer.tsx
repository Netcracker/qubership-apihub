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
}) => {
  return (
    <Box lineHeight={1.5} height="100%">
      <GraphQLOperationViewer
        key={crypto.randomUUID()}
        source={source}
        displayMode={displayMode}
      />
    </Box>
  )
})
