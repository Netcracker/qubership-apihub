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

const ChangesLoadingStatusContext = createContext<boolean>(false)
const SetChangesLoadingStatusContext = createContext<Dispatch<SetStateAction<boolean>>>()

export function useChangesLoadingStatus(): boolean {
  return useContext(ChangesLoadingStatusContext)
}

export function useSetChangesLoadingStatus(): Dispatch<SetStateAction<boolean>> {
  return useContext(SetChangesLoadingStatusContext)
}

export const ChangesLoadingStatusProvider: FC<PropsWithChildren> = ({ children }) => {
  const [isLoading, setIsLoading] = useState<boolean>(true)

  return (
    <ChangesLoadingStatusContext.Provider value={isLoading}>
      <SetChangesLoadingStatusContext.Provider value={setIsLoading}>
        {children}
      </SetChangesLoadingStatusContext.Provider>
    </ChangesLoadingStatusContext.Provider>
  )

}
