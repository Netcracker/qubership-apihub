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

import { useHash } from 'react-use'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useCallback } from 'react'
import type { OperationViewMode } from '@netcracker/qubership-apihub-ui-shared/entities/operation-view-mode'
import { DOC_OPERATION_VIEW_MODE } from '@netcracker/qubership-apihub-ui-shared/entities/operation-view-mode'
import { useSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSearchParam'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { MODE_SEARCH_PARAM } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import type { SpecViewMode } from '@netcracker/qubership-apihub-ui-shared/components/SpecViewToggler'

export function useSpecViewMode(defaultValue: Key = DOC_OPERATION_VIEW_MODE): [OperationViewMode, SetOperationViewMode] {
  const specViewMode = useSearchParam<Key>(MODE_SEARCH_PARAM) ?? defaultValue
  const [hashParam] = useHash()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  return [
    specViewMode as OperationViewMode,
    useCallback(value => {
      value && searchParams.set(MODE_SEARCH_PARAM, value)
      navigate({
        search: `${searchParams}`,
        hash: hashParam,
      })
    }, [hashParam, navigate, searchParams]),
  ]
}

type SetOperationViewMode = (value: SpecViewMode | undefined) => void
