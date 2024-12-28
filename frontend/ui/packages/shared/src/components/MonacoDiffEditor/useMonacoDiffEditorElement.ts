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
import { useEffect, useRef } from 'react'
import { editor as Editor } from 'monaco-editor'
import { useEffectOnce } from 'react-use'
import type { SpecType } from '../../utils/specs'
import type { LanguageType } from '../../types/languages'
import { LANGUAGE_TYPE_TEXT } from '../../types/languages'
import type { SpecItemUri } from '../../utils/specifications'
import { findPathLocation } from '../../utils/specifications'

export function useMonacoDiffEditorElement(options: {
  before: string
  after: string
  type: SpecType
  language?: LanguageType
  selectedUri?: SpecItemUri
}): RefObject<HTMLDivElement> {
  const { before, after, type, language = LANGUAGE_TYPE_TEXT, selectedUri } = options

  const ref = useRef<HTMLDivElement>(null)
  const editor = useRef<Editor.IStandaloneDiffEditor>()

  useEffectOnce(() => {
    Editor.defineTheme('custom', {
      base: 'vs',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#FFFFFF',
      },
    })

    editor.current = Editor.createDiffEditor(ref.current!, {
      minimap: { enabled: true },
      hover: { above: false },
      automaticLayout: true,
      readOnly: true,
      wordWrap: 'on',
      glyphMargin: true,
      theme: 'custom',
    })

    return () => {
      editor.current?.dispose()
    }
  })

  useEffect(() => {
    //todo resolve problem with load schema model by filename (like in useSetEditorModel)
    editor.current?.setModel({
      original: Editor.createModel(before, language),
      modified: Editor.createModel(after, language),
    })

    return () => {
      editor.current?.getModel()?.original?.dispose()
      editor.current?.getModel()?.modified?.dispose()
    }
  }, [editor, before, after, language, type])

  useEffect(() => {
    const content = editor.current?.getModel()?.modified.getValue()
    if (selectedUri && content) {
      const location = findPathLocation(content, selectedUri)
      if (location) {
        const startLine = location?.range.start.line
        navigateTo(editor.current!, startLine + 1)
      }
    }
  }, [selectedUri])

  return ref
}

function navigateTo(
  editor: Editor.IStandaloneDiffEditor,
  lineNumber: number,
): void {
  editor.revealLineNearTop(lineNumber, Editor.ScrollType.Smooth)
  editor.setPosition({ lineNumber: lineNumber, column: 0 })
  editor.focus()
}
