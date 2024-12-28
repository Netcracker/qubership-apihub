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
import type { Key } from '../../../entities/keys'

export const PreviousReleaseOptionsProvider: FC<PropsWithChildren> = memo<PropsWithChildren>(({ children }) => {
  const [previousReleaseVersion, setPreviousReleaseVersion] = useState<Key | undefined>()
  const [previousReleasePackageKey, setPreviousReleasePackageKey] = useState<Key | undefined>()

  return (
    <PreviousReleaseVersionContext.Provider value={previousReleaseVersion}>
      <SetPreviousReleaseVersionContext.Provider value={setPreviousReleaseVersion}>
        <PreviousReleasePackageKeyContext.Provider value={previousReleasePackageKey}>
          <SetPreviousReleasePackageKeyContext.Provider value={setPreviousReleasePackageKey}>
            {children}
          </SetPreviousReleasePackageKeyContext.Provider>
        </PreviousReleasePackageKeyContext.Provider>
      </SetPreviousReleaseVersionContext.Provider>
    </PreviousReleaseVersionContext.Provider>
  )
})

const PreviousReleaseVersionContext = createContext<Key | undefined>()
const SetPreviousReleaseVersionContext = createContext<Dispatch<SetStateAction<Key | undefined>>>()

export function usePreviousReleaseVersion(): Key | undefined {
  return useContext(PreviousReleaseVersionContext)
}

export function useSetPreviousReleaseVersion(): Dispatch<SetStateAction<Key | undefined>> {
  return useContext(SetPreviousReleaseVersionContext)
}

const PreviousReleasePackageKeyContext = createContext<Key | undefined>()
const SetPreviousReleasePackageKeyContext = createContext<Dispatch<SetStateAction<Key | undefined>>>()

export function usePreviousReleasePackageKey(): Key | undefined {
  return useContext(PreviousReleasePackageKeyContext)
}

export function useSetPreviousReleasePackageKey(): Dispatch<SetStateAction<Key | undefined>> {
  return useContext(SetPreviousReleasePackageKeyContext)
}
