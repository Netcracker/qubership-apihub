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

import 'monaco-editor/esm/vs/editor/editor.all.js'
import 'monaco-editor/esm/vs/language/json/monaco.contribution'
import 'monaco-editor/esm/vs/basic-languages/yaml/yaml.contribution'
import 'monaco-editor/esm/vs/basic-languages/markdown/markdown.contribution'
import './index.css'

import type { FC } from 'react'
import { memo } from 'react'
import { useMonacoEditorElement } from './useMonacoEditorElement'
import type { SpecType } from '../../utils/specs'
import type { SpecItemUri } from '../../utils/specifications'
import type { LanguageType } from '../../types/languages'

export type MonacoEditorElementProps = {
  value: string
  type: SpecType
  language?: LanguageType
  selectedUri?: SpecItemUri
  searchPhrase?: string
  onSearchPhraseChange?: (value: string | undefined) => void
}

const MonacoEditorElement: FC<MonacoEditorElementProps> = /* @__PURE__ */ memo<MonacoEditorElementProps>((
  {
    value,
    type,
    language,
    selectedUri,
    searchPhrase,
    onSearchPhraseChange,
  },
) => {
  const element = useMonacoEditorElement({ value, type, language, selectedUri, searchPhrase, onSearchPhraseChange })

  return (
    <div
      ref={element}
      style={{ height: '100%' }}
    />
  )
})

export default MonacoEditorElement
