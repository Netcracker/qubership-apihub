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

import type { Dispatch, FC, PropsWithChildren, SetStateAction } from 'react'
import { createContext, memo, useContext, useState } from 'react'

export const MonacoContentProvider: FC<PropsWithChildren> = memo<PropsWithChildren>(({ children }) => {
  const [content, setContent] = useState('')

  return (
    <MonacoEditorContentContext.Provider value={content}>
      <SetMonacoEditorContentContext.Provider value={setContent}>
        {children}
      </SetMonacoEditorContentContext.Provider>
    </MonacoEditorContentContext.Provider>
  )
})
const MonacoEditorContentContext = createContext<string>()
const SetMonacoEditorContentContext = createContext<Dispatch<SetStateAction<string>>>()

export function useMonacoEditorContent(): string {
  return useContext(MonacoEditorContentContext)
}

export function useSetMonacoEditorContent(): Dispatch<SetStateAction<string>> {
  return useContext(SetMonacoEditorContentContext)
}
