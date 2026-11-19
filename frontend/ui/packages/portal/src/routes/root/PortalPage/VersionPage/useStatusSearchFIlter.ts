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
