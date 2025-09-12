import { editor as Editor } from 'monaco-editor'
import type { MutableRefObject } from 'react'
import { useEffect } from 'react'

export function useAddMarkers(
  editor: MutableRefObject<Editor.IStandaloneCodeEditor | undefined>,
  markers: Editor.IMarkerData[] = [],
): void {
  useEffect(() => {
    if (markers.length === 0) {
      return
    }

    const currentEditor = editor.current
    if (!currentEditor) {
      return
    }

    const model = currentEditor.getModel()
    if (!model) {
      return
    }

    Editor.setModelMarkers(model, 'owner', markers)
  }, [editor, markers])
}
