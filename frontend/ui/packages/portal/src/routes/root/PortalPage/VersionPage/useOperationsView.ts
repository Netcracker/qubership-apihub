import type { Key } from '@portal/entities/keys'
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
