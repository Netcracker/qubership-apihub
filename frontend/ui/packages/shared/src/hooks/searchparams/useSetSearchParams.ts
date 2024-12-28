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

import { useSearchParams } from 'react-router-dom'
import { useCallback } from 'react'

export function useSetSearchParams(): (
  param: Record<string, string>,
  navigateOptions?: {
    replace?: boolean | undefined
    state?: unknown
  },
) => void {
  const [searchParams, setSearchParams] = useSearchParams()

  return useCallback(
    (param, navigateOptions): void => {
      for (const key in param) {
        param[key]
          // TODO: Check do we need to `encodeURIComponent` for `param[key]`
          ? searchParams.set(key, param[key])
          : searchParams.delete(key)
      }
      setSearchParams(searchParams, navigateOptions)
    },
    [searchParams, setSearchParams],
  )
}

export type SearchParam = {
  value: unknown
  toStringValue?: (value: object | string | number) => string
}
