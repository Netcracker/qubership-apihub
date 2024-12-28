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
import { monacoEditorNavigateTo } from './useOtMonaco'
import type { SpecItemUri } from '@netcracker/qubership-apihub-ui-shared/utils/specifications'
import { findPathLocation } from '@netcracker/qubership-apihub-ui-shared/utils/specifications'
import IEditorDecorationsCollection = editor.IEditorDecorationsCollection
import IModelDeltaDecoration = editor.IModelDeltaDecoration

export function useRegisterSelectionDecorator(
  editor?: Editor.IStandaloneCodeEditor | null,
  selectedUri?: SpecItemUri,
): void {
  const [selectionDecorations, setSelectionDecorations] = useState<IEditorDecorationsCollection | undefined>(undefined)

  useEffect(() => {
    if (!editor || !selectedUri) {
      return
    }

    if (!selectionDecorations) {
      setSelectionDecorations(editor.createDecorationsCollection())
    }

    const location = findPathLocation(editor.getValue(), selectedUri) ??
      findPathLocation(editor.getValue(), selectedUri.slice(0, selectedUri.lastIndexOf('/')))

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

      monacoEditorNavigateTo(editor, startLine + 1)
    }

    return () => {
      selectionDecorations?.clear()
    }
  }, [selectionDecorations, editor, selectedUri])
}
