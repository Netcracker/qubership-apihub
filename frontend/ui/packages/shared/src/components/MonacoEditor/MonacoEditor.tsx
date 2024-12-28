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
import { LoadingIndicator } from '../LoadingIndicator'
import type { MonacoEditorElementProps } from './MonacoEditorElement'
import type { SpecType } from '../../utils/specs'
import type { SpecItemUri } from '../../utils/specifications'
import type { LanguageType } from '../../types/languages'

export type MonacoEditorProps = {
  value: string
  type: SpecType
  language?: LanguageType
  selectedUri?: SpecItemUri
  searchPhrase?: string
  onSearchPhraseChange?: (value: string | undefined) => void
}

const MonacoEditorElement: FC<MonacoEditorElementProps> = lazy(() => import('./MonacoEditorElement'))

export const MonacoEditor: FC<MonacoEditorProps> = /* @__PURE__ */ memo<MonacoEditorProps>((
  {
    value,
    type,
    language,
    selectedUri,
    searchPhrase,
    onSearchPhraseChange,
  },
) => {
  return (
    <Suspense fallback={<LoadingIndicator/>}>
      <MonacoEditorElement
        value={value}
        type={type}
        language={language}
        selectedUri={selectedUri}
        searchPhrase={searchPhrase}
        onSearchPhraseChange={onSearchPhraseChange}
      />
    </Suspense>
  )
})
