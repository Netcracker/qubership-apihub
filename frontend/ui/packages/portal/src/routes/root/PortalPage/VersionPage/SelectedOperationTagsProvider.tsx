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

export const SelectedOperationTagsProvider: FC<PropsWithChildren> = memo<PropsWithChildren>(({ children }) => {
  const [selectedTags, setSelectedTags] = useState<readonly string[]>([])

  return (
    <SelectedOperationTagsContext.Provider value={selectedTags}>
      <SetSelectedOperationTagsContext.Provider value={setSelectedTags}>
        {children}
      </SetSelectedOperationTagsContext.Provider>
    </SelectedOperationTagsContext.Provider>
  )
})

const SelectedOperationTagsContext = createContext<readonly string[]>()
const SetSelectedOperationTagsContext = createContext<Dispatch<SetStateAction<readonly string[]>>>()

export function useSelectedOperationTags(): readonly string[] {
  return useContext(SelectedOperationTagsContext)
}

export function useSetSelectedOperationTags(): Dispatch<SetStateAction<readonly string[]>> {
  return useContext(SetSelectedOperationTagsContext)
}
