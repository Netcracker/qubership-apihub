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

import type { editor as Editor, IEvent } from 'monaco-editor'
import type { MutableRefObject } from 'react'
import { useEffect, useState } from 'react'
import { useDebounce, useEffectOnce } from 'react-use'

export function useAddSearchNavigation(
  editor: MutableRefObject<Editor.IStandaloneCodeEditor | undefined>,
  searchPhrase?: string,
  onSearchPhraseChange?: (value: string | undefined) => void,
): void {
  const [searchString, setSearchString] = useState<string>('')

  useDebounce(() => onSearchPhraseChange?.(searchString), 500, [searchString])

  useEffect(() => {
    const state = getFindControllerState(editor)
    const listener = state?.onFindReplaceStateChange(({ searchString }) => {
      if (searchString) {
        setSearchString(state._searchString)
      }
    })
    return listener?.dispose
  }, [editor])

  useEffectOnce(() => {
    const currentEditor = editor.current
    if (!searchPhrase || !currentEditor) {
      return
    }

    setSearchString(searchPhrase)

    const range = currentEditor.getModel()?.findMatches(searchPhrase, false, false, false, null, true)[0]?.range
    range && currentEditor.setSelection(range)
    currentEditor.getAction('actions.find')?.run().then()
  })
}

function getFindControllerState(
  editor: MutableRefObject<Editor.IStandaloneCodeEditor | undefined>,
): FindControllerState {
  return (editor.current
    ?.getContribution('editor.contrib.findController') as unknown as FindController)
    ?.getState()
}

type FindController = {
  getState: () => FindControllerState
}

type FindControllerState = {
  _searchString: string
  readonly onFindReplaceStateChange: IEvent<FindReplaceStateChangedEvent>
}

type FindReplaceStateChangedEvent = {
  moveCursor: boolean
  updateHistory: boolean

  searchString: boolean
  replaceString: boolean
  isRevealed: boolean
  isReplaceRevealed: boolean
  isRegex: boolean
  wholeWord: boolean
  matchCase: boolean
  preserveCase: boolean
  searchScope: boolean
  matchesPosition: boolean
  matchesCount: boolean
  currentMatch: boolean
  loop: boolean
  isSearching: boolean
  filters: boolean
}
