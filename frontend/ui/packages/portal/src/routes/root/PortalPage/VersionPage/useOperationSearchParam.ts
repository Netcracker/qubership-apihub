import { Key } from "@apihub/entities/keys"
import { useSearchParam } from "@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSearchParam"
import { useSetSearchParams } from "@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSetSearchParams"
import { OPERATION_SEARCH_PARAM } from "@netcracker/qubership-apihub-ui-shared/utils/search-params"
import { useMemo } from "react"

export function useOperationSearchParam(): [Key | undefined, SetOperationKey] {
  const param = useSearchParam<Key>(OPERATION_SEARCH_PARAM)
  const setSearchParams = useSetSearchParams()

  return useMemo(
    () => [param, value => setSearchParams({ [OPERATION_SEARCH_PARAM]: value ?? '' }, { replace: true })],
    [param, setSearchParams],
  )
}

type SetOperationKey = (value: Key | undefined) => void