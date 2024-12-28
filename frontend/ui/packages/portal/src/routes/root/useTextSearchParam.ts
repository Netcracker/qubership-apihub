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

import { useCallback } from 'react'
import type { Key } from '@apihub/entities/keys'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useHash } from 'react-use'
import { useSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSearchParam'
import { SEARCH_TEXT_PARAM_KEY } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'

export function useTextSearchParam(): [Key | undefined, SetTextSearchParam] {
  const text = useSearchParam<Key>(SEARCH_TEXT_PARAM_KEY)

  const [hashParam] = useHash()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  return [
    text,
    useCallback(text => {
      if (text) {
        searchParams.set(SEARCH_TEXT_PARAM_KEY, text)
      } else {
        searchParams.delete(SEARCH_TEXT_PARAM_KEY)
      }
      navigate({
        search: `${searchParams}`,
        hash: hashParam,
      })
    }, [hashParam, navigate, searchParams]),
  ]
}

type SetTextSearchParam = (value: Key | undefined) => void
