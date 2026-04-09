import { useMemo } from 'react'

import type { Documents } from '@apihub/entities/documents'
import {
  SHAREABILITY_STATUS_NON_SHAREABLE,
  SHAREABILITY_STATUS_SHAREABLE,
  SHAREABILITY_STATUS_UNKNOWN,
  type ShareabilityStatus,
} from '@netcracker/qubership-apihub-api-processor'

export type ShareabilitySummary = {
  shareable: number
  nonShareable: number
  unknown: number
  total: number
}

const STATUS_KEY_MAP: Record<ShareabilityStatus, keyof Omit<ShareabilitySummary, 'total'>> = {
  [SHAREABILITY_STATUS_SHAREABLE]: 'shareable',
  [SHAREABILITY_STATUS_NON_SHAREABLE]: 'nonShareable',
  [SHAREABILITY_STATUS_UNKNOWN]: 'unknown',
}

export function useShareabilitySummary(documents: Documents): ShareabilitySummary {
  return useMemo(
    () =>
      documents.reduce<ShareabilitySummary>(
        (acc, doc) => {
          const key = STATUS_KEY_MAP[doc.shareabilityStatus]
          return { ...acc, [key]: acc[key] + 1, total: acc.total + 1 }
        },
        { shareable: 0, nonShareable: 0, unknown: 0, total: 0 },
      ),
    [documents],
  )
}
