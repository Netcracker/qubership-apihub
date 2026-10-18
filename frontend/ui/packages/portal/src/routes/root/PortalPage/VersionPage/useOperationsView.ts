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

import type { Key } from '@apihub/entities/keys'
import { useMemo } from 'react'
import { OPERATIONS_VIEW_MODE_PARAM } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { useSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSearchParam'
import { useSetSearchParams } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSetSearchParams'
import type { OperationsViewMode } from '@netcracker/qubership-apihub-ui-shared/types/views'

export function useOperationsView(defaultValue: OperationsViewMode): [OperationsViewMode, SetOperationsViewMode] {
  const param = useSearchParam<Key>(OPERATIONS_VIEW_MODE_PARAM) ?? defaultValue
  const setSearchParams = useSetSearchParams()

  return useMemo(
    () => [
      param !== defaultValue ? param : defaultValue,
      value => setSearchParams({ [OPERATIONS_VIEW_MODE_PARAM]: value }, { replace: true }),
    ],
    [defaultValue, param, setSearchParams],
  )
}

type SetOperationsViewMode = (mode: OperationsViewMode) => void
