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

import { editor as Editor } from 'monaco-editor'
import type { MutableRefObject, RefObject } from 'react'
import { useEffectOnce } from 'react-use'
import type { LanguageType } from '../../types/languages'

export function useInitializeEditor(
  ref: RefObject<HTMLDivElement>,
  editor: MutableRefObject<Editor.IStandaloneCodeEditor | undefined>,
  value: string,
  language?: LanguageType,
): void {
  useEffectOnce(() => {
    const model = Editor.createModel(value, language)

    Editor.defineTheme('custom', {
      base: 'vs',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#FFFFFF',
      },
    })

    editor.current = Editor.create(ref.current!, {
      minimap: { enabled: true },
      hover: { above: false },
      automaticLayout: true,
      readOnly: true,
      wordWrap: 'on',
      tabSize: 2,
      model: model,
      glyphMargin: true,
      theme: 'custom',
    })

    return () => {
      editor.current?.getModel()?.dispose()
      editor.current?.dispose()
    }
  })
}
