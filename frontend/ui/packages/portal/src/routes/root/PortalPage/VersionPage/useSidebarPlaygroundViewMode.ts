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
import { useHash } from 'react-use'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSearchParam'
import { PLAYGROUND_SIDEBAR_VIEW_MODE_SEARCH_PARAM } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'

export function useSidebarPlaygroundViewMode(): [string | undefined, SetPlaygroundSidebarViewModeParam] {
  const mode = useSearchParam<string>(PLAYGROUND_SIDEBAR_VIEW_MODE_SEARCH_PARAM)
  const [hashParam] = useHash()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  return [
    mode ?? '',
    useCallback(value => {
      if (value === null) {
        searchParams.delete(PLAYGROUND_SIDEBAR_VIEW_MODE_SEARCH_PARAM)
      } else {
        searchParams.set(PLAYGROUND_SIDEBAR_VIEW_MODE_SEARCH_PARAM, value ?? '')
      }
      navigate({
        search: `${searchParams}`,
        hash: hashParam,
      }, { replace: true })
    }, [hashParam, navigate, searchParams]),
  ]
}

type SetPlaygroundSidebarViewModeParam = (value: string | undefined) => void
