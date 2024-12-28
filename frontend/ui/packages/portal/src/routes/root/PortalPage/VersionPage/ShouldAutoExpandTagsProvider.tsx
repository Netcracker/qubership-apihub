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

export const ShouldAutoExpandTagsProvider: FC<PropsWithChildren> = memo<PropsWithChildren>(({ children }) => {
  const [shouldAutoExpandTags, setShouldAutoExpandTags] = useState<boolean>(true)

  return (
    <ShouldAutoExpandTags.Provider value={shouldAutoExpandTags}>
      <SetShouldAutoExpandTags.Provider value={setShouldAutoExpandTags}>
        {children}
      </SetShouldAutoExpandTags.Provider>
    </ShouldAutoExpandTags.Provider>
  )
})

const ShouldAutoExpandTags = createContext<boolean>()
const SetShouldAutoExpandTags = createContext<Dispatch<SetStateAction<boolean>>>()

export function useShouldAutoExpandTagsContext(): boolean {
  return useContext(ShouldAutoExpandTags)
}

export function useSetShouldAutoExpandTagsContext(): Dispatch<SetStateAction<boolean>> {
  return useContext(SetShouldAutoExpandTags)
}
