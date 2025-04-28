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

import { Box } from '@mui/material'
import type { FC, PropsWithChildren } from 'react'
import { lazy, memo, Suspense } from 'react'
import type { PlaygroundElementProps } from './PlaygroundElement'
import { LoadingIndicator } from '@netcracker/qubership-apihub-ui-shared/components/LoadingIndicator'
import { getToken } from '@netcracker/qubership-apihub-ui-shared/utils/storages'
import { v4 as uuidv4 } from 'uuid'

export type PlaygroundProps = PropsWithChildren<{
  document?: string
  customServers?: string
}>

const PlaygroundElement: FC<PlaygroundElementProps> = lazy(() => import('./PlaygroundElement'))

export const Playground: FC<PlaygroundProps> = memo<PlaygroundProps>(({ document, customServers }) => {
  return (
    <Suspense fallback={<LoadingIndicator/>}>
      <Box lineHeight={1.5} height="100%" width="100%" data-testid="PlaygroundPanel">
        <PlaygroundElement
          //TODO: This key allows you to update the list of servers after adding a new one.
          //TODO: It is necessary to find out why the list is not updated independently in order to get rid of key={uuidv4()}
          key={uuidv4()}
          document={document}
          customServers={customServers}
          token={getToken()}
          origin={window.location.origin}
        />
      </Box>
    </Suspense>
  )
})
