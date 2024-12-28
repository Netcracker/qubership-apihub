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

import { editor as Editor, Uri } from 'monaco-editor/esm/vs/editor/editor.api'
import type { RefObject } from 'react'
import { useRef, useState } from 'react'
import { useUpdateModel } from './useUpdateModel'
import { useDebounce, useEffectOnce, useLocation } from 'react-use'
import { preconfigureOtMonaco } from './configurator'
import { useRegisterLinks } from './useRegisterLinks'
import { useRegisterSelectionDecorator } from './useRegisterSelectionDecorator'
import { useRegisterProblemDecorator } from './useRegisterProblemDecorator'
import type { SpecType } from '@netcracker/qubership-apihub-ui-shared/utils/specs'
import type { SpecItemUri } from '@netcracker/qubership-apihub-ui-shared/utils/specifications'
import { useModeSearchParam } from '../../../../../useModeSearchParam'
import { useFileSearchParam } from '../../../../../useFileSearchParam'
import { useBranchSearchParam } from '../../../../../useBranchSearchParam'
import type { FileProblem } from '../../../../../../../entities/file-problems'
import type { LanguageType } from '@netcracker/qubership-apihub-ui-shared/types/languages'

preconfigureOtMonaco()

export function useOtMonaco(options: {
  value: string
  type: SpecType
  language?: LanguageType
  readonly?: boolean
  problems?: FileProblem[]
  selectedUri?: SpecItemUri
  setMonacoContent?: (content: string) => void
}): [RefObject<HTMLDivElement>, Editor.IStandaloneCodeEditor | null] {
  const { value, type, language, readonly, problems, selectedUri, setMonacoContent } = options

  const ref = useRef<HTMLDivElement>(null)
  const [editor, setEditor] = useState<Editor.IStandaloneCodeEditor | null>(null)
  const [content, setContent] = useState<string>('')
  const [currentBranch] = useBranchSearchParam()
  const [fileKey] = useFileSearchParam()
  const [mode] = useModeSearchParam()
  const { pathname, origin } = useLocation()
  const filename = `${type}/*.${language}`

  useDebounce(() => setMonacoContent?.(content), 1000, [content])

  useRegisterSelectionDecorator(editor, selectedUri)
  useRegisterProblemDecorator(editor, problems)
  useRegisterLinks(editor, origin, pathname, currentBranch, mode, fileKey)

  useEffectOnce(() => {
    const model = Editor.createModel(
      value,
      language,
      Uri.parse(filename),
    )
    model.setEOL(Editor.EndOfLineSequence.LF)

    Editor.defineTheme('custom', {
      base: 'vs',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#FFFFFF',
      },
    })

    const codeEditor = Editor.create(ref.current!, {
      minimap: { enabled: readonly },
      hover: { above: false },
      automaticLayout: true,
      readOnly: readonly,
      wordWrap: 'on',
      tabSize: 2,
      model: model,
      glyphMargin: true,
      theme: 'custom',
    })

    setContent(value)
    codeEditor.onDidChangeModelContent(() => setContent(codeEditor.getValue()))

    codeEditor.changeViewZones(changeAccessor => changeAccessor.addZone({
      afterLineNumber: 0,
      domNode: document.createElement('div'),
    }))

    setEditor(codeEditor)

    return () => {
      codeEditor.getModel()?.dispose()
      codeEditor.dispose()
    }
  })

  useUpdateModel(editor, filename, language)

  return [ref, editor]
}

export function monacoEditorNavigateTo(
  editor: Editor.IStandaloneCodeEditor,
  lineNumber: number,
): void {
  editor.revealLineNearTop(lineNumber, Editor.ScrollType.Smooth)
  editor.setPosition({ lineNumber: lineNumber, column: 0 })
  editor.focus()
}
