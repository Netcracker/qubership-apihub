import { useCallback, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useHash } from 'react-use'
import type { ChangeSeverity } from '../../entities/change-severities'
import { useSearchParam } from '../searchparams/useSearchParam'
import { FILTERS_SEARCH_PARAM } from '../../utils/search-params'

export function useSeverityFiltersSearchParam(): [ChangeSeverity[], SetChangeSeverity] {
  const filters = useSearchParam(FILTERS_SEARCH_PARAM)
  const changeSeverityFilters = useMemo(
    () => (filters?.split(',') ?? []) as ChangeSeverity[],
    [filters],
  )

  const [searchParams] = useSearchParams()
  const [hashParam] = useHash()
  const navigate = useNavigate()

  return [
    changeSeverityFilters,
    useCallback(filters => {
      if (filters) {
        searchParams.set(FILTERS_SEARCH_PARAM, filters)
      } else {
        searchParams.delete(FILTERS_SEARCH_PARAM)
      }
      navigate({
        search: `${searchParams}`,
        hash: hashParam,
      })
    }, [hashParam, navigate, searchParams]),
  ]
}

type SetChangeSeverity = (value: string) => void
