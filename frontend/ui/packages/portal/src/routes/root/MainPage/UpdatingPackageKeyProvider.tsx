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
import { createContext, useContext, useState } from 'react'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'

const UpdatingPackageKeyContext = createContext<Key>()
const SetUpdatingPackageKeyContext = createContext<Dispatch<SetStateAction<Key>>>()

export function useUpdatingPackageKey(): Key {
  return useContext(UpdatingPackageKeyContext)
}

export function useSetUpdatingPackageKey(): Dispatch<SetStateAction<Key>> {
  return useContext(SetUpdatingPackageKeyContext)
}

export function useUpdatingPackageKeyWritableContext(): [Key, Dispatch<SetStateAction<Key>>] {
  return [useUpdatingPackageKey(), useSetUpdatingPackageKey()]
}

export const UpdatingPackageKeyProvider: FC<PropsWithChildren> = ({ children }) => {
  const [updatingPackageKey, setUpdatingPackageKey] = useState<Key>('')

  return (
    <UpdatingPackageKeyContext.Provider value={updatingPackageKey}>
      <SetUpdatingPackageKeyContext.Provider value={setUpdatingPackageKey}>
        {children}
      </SetUpdatingPackageKeyContext.Provider>
    </UpdatingPackageKeyContext.Provider>
  )
}
