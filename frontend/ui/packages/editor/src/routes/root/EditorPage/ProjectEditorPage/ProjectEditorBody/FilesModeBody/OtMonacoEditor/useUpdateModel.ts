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

import { editor as Editor } from 'monaco-editor/esm/vs/editor/editor.api'
import { useEffect } from 'react'

export function useUpdateModel(
  editor: Editor.IStandaloneCodeEditor | null,
  filename: string,
  language?: string,
): void {
  useEffect(
    () => {
      const model = editor?.getModel()
      if (model) {
        language && Editor.setModelLanguage(model, language)
        editor?.setModel(model)
      }
    },
    [editor, filename, language],
  )
}
