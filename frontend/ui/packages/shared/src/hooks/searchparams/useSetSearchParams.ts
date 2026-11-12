import { useSearchParams } from 'react-router-dom'
import { useCallback } from 'react'

export function useSetSearchParams(): (
  param: Record<string, string>,
  navigateOptions?: {
    replace?: boolean | undefined
    state?: unknown
  },
) => void {
  const [searchParams, setSearchParams] = useSearchParams()

  return useCallback(
    (param, navigateOptions): void => {
      for (const key in param) {
        param[key]
          // TODO: Check do we need to `encodeURIComponent` for `param[key]`
          ? searchParams.set(key, param[key])
          : searchParams.delete(key)
      }
      setSearchParams(searchParams, navigateOptions)
    },
    [searchParams, setSearchParams],
  )
}

export type SearchParam = {
  value: unknown
  toStringValue?: (value: object | string | number) => string
}
