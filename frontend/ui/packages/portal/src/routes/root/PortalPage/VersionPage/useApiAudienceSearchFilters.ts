import { useMemo } from 'react'
import type { ApiAudience } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import { API_AUDIENCE_ALL } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import { useSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSearchParam'
import { useSetSearchParams } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSetSearchParams'

const AUDIENCE_SEARCH_PARAM = 'audience'

type SetApiAudienceFilter = (value: ApiAudience | undefined) => void

export function useApiAudienceSearchFilter(): [ApiAudience, SetApiAudienceFilter] {
  const param = useSearchParam<ApiAudience>(AUDIENCE_SEARCH_PARAM)
  const setSearchParams = useSetSearchParams()

  return useMemo(() => {
    const audience = param ?? API_AUDIENCE_ALL
    return [audience, value => setSearchParams({ [AUDIENCE_SEARCH_PARAM]: (value === API_AUDIENCE_ALL ? '' : value) ?? '' }, { replace: true })]
  }, [param, setSearchParams])

}
