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

import type { FC, ReactNode } from 'react'
import React, { memo } from 'react'
import { Box } from '@mui/material'
import { Resizable } from 're-resizable'
import {
  usePlaygroundEvents,
} from '@apihub/routes/root/PortalPage/VersionPage/OperationContent/Playground/usePlaygroundEvents'
import { Playground } from '@apihub/routes/root/PortalPage/VersionPage/OperationContent/Playground/Playground'
import { Examples } from '@apihub/routes/root/PortalPage/VersionPage/OperationContent/Playground/Examples/Examples'
import { CreateCustomServerDialog } from './Playground/CreateCustomServerDialog'
import { ExamplesDialog } from './Playground/Examples/ExamplesDialog'
import { NAVIGATION_MAX_WIDTH } from '@netcracker/qubership-apihub-ui-shared/utils/page-layouts'

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
          {isPlaygroundMode && <Playground document={changedOperationContent} customServers={customServers}/>}
          {isExamplesMode && <Examples document={changedOperationContent}/>}
        </Resizable>
      )}

      <CreateCustomServerDialog/>
      <ExamplesDialog document={changedOperationContent}/>
    </Box>
  )
})

export const PLAYGROUND_DEFAULT_WIDTH = 300
export const PLAYGROUND_MAX_WIDTH = NAVIGATION_MAX_WIDTH
