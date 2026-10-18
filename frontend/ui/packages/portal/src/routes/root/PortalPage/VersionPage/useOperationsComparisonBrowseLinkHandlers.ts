import { useBackwardLocationContext, useSetBackwardLocationContext } from '@portal/routes/BackwardLocationProvider'
import { useCallback } from 'react'

import { useBackwardLocation } from '../../useBackwardLocation'

export type OnOperationsComparisonBrowseLinkClick = () => void

export function useOperationsComparisonBrowseLinkHandlers(): OnOperationsComparisonBrowseLinkClick {
  const location = useBackwardLocation()
  const backwardLocation = useBackwardLocationContext()
  const setBackwardLocation = useSetBackwardLocationContext()

  return useCallback((): void => {
    setBackwardLocation({ ...backwardLocation, fromOperationsComparison: location })
  }, [backwardLocation, location, setBackwardLocation])
}
