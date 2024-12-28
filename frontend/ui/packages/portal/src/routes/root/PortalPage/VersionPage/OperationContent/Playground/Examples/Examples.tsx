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
import type { ExamplesElementProps } from './ExamplesElement'
import { LoadingIndicator } from '@netcracker/qubership-apihub-ui-shared/components/LoadingIndicator'

export type ExamplesProps = PropsWithChildren<{
  document?: string
  fullScreenAvailable?: boolean
}>

const ExamplesElement: FC<ExamplesElementProps> = lazy(() => import('./ExamplesElement'))

export const Examples: FC<ExamplesProps> = memo<ExamplesProps>(({ document, fullScreenAvailable }) => {
  return (
    <Suspense fallback={<LoadingIndicator/>}>
      <Box lineHeight={1.5} height="100%" width="100%" data-testid="ExamplesPanel">
        <ExamplesElement
          key={crypto.randomUUID()}
          document={document}
          fullScreenAvailable={fullScreenAvailable}
        />
      </Box>
    </Suspense>
  )
})
