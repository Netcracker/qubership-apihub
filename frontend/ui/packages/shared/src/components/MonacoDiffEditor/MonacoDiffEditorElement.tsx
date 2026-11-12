import 'monaco-editor/esm/vs/editor/editor.all.js'
import 'monaco-editor/esm/vs/language/json/monaco.contribution'
import 'monaco-editor/esm/vs/basic-languages/yaml/yaml.contribution'
import 'monaco-editor/esm/vs/basic-languages/markdown/markdown.contribution'

import type { FC } from 'react'
import { memo } from 'react'
import { useMonacoDiffEditorElement } from './useMonacoDiffEditorElement'
import type { SpecType } from '../../utils/specs'
import type { LanguageType } from '../../types/languages'
import type { SpecItemUri } from '../../utils/specifications'

export type MonacoDiffEditorElementProps = {
  before: string
  after: string
  type: SpecType
  language?: LanguageType
  selectedUri?: SpecItemUri
}

const MonacoDiffEditorElement: FC<MonacoDiffEditorElementProps> = memo<MonacoDiffEditorElementProps>(({
  before,
  after,
  type,
  language,
  selectedUri,
}) => {
  const element = useMonacoDiffEditorElement({ before, after, type, language, selectedUri })

  return (
    <div
      ref={element}
      style={{ height: '100%' }}
    />
  )
})

export default MonacoDiffEditorElement
