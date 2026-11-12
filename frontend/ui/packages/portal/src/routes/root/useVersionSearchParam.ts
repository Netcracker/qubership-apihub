import { useMemo } from 'react'
import type { Key } from '@portal/entities/keys'
import { useSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSearchParam'
import { VERSION_SEARCH_PARAM } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { useSetSearchParams } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSetSearchParams'

export function useVersionSearchParam(): [Key | undefined, SetVersionSearchParam] {
  const param = useSearchParam<Key>(VERSION_SEARCH_PARAM)
  const setSearchParams = useSetSearchParams()

  return useMemo(
    () => [param, value => setSearchParams({ [VERSION_SEARCH_PARAM]: value ?? '' }, { replace: true })],
    [param, setSearchParams],
  )
}

type SetVersionSearchParam = (value: Key | undefined) => void
