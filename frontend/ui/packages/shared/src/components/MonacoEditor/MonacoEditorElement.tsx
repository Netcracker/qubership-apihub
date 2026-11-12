import 'monaco-editor/esm/vs/editor/editor.all.js'
import 'monaco-editor/esm/vs/language/json/monaco.contribution'
import 'monaco-editor/esm/vs/basic-languages/yaml/yaml.contribution'
import 'monaco-editor/esm/vs/basic-languages/markdown/markdown.contribution'
import './index.css'

import type { FC } from 'react'
import { memo } from 'react'
import { useMonacoEditorElement } from './useMonacoEditorElement'
import type { SpecType } from '../../utils/specs'
import type { SpecItemUri } from '../../utils/specifications'
import type { LanguageType } from '../../types/languages'
import type { editor as Editor } from 'monaco-editor'

export type MonacoEditorElementProps = {
  value: string
  type: SpecType
  language?: LanguageType
  selectedUri?: SpecItemUri // Example: '#/foo/bar/baz/qux/1'
  searchPhrase?: string
  onSearchPhraseChange?: (value: string | undefined) => void
  markers?: Editor.IMarkerData[]
}

const MonacoEditorElement: FC<MonacoEditorElementProps> = /* @__PURE__ */ memo<MonacoEditorElementProps>((
  {
    value,
    type,
    language,
    selectedUri,
    searchPhrase,
    onSearchPhraseChange,
    markers,
  },
) => {
  const element = useMonacoEditorElement({ value, type, language, selectedUri, searchPhrase, onSearchPhraseChange, markers })

  return (
    <div
      ref={element}
      style={{ height: '100%' }}
    />
  )
})

export default MonacoEditorElement
