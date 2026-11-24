import { useMemo } from 'react'
import { useSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSearchParam'
import { useSetSearchParams } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSetSearchParams'

export function useTagSearchFilter(): [Tag, SetTagFilter] {
  const param = useSearchParam<Tag>(TAG_SEARCH_PARAM)
  const setSearchParams = useSetSearchParams()

  return useMemo(() => {
    const tag = param ?? ''
    return [
      tag,
      value => setSearchParams({ [TAG_SEARCH_PARAM]: value ?? '' }, { replace: true }),
    ]
  }, [param, setSearchParams])

}

const TAG_SEARCH_PARAM = 'tag'

type Tag = string
type SetTagFilter = (value: Tag | undefined) => void
