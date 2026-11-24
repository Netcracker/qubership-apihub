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
