import { useBackwardLocation } from './root/useBackwardLocation'
import { useBackwardLocationContext, useSetBackwardLocationContext } from './BackwardLocationProvider'
import { useCallback } from 'react'

export function useDefaultBreadcrumbClickHandler(): () => void {
  const location = useBackwardLocation()
  const backwardLocation = useBackwardLocationContext()
  const setBackwardLocation = useSetBackwardLocationContext()

  return useCallback((): void => {
    setBackwardLocation({ ...backwardLocation, fromPackageSettings: location })
  }, [backwardLocation, location, setBackwardLocation])
}
