import type { RefetchValidationSummary } from '@apihub/api-hooks/ApiQuality/useValidationSummaryByPackageVersion'
import type { Dispatch, SetStateAction } from 'react'
import { useEffect, useState } from 'react'
import type { ClientValidationStatus } from './ApiQualityValidationSummaryProvider'
import { ClientValidationStatuses } from './ApiQualityValidationSummaryProvider'

const POLLING_INTERVAL: number = 10 // Seconds

export function usePollingForValidationSummaryReadiness(
  status: ClientValidationStatus,
  setStatus: Dispatch<SetStateAction<ClientValidationStatus>>,
  refetch: RefetchValidationSummary | undefined,
): void {
  const [count, setCount] = useState(5)
  useEffect(() => {
    if (!refetch) {
      return
    }
    if (count === 0) {
      setStatus?.(ClientValidationStatuses.NOT_VALIDATED)
      return
    }
    if (status === ClientValidationStatuses.IN_PROGRESS) {
      setTimeout(() => {
        refetch()
        setCount(prev => prev - 1)
      }, POLLING_INTERVAL * 1000)
    }
  }, [status, refetch, count, setStatus])
}
