import { useMemo } from 'react'
import { useSearchParam } from '../../searchparams/useSearchParam'
import { useSetSearchParams } from '../../searchparams/useSetSearchParams'
import { PACKAGE_SEARCH_PARAM } from '../../../utils/search-params'
import type { Key } from '../../../utils/types'

export function usePackageSearchParam(): [Key | undefined, SetPackageSearchParam] {
  const param = useSearchParam<Key>(PACKAGE_SEARCH_PARAM)
  const setSearchParams = useSetSearchParams()

  return useMemo(
    () => [param, value => setSearchParams({ [PACKAGE_SEARCH_PARAM]: value ?? '' }, { replace: true })],
    [param, setSearchParams],
  )
}

type SetPackageSearchParam = (value: Key | undefined) => void
