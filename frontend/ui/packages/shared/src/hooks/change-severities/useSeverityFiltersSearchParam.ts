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
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useHash } from 'react-use'
import type { ChangeSeverity } from '../../entities/change-severities'
import { useSearchParam } from '../searchparams/useSearchParam'
import { FILTERS_SEARCH_PARAM } from '../../utils/search-params'

export function useSeverityFiltersSearchParam(): [ChangeSeverity[], SetChangeSeverity] {
  const filters = useSearchParam(FILTERS_SEARCH_PARAM)
  const changeSeverityFilters = (filters?.split(',') ?? []) as ChangeSeverity[]

  const [searchParams] = useSearchParams()
  const [hashParam] = useHash()
  const navigate = useNavigate()

  return [
    changeSeverityFilters,
    useCallback(filters => {
      if (filters) {
        searchParams.set(FILTERS_SEARCH_PARAM, filters)
      } else {
        searchParams.delete(FILTERS_SEARCH_PARAM)
      }
      navigate({
        search: `${searchParams}`,
        hash: hashParam,
      })
    }, [hashParam, navigate, searchParams]),
  ]
}

type SetChangeSeverity = (value: string) => void
