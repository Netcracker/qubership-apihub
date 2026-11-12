import type { SpecViewMode } from '@netcracker/qubership-apihub-ui-shared/components/SpecViewToggler'
import { DOC_OPERATION_VIEW_MODE } from '@netcracker/qubership-apihub-ui-shared/entities/operation-view-mode'
import { useSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSearchParam'
import { MODE_SEARCH_PARAM } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useHash } from 'react-use'

export function useSpecViewMode(defaultValue: SpecViewMode = DOC_OPERATION_VIEW_MODE): [SpecViewMode, SetOperationViewMode] {
  const specViewMode = useSearchParam<SpecViewMode>(MODE_SEARCH_PARAM) ?? defaultValue
  const [hashParam] = useHash()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  return [
    specViewMode,
    useCallback(value => {
      value && searchParams.set(MODE_SEARCH_PARAM, value)
      navigate({
        search: `${searchParams}`,
        hash: hashParam,
      })
    }, [hashParam, navigate, searchParams]),
  ]
}

type SetOperationViewMode = (value: SpecViewMode | undefined) => void
