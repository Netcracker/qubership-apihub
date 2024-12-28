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
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'

export const BwcVersionKeyProvider: FC<PropsWithChildren> = memo<PropsWithChildren>(({ children }) => {
  const [versionKey, setVersionKey] = useState<Key | undefined>(undefined)

  return (
    <BwcVersionKeyContext.Provider value={versionKey}>
      <SetBwcVersionKeyContext.Provider value={setVersionKey}>
        {children}
      </SetBwcVersionKeyContext.Provider>
    </BwcVersionKeyContext.Provider>
  )
})

const BwcVersionKeyContext = createContext<Key | undefined>()
const SetBwcVersionKeyContext = createContext<Dispatch<SetStateAction<Key | undefined>>>()

export function useBwcVersionKey(): Key | undefined {
  return useContext(BwcVersionKeyContext)
}

export function useSetBwcVersionKey(): Dispatch<SetStateAction<Key | undefined>> {
  return useContext(SetBwcVersionKeyContext)
}
