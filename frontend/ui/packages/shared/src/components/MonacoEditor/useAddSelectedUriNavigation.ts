import type { editor as Editor } from 'monaco-editor'
import type { MutableRefObject } from 'react'
import { useEffect } from 'react'
import { navigateTo } from './utils'
import type { SpecItemUri } from '../../utils/specifications'
import { findPathLocation } from '../../utils/specifications'

export function useAddSelectedUriNavigation(
  editor: MutableRefObject<Editor.IStandaloneCodeEditor | undefined>,
  selectedUri?: SpecItemUri,
): void {
  useEffect(() => {
    const currentEditor = editor.current
    if (!currentEditor) {
      return
    }

    const content = currentEditor.getModel()?.getValue()
    if (selectedUri && content) {
      const location = findPathLocation(content, selectedUri)
      const startLine = location?.range.start.line ?? 0
      navigateTo(currentEditor, startLine + 1)
    }
  }, [editor, selectedUri])
}
