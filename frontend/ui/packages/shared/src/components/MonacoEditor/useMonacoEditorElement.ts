import type { editor as Editor } from 'monaco-editor'
import type { RefObject } from 'react'
import { useRef } from 'react'
import type { LanguageType } from '../../types/languages'
import type { SpecItemUri } from '../../utils/specifications'
import type { SpecType } from '../../utils/specs'
import { useAddMarkers } from './useAddMarkers'
import { useAddSearchNavigation } from './useAddSearchNavigation'
import { useAddSelectedUriNavigation } from './useAddSelectedUriNavigation'
import { useAddSelectionDecorator } from './useAddSelectionDecorator'
import { useInitializeEditor } from './useInitializeEditor'
import { useSetEditorModel } from './useSetEditorModel'

export function useMonacoEditorElement(options: {
  value: string
  type: SpecType
  language?: LanguageType
  selectedUri?: SpecItemUri // Example: '#/foo/bar/baz/qux/1'
  searchPhrase?: string
  onSearchPhraseChange?: (value: string | undefined) => void
  markers?: Editor.IMarkerData[]
}): RefObject<HTMLDivElement> {
  const { value, type, language, selectedUri, searchPhrase, onSearchPhraseChange, markers } = options

  const ref = useRef<HTMLDivElement>(null)
  const editor = useRef<Editor.IStandaloneCodeEditor>()

  useInitializeEditor(ref, editor, value, language)
  useSetEditorModel(editor, value, type, language)

  useAddSelectionDecorator(editor, selectedUri)
  useAddSelectedUriNavigation(editor, selectedUri)
  useAddSearchNavigation(editor, searchPhrase, onSearchPhraseChange)
  useAddMarkers(editor, markers)

  return ref
}
