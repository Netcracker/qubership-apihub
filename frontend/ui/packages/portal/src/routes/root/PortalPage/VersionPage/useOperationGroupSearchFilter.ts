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
