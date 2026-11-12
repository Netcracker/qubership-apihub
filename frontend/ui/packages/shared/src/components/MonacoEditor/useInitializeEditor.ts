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
      renderValidationDecorations: 'on',
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
