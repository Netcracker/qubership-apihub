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
import type { SpecType } from '../../utils/specs'
import type { LanguageType } from '../../types/languages'
import type { SpecItemUri } from '../../utils/specifications'
import { LoadingIndicator } from '../LoadingIndicator'

export type MonacoDiffEditorProps = {
  before: string
  after: string
  type: SpecType
  language?: LanguageType
  selectedUri?: SpecItemUri
}

const MonacoDiffEditorElement: FC<MonacoDiffEditorElementProps> = lazy(() => import('./MonacoDiffEditorElement'))

export const MonacoDiffEditor: FC<MonacoDiffEditorProps> = memo<MonacoDiffEditorProps>(({
  before,
  after,
  type,
  language,
  selectedUri,
}) => {
  return (
    <Suspense fallback={<LoadingIndicator/>}>
      <MonacoDiffEditorElement
        before={before}
        after={after}
        type={type}
        language={language}
        selectedUri={selectedUri}
      />
    </Suspense>
  )
})
