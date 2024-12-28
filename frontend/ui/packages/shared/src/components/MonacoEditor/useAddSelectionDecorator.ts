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
import type { MutableRefObject } from 'react'
import { useEffect, useState } from 'react'
import { navigateTo } from './utils'
import type { SpecItemUri } from '../../utils/specifications'
import { findPathLocation } from '../../utils/specifications'
import IEditorDecorationsCollection = editor.IEditorDecorationsCollection
import IModelDeltaDecoration = editor.IModelDeltaDecoration

export function useAddSelectionDecorator(
  editor?: MutableRefObject<Editor.IStandaloneCodeEditor | undefined>,
  selectedUri?: SpecItemUri,
): void {
  const [selectionDecorations, setSelectionDecorations] = useState<IEditorDecorationsCollection | undefined>(undefined)

  useEffect(() => {
    const currentEditor = editor?.current

    if (!currentEditor || !selectedUri) {
      return
    }

    if (!selectionDecorations) {
      setSelectionDecorations(currentEditor.createDecorationsCollection())
    }

    const location = findPathLocation(currentEditor.getValue(), selectedUri)

    if (location) {
      const startLine = location?.range.start.line
      const endLine = location?.range.end.line

      const decorations: IModelDeltaDecoration[] = [{
        range: new Range(startLine + 1, 0, endLine + 1, 0),
        options: {
          isWholeLine: false,
          marginClassName: 'MonacoSelectedDecorator',
        },
      }]

      selectionDecorations?.set(decorations)

      navigateTo(currentEditor, startLine + 1)
    }

    return () => {
      selectionDecorations?.clear()
    }
  }, [selectionDecorations, editor, selectedUri])
}
