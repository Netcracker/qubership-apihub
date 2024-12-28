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
import { lazy, memo, Suspense } from 'react'
import type { MonacoDiffEditorElementProps } from './MonacoDiffEditorElement'
import type { SpecItemUri } from '@netcracker/qubership-apihub-ui-shared/utils/specifications'
import { LoadingIndicator } from '@netcracker/qubership-apihub-ui-shared/components/LoadingIndicator'

export type MonacoDiffEditorProps = {
  before: string
  after: string
  selectedUri?: SpecItemUri
}

const MonacoDiffEditorElement: FC<MonacoDiffEditorElementProps> = lazy(() => import('./MonacoDiffEditorElement'))

export const MonacoDiffEditor: FC<MonacoDiffEditorProps> = memo<MonacoDiffEditorProps>(({
  before,
  after,
  selectedUri,
}) => {
  return (
    <Suspense fallback={<LoadingIndicator/>}>
      <MonacoDiffEditorElement
        before={before}
        after={after}
        selectedUri={selectedUri}
      />
    </Suspense>
  )
})
