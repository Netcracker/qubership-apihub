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
import type { DeprecatedQueryStatus } from '@netcracker/qubership-apihub-ui-shared/entities/operations'

export function useStatusSearchFilter(): [DeprecatedQueryStatus, SetStatusFilter] {
  const searchParam = useSearchParam<DeprecatedStatus>('status')
  const setSearchParams = useSetSearchParams()

  return useMemo(() => {
    const status = QUERY_PARAM_TO_STATUS[searchParam ?? ALL_DEPRECATED_STATUS_FILTER]
    return [status, value => setSearchParams({ status: STATUS_TO_QUERY_PARAM[value ?? ALL_DEPRECATED_STATUS_FILTER] }, { replace: true })]
  }, [searchParam, setSearchParams])

}

type SetStatusFilter = (value: DeprecatedQueryStatus | undefined) => void

export const DEPRECATED_STATUS_FILTER = 'deprecated'
export const NON_DEPRECATED_STATUS_FILTER = 'non-deprecated'
export const ALL_DEPRECATED_STATUS_FILTER = 'all'

export type DeprecatedStatus =
  typeof DEPRECATED_STATUS_FILTER
  | typeof NON_DEPRECATED_STATUS_FILTER
  | typeof ALL_DEPRECATED_STATUS_FILTER

export const QUERY_PARAM_TO_STATUS: Record<DeprecatedStatus, DeprecatedQueryStatus> = {
  [DEPRECATED_STATUS_FILTER]: 'true',
  [NON_DEPRECATED_STATUS_FILTER]: 'false',
  [ALL_DEPRECATED_STATUS_FILTER]: 'all',
}

const STATUS_TO_QUERY_PARAM: Record<DeprecatedQueryStatus, DeprecatedStatus | ''> = {
  'true': DEPRECATED_STATUS_FILTER,
  'false': NON_DEPRECATED_STATUS_FILTER,
  'all': '',
}
