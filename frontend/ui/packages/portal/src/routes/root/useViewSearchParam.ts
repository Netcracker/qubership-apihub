import { useMemo } from 'react'
import type { Key } from '@portal/entities/keys'
import { useSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSearchParam'
import { useSetSearchParams } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSetSearchParams'

export function useViewSearchParam(): [Key | undefined, SetViewSearchParam] {
  const param = useSearchParam<Key>('view')
  const setSearchParams = useSetSearchParams()

  return useMemo(
    () => [param, value => setSearchParams({ view: value ?? '' }, { replace: true })],
    [param, setSearchParams],
  )
}

type SetViewSearchParam = (value: Key | undefined) => void
