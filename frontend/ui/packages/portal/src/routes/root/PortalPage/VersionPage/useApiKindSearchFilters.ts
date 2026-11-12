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
