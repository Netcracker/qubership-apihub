import { useLocation } from 'react-use'
import { useMemo } from 'react'

export function useBackwardLocation(): { pathname: string; search: string } {
  const location = useLocation()
  return useMemo(
    () => ({
      pathname: location.pathname!,
      search: location.search!,
    }),
    [location.pathname, location.search],
  )
}
