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

// TODO: Seems redundant. Think about reorganization
export const ConflictedBlobKeyProvider: FC<PropsWithChildren> = memo<PropsWithChildren>(({ children }) => {
  const [conflictedBlobKey, setConflictedBlobKey] = useState<Key | null>(null)

  return (
    <ConflictedBlobKeyContext.Provider value={conflictedBlobKey}>
      <SetConflictedBlobKeyContext.Provider value={setConflictedBlobKey}>
        {children}
      </SetConflictedBlobKeyContext.Provider>
    </ConflictedBlobKeyContext.Provider>
  )
})

const ConflictedBlobKeyContext = createContext<Key | null>()
const SetConflictedBlobKeyContext = createContext<Dispatch<SetStateAction<Key | null>>>()

export function useSelectedConflictedBlobKey(): Key | null {
  return useContext(ConflictedBlobKeyContext)
}

export function useSetSelectedConflictedBlobKey(): Dispatch<SetStateAction<Key | null>> {
  return useContext(SetConflictedBlobKeyContext)
}
