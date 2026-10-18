import { useBackwardLocationContext, useSetBackwardLocationContext } from '@apihub/routes/BackwardLocationProvider'
import { useCallback } from 'react'

import { useBackwardLocation } from '../../useBackwardLocation'

export type OnContractBrowseLinkClick = () => void

export function useContractBrowseLinkHandlers(): OnContractBrowseLinkClick {
  const location = useBackwardLocation()
  const backwardLocation = useBackwardLocationContext()
  const setBackwardLocation = useSetBackwardLocationContext()

  return useCallback((): void => {
    setBackwardLocation({ ...backwardLocation, fromOperation: location })
  }, [backwardLocation, location, setBackwardLocation])
}
