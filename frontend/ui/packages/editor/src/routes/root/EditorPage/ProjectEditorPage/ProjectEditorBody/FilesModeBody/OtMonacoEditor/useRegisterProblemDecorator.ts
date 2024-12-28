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

import type { editor as Editor } from 'monaco-editor'
import { editor, Range } from 'monaco-editor'
import { useEffect, useState } from 'react'
import { useContentLoading } from '../../../FileEditingWebSocketProvider'
import { monacoEditorNavigateTo } from './useOtMonaco'
import { useLocation } from 'react-use'
import type { FileProblem } from '../../../../../../../entities/file-problems'
import IEditorDecorationsCollection = editor.IEditorDecorationsCollection

export function useRegisterProblemDecorator(
  editor?: Editor.IStandaloneCodeEditor | null,
  problems?: FileProblem[],
): void {
  const [problemDecorations, setProblemDecorations] = useState<IEditorDecorationsCollection | undefined>(undefined)

  const { hash } = useLocation()
  const monacoEditorIsLoading = useContentLoading()

  useEffect(() => {
    if (hash === '#/' || monacoEditorIsLoading || !editor) {
      return
    }

    const lineNumber = hash ? +hash.split('#L')[1] : 1
    if (!Number.isNaN(lineNumber)) {
      monacoEditorNavigateTo(editor, lineNumber)
    }
  }, [editor, hash, monacoEditorIsLoading])

  useEffect(() => {
    if (!editor || !problems?.length || !editor.getValue()) {
      return
    }

    if (!problemDecorations) {
      setProblemDecorations(editor.createDecorationsCollection())
    }

    const decorations = problems
      .filter(message => message.externalFilePath === undefined)
      .map(({ lineNumber, text, type }) => ({
        range: new Range(lineNumber ?? 0, 0, lineNumber ?? 0, 0),
        options: {
          isWholeLine: false,
          glyphMarginClassName: `${type === 'error' ? 'MonacoErrorDecorator' : type === 'warn' ? 'MonacoWarnDecorator' : 'MonacoInfoDecorator'}`,
          glyphMarginHoverMessage: {
            value: text,
          },
        },
      }))

    problemDecorations?.set(decorations)

    return () => {
      problemDecorations?.clear()
    }
  }, [problemDecorations, editor, problems])
}
