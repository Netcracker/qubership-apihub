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

import type { RefObject } from 'react'
import { useRef } from 'react'
import type { editor as Editor } from 'monaco-editor'
import { useAddSelectionDecorator } from './useAddSelectionDecorator'
import { useAddSearchNavigation } from './useAddSearchNavigation'
import { useAddSelectedUriNavigation } from './useAddSelectedUriNavigation'
import { useSetEditorModel } from './useSetEditorModel'
import { useInitializeEditor } from './useInitializeEditor'
import { preconfigureMonaco } from './configurator'
import type { SpecType } from '../../utils/specs'
import type { SpecItemUri } from '../../utils/specifications'
import type { LanguageType } from '../../types/languages'

preconfigureMonaco()

export function useMonacoEditorElement(options: {
  value: string
  type: SpecType
  language?: LanguageType
  selectedUri?: SpecItemUri
  searchPhrase?: string
  onSearchPhraseChange?: (value: string | undefined) => void
}): RefObject<HTMLDivElement> {
  const { value, type, language, selectedUri, searchPhrase, onSearchPhraseChange } = options

  const ref = useRef<HTMLDivElement>(null)
  const editor = useRef<Editor.IStandaloneCodeEditor>()

  useInitializeEditor(ref, editor, value, language)
  useSetEditorModel(editor, value, type, language)

  useAddSelectionDecorator(editor, selectedUri)
  useAddSelectedUriNavigation(editor, selectedUri)
  useAddSearchNavigation(editor, searchPhrase, onSearchPhraseChange)

  return ref
}
