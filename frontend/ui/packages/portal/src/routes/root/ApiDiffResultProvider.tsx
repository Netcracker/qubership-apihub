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

import type { CompareResult } from '@netcracker/qubership-apihub-api-diff'
import type { Dispatch, FC, PropsWithChildren, SetStateAction } from 'react'
import { createContext, useContext, useState } from 'react'

export type ApiDiffResult = Omit<CompareResult, 'ownerDiffEntry'>

const ApiDiffResultContext = createContext<ApiDiffResult | undefined>()
const SetApiDiffResultContext = createContext<Dispatch<SetStateAction<ApiDiffResult | undefined>>>()

export function useApiDiffResult(): ApiDiffResult | undefined {
  return useContext(ApiDiffResultContext)
}

export function useSetApiDiffResult(): Dispatch<SetStateAction<ApiDiffResult | undefined>> {
  return useContext(SetApiDiffResultContext)
}

/*
This is because by default it was "false" and occured "race condition" when changelog and operations
were loaded successfully (their loading state === false), but loading/calculating of diff result
hadn't started yat to that moment and its loading state was === false as well.
It lead to "blinking" of doc view instead of loading indicator for a moment and changing it to loading indicator again.

So the simplest way to solve the issue is to set context by default to "true".
And when diff result is ready context will be changed to "false" by algorithm.
*/
const IsApiDiffResultLoadingContext = createContext<boolean>(true)
const SetIsApiDiffResultLoadingContext = createContext<Dispatch<SetStateAction<boolean>>>()

export function useIsApiDiffResultLoading(): boolean {
  return useContext(IsApiDiffResultLoadingContext)
}

export function useSetIsApiDiffResultLoading(): Dispatch<SetStateAction<boolean>> {
  return useContext(SetIsApiDiffResultLoadingContext)
}

export const ApiDiffResultProvider: FC<PropsWithChildren> = ({ children }) => {
  const [apiDiffResult, setApiDiffResult] = useState<ApiDiffResult>()
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
