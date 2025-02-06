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

import { editor as Editor, Uri } from 'monaco-editor'
import type { MutableRefObject } from 'react'
import { useEffect } from 'react'
import type { SpecType } from '../../utils/specs'
import type { LanguageType } from '../../types/languages'

export function useSetEditorModel(
  editor: MutableRefObject<Editor.IStandaloneCodeEditor | undefined>,
  value: string,
  type: SpecType,
  language?: LanguageType,
): void {
  const filename = `${type}/*.${language}`

  useEffect(() => {
    const currentEditor = editor.current
    if (!currentEditor) {
      return
    }

    currentEditor.setModel(Editor.createModel(value, language, Uri.parse(filename)))

    return () => {
      currentEditor.getModel()?.dispose()
      currentEditor.getModel()?.dispose()
    }
  }, [editor, value, language, filename])
}
