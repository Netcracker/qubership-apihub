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
import type { CustomServersPackageMap } from './useCustomServersPackageMap'
import { getCustomServersPackageMapFromLocalStorage } from './useCustomServersPackageMap'

export const CustomServersProvider: FC<PropsWithChildren> = memo<PropsWithChildren>(({ children }) => {
  const [customServers, setCustomServers] = useState<CustomServersPackageMap | null>(getCustomServersPackageMapFromLocalStorage)

  return (
    <CustomServersContext.Provider value={customServers}>
      <SetCustomServersContext.Provider value={setCustomServers}>
        {children}
      </SetCustomServersContext.Provider>
    </CustomServersContext.Provider>
  )
})

const CustomServersContext = createContext<CustomServersPackageMap | null>(null)
const SetCustomServersContext = createContext<Dispatch<SetStateAction<CustomServersPackageMap | null>>>()

export function useCustomServersContext(): CustomServersPackageMap | null {
  return useContext(CustomServersContext)
}

export function useSetCustomServersContext(): Dispatch<SetStateAction<CustomServersPackageMap | null>> {
  return useContext(SetCustomServersContext)
}
