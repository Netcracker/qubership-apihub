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

export const BackwardLocationProvider: FC<PropsWithChildren> = memo<PropsWithChildren>(({ children }) => {
  const [content, setContent] = useState({})
  return (
    <BackwardLocation.Provider value={content}>
      <SetBackwardLocation.Provider value={setContent}>
        {children}
      </SetBackwardLocation.Provider>
    </BackwardLocation.Provider>
  )
})

export function useBackwardLocationContext(): BackwardLocationState {
  return useContext(BackwardLocation)
}

export function useSetBackwardLocationContext(): Dispatch<SetStateAction<BackwardLocationState>> {
  return useContext(SetBackwardLocation)
}

export type BackwardLocation = {
  pathname: string
  search?: string
}

type BackwardLocationState = {
  fromDocumentsComparison?: BackwardLocation
  fromOperation?: BackwardLocation
  fromOperationsComparison?: BackwardLocation
  fromPackagesComparison?: BackwardLocation
  fromPackageSettings?: BackwardLocation
  fromPackage?: BackwardLocation
}

const BackwardLocation = createContext<BackwardLocationState>()
const SetBackwardLocation = createContext<Dispatch<SetStateAction<BackwardLocationState>>>()
