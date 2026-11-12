import { useMemo } from 'react'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { useSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSearchParam'
import { API_TYPE_SEARCH_PARAM } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { useSetSearchParams } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSetSearchParams'
import { DEFAULT_API_TYPE } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import {
  parseCompareApiTypeSearchParam,
  type CompareApiTypeSearchParam,
} from './VersionComparePage/compareApiTypeFilter'

export function useApiTypeSearchParam(): {
  apiType: CompareApiTypeSearchParam
  setApiTypeSearchParam: SetApiTypeSearchParam
} {
  const apiType = parseCompareApiTypeSearchParam(useSearchParam(API_TYPE_SEARCH_PARAM), DEFAULT_API_TYPE)
  const setSearchParams = useSetSearchParams()

  return useMemo(
    () => ({
      apiType: apiType,
      setApiTypeSearchParam: value => setSearchParams({ [API_TYPE_SEARCH_PARAM]: value ?? '' }, { replace: true }),
    }),
    [apiType, setSearchParams],
  )
}

type SetApiTypeSearchParam = (value: Key | undefined) => void
