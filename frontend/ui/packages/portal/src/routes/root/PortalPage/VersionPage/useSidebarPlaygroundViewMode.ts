import { useCallback } from 'react'
import { useHash } from 'react-use'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSearchParam'
import { PLAYGROUND_SIDEBAR_VIEW_MODE_SEARCH_PARAM } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'

export function useSidebarPlaygroundViewMode(): [string | undefined, SetPlaygroundSidebarViewModeParam] {
  const mode = useSearchParam<string>(PLAYGROUND_SIDEBAR_VIEW_MODE_SEARCH_PARAM)
  const [hashParam] = useHash()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  return [
    mode ?? '',
    useCallback(value => {
      if (value === null) {
        searchParams.delete(PLAYGROUND_SIDEBAR_VIEW_MODE_SEARCH_PARAM)
      } else {
        searchParams.set(PLAYGROUND_SIDEBAR_VIEW_MODE_SEARCH_PARAM, value ?? '')
      }
      navigate({
        search: `${searchParams}`,
        hash: hashParam,
      }, { replace: true })
    }, [hashParam, navigate, searchParams]),
  ]
}

type SetPlaygroundSidebarViewModeParam = (value: string | undefined) => void
