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

import type { FC } from 'react'
import { memo } from 'react'
import { useMonacoDiffEditorElement } from './useMonacoDiffEditorElement'
import type { SpecType } from '../../utils/specs'
import type { LanguageType } from '../../types/languages'
import type { SpecItemUri } from '../../utils/specifications'

export type MonacoDiffEditorElementProps = {
  before: string
  after: string
  type: SpecType
  language?: LanguageType
  selectedUri?: SpecItemUri
}

const MonacoDiffEditorElement: FC<MonacoDiffEditorElementProps> = memo<MonacoDiffEditorElementProps>(({
  before,
  after,
  type,
  language,
  selectedUri,
}) => {
  const element = useMonacoDiffEditorElement({ before, after, type, language, selectedUri })

  return (
    <div
      ref={element}
      style={{ height: '100%' }}
    />
  )
})

export default MonacoDiffEditorElement
