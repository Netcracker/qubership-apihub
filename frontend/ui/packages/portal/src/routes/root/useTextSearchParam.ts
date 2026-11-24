import { useCallback } from 'react'
import type { Key } from '@portal/entities/keys'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useHash } from 'react-use'
import { useSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSearchParam'
import { SEARCH_TEXT_PARAM_KEY } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'

export function useTextSearchParam(): [Key | undefined, SetTextSearchParam] {
  const text = useSearchParam<Key>(SEARCH_TEXT_PARAM_KEY)

  const [hashParam] = useHash()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  return [
    text,
    useCallback(text => {
      if (text) {
        searchParams.set(SEARCH_TEXT_PARAM_KEY, text)
      } else {
        searchParams.delete(SEARCH_TEXT_PARAM_KEY)
      }
      navigate({
        search: `${searchParams}`,
        hash: hashParam,
      })
    }, [hashParam, navigate, searchParams]),
  ]
}

type SetTextSearchParam = (value: Key | undefined) => void
