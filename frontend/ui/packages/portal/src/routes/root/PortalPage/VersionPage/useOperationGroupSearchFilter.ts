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

import { useMemo } from 'react'
import { useSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSearchParam'
import { useSetSearchParams } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSetSearchParams'
import { ALL_OPERATION_GROUPS } from '@netcracker/qubership-apihub-ui-shared/entities/operation-groups'

export function useOperationGroupSearchFilter(): [OperationGroupName, SetOperationGroupName] {
  const param = useSearchParam<OperationGroupName>(OPERATION_GROUP_SEARCH_PARAM)
  const setSearchParams = useSetSearchParams()

  return useMemo(() => {
    const group = param ?? ALL_OPERATION_GROUPS
    return [
      group,
      value => setSearchParams(
        { [OPERATION_GROUP_SEARCH_PARAM]: (value === ALL_OPERATION_GROUPS ? '' : value) ?? '' },
        { replace: true },
      ),
    ]
  }, [param, setSearchParams])

}

const OPERATION_GROUP_SEARCH_PARAM = 'group'

type OperationGroupName = string

type SetOperationGroupName = (value: OperationGroupName | undefined) => void
