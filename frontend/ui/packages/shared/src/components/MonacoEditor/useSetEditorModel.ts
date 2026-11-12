import { editor as Editor, Uri } from 'monaco-editor'
import type { MutableRefObject } from 'react'
import { useEffect } from 'react'
import type { LanguageType } from '../../types/languages'
import type { SpecType } from '../../utils/specs'

export function useSetEditorModel(
  editor: MutableRefObject<Editor.IStandaloneCodeEditor | undefined>,
  value: string,
  type: SpecType,
  language?: LanguageType,
): void {
  const filename = `${type}/*.${language}`

  useEffect(() => {
    const currentEditor = editor.current
    if (!currentEditor) {
      return
    }

    currentEditor.setModel(Editor.createModel(value, language, Uri.parse(filename)))

    return () => {
      currentEditor.getModel()?.dispose()
    }
  }, [editor, value, language, filename])
}
