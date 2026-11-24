import type { FC } from 'react'
import { lazy, memo, Suspense } from 'react'
import { LoadingIndicator } from '../LoadingIndicator'
import type { MonacoEditorElementProps } from './MonacoEditorElement'
import type { SpecType } from '../../utils/specs'
import type { SpecItemUri } from '../../utils/specifications'
import type { LanguageType } from '../../types/languages'
import type { editor as Editor } from 'monaco-editor'

export type MonacoEditorProps = {
  value: string
  type: SpecType
  language?: LanguageType
  selectedUri?: SpecItemUri // Example: /foo/bar/baz/qux/1
  searchPhrase?: string
  onSearchPhraseChange?: (value: string | undefined) => void
  markers?: Editor.IMarkerData[]
}

const MonacoEditorElement: FC<MonacoEditorElementProps> = lazy(() => import('./MonacoEditorElement'))

export const MonacoEditor: FC<MonacoEditorProps> = /* @__PURE__ */ memo<MonacoEditorProps>((
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
  return (
    <Suspense fallback={<LoadingIndicator />}>
      <MonacoEditorElement
        value={value}
        type={type}
        language={language}
        selectedUri={selectedUri}
        searchPhrase={searchPhrase}
        onSearchPhraseChange={onSearchPhraseChange}
        markers={markers}
      />
    </Suspense>
  )
})
