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
import type { CompareResult } from '@netcracker/qubership-apihub-api-diff'

const ApiDiffResultContext = createContext<CompareResult | undefined>()
const SetApiDiffResultContext = createContext<Dispatch<SetStateAction<CompareResult | undefined>>>()

export function useApiDiffResult(): CompareResult | undefined {
  return useContext(ApiDiffResultContext)
}

export function useSetApiDiffResult(): Dispatch<SetStateAction<CompareResult | undefined>> {
  return useContext(SetApiDiffResultContext)
}

const IsApiDiffResultLoadingContext = createContext<boolean>()
const SetIsApiDiffResultLoadingContext = createContext<Dispatch<SetStateAction<boolean>>>()

export function useIsApiDiffResultLoading(): boolean {
  return useContext(IsApiDiffResultLoadingContext)
}

export function useSetIsApiDiffResultLoading(): Dispatch<SetStateAction<boolean>> {
  return useContext(SetIsApiDiffResultLoadingContext)
}

export const ApiDiffResultProvider: FC<PropsWithChildren> = ({ children }) => {
  const [apiDiffResult, setApiDiffResult] = useState<CompareResult>()
  const [isApiDiffResultLoading, setIsApiDiffResultLoading] = useState<boolean>(false)

  return (
    <ApiDiffResultContext.Provider value={apiDiffResult}>
      <SetApiDiffResultContext.Provider value={setApiDiffResult}>
        <IsApiDiffResultLoadingContext.Provider value={isApiDiffResultLoading}>
          <SetIsApiDiffResultLoadingContext.Provider value={setIsApiDiffResultLoading}>
            {children}
          </SetIsApiDiffResultLoadingContext.Provider>
        </IsApiDiffResultLoadingContext.Provider>
      </SetApiDiffResultContext.Provider>
    </ApiDiffResultContext.Provider>
  )
}
