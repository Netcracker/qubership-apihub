import { useMemo } from 'react'

import type { ShareabilityStatus } from '@netcracker/qubership-apihub-api-processor'
import { ExportedEntityKind } from '../api/useExport'
import { ExportSettingsFormFieldOptionScope } from '../entities/export-settings-form-field'
import {
  buildSingleDocumentShareabilityAlert,
  buildVersionExportShareabilityAlert,
  type ShareabilityFieldAlert,
} from '../ui/export-settings-alerts'
import type { ShareabilitySummary } from './useShareabilitySummary'

export type ShareabilityAlerts = {
  versionExportAlert: ShareabilityFieldAlert | null
  singleDocExportAlert: ShareabilityFieldAlert | null
  versionExportDisabled: boolean
}

type UseShareabilityAlertsParams = {
  exportedEntity: ExportedEntityKind
  scopeValue?: ExportSettingsFormFieldOptionScope
  shareabilityStatus: ShareabilityStatus
  shareabilitySummary: ShareabilitySummary
}

export function useShareabilityAlerts({
  exportedEntity,
  scopeValue,
  shareabilityStatus,
  shareabilitySummary,
}: UseShareabilityAlertsParams): ShareabilityAlerts {
  const isVersionExport = exportedEntity === ExportedEntityKind.VERSION
  const isSingleDocExport = exportedEntity === ExportedEntityKind.SINGLE_DOCUMENT
  const isOnlyShareableScope = isVersionExport &&
    (!scopeValue || scopeValue === ExportSettingsFormFieldOptionScope.ONLY_SHAREABLE)

  return useMemo(
    () => ({
      versionExportAlert: isVersionExport ? buildVersionExportShareabilityAlert(scopeValue, shareabilitySummary) : null,
      singleDocExportAlert: isSingleDocExport ? buildSingleDocumentShareabilityAlert(shareabilityStatus) : null,
      versionExportDisabled: isOnlyShareableScope && shareabilitySummary.shareable === 0,
    }),
    [isOnlyShareableScope, isSingleDocExport, scopeValue, shareabilityStatus, shareabilitySummary, isVersionExport],
  )
}
