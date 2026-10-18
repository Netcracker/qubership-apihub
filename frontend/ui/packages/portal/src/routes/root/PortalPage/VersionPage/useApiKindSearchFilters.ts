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
import type { ApiKind } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import { ALL_API_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import { useSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSearchParam'
import { useSetSearchParams } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSetSearchParams'

export function useApiKindSearchFilter(): [ApiKind, SetApiKingFilter] {
  const param = useSearchParam<ApiKind>(KIND_SEARCH_PARAM)
  const setSearchParams = useSetSearchParams()

  return useMemo(() => {
    const kind = param ?? ALL_API_KIND
    return [kind, value => setSearchParams({ [KIND_SEARCH_PARAM]: (value === ALL_API_KIND ? '' : value) ?? '' }, { replace: true })]
  }, [param, setSearchParams])

}

const KIND_SEARCH_PARAM = 'kind'

type SetApiKingFilter = (value: ApiKind | undefined) => void
