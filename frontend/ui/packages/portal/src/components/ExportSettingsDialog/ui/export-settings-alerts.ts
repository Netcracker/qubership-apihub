import { styled } from '@mui/material'

import {
  SHAREABILITY_STATUS_NON_SHAREABLE,
  SHAREABILITY_STATUS_SHAREABLE,
  SHAREABILITY_STATUS_UNKNOWN,
  type ShareabilityStatus,
} from '@netcracker/qubership-apihub-api-processor'
import { AlertCustom, type AlertCustomProps } from '@netcracker/qubership-apihub-ui-shared/components/AlertCustom'
import { ALERT_SEVERITY, type AlertSeverity } from '@netcracker/qubership-apihub-ui-shared/themes/alert'
import { ExportSettingsFormFieldOptionScope } from '../entities/export-settings-form-field'
import type { ShareabilitySummary } from '../hooks/useShareabilitySummary'

export type ShareabilityFieldAlert = {
  severity: AlertSeverity
  title: string
  message: string
}

const formatDocumentWord = (count: number): 'document' | 'documents' => (count === 1 ? 'document' : 'documents')

const getVerbHaveOrHas = (count: number): string => (count === 1 ? 'has' : 'have')

export const ShareabilityExportVersionAlert = styled(AlertCustom)<AlertCustomProps>(({ theme }) => ({
  marginTop: theme.spacing(-2),
}))

export const ShareabilitySingleDocAlert = styled(AlertCustom)<AlertCustomProps>(({ theme }) => ({
  marginBottom: theme.spacing(2),
}))

export const buildSingleDocumentShareabilityAlert = (
  status?: ShareabilityStatus,
): ShareabilityFieldAlert | null => {
  switch (status) {
    case SHAREABILITY_STATUS_SHAREABLE:
      return {
        severity: ALERT_SEVERITY.SUCCESS,
        title: 'Shareable document',
        message: 'This document is marked as shareable by the package owner.',
      }
    case SHAREABILITY_STATUS_UNKNOWN:
      return {
        severity: ALERT_SEVERITY.WARNING,
        title: 'Unknown shareability',
        message: 'The shareability status of this document is unknown. Contact the package owner to clarify.',
      }
    case SHAREABILITY_STATUS_NON_SHAREABLE:
      return {
        severity: ALERT_SEVERITY.ERROR,
        title: 'Non-shareable document',
        message: 'This document is marked as non-shareable by the package owner.',
      }
    default:
      return null
  }
}

export const buildVersionExportShareabilityAlert = (
  scopeValue: ExportSettingsFormFieldOptionScope | undefined,
  summary: ShareabilitySummary,
): ShareabilityFieldAlert | null => {
  if (summary.total === 0) {
    return null
  }

  const isOnlyShareableScope = !scopeValue || scopeValue === ExportSettingsFormFieldOptionScope.ONLY_SHAREABLE

  if (isOnlyShareableScope) {
    // "Only shareable documents" scope
    if (summary.shareable > 0) {
      return {
        severity: ALERT_SEVERITY.SUCCESS,
        title: 'Shareable documents only',
        message: `${summary.shareable} shareable ${
          formatDocumentWord(summary.shareable)
        } out of ${summary.total} will be exported.`,
      }
    }
    if (summary.unknown > 0) {
      return {
        severity: ALERT_SEVERITY.WARNING,
        title: 'No shareable documents found',
        message:
          'No documents are confirmed as shareable in this version. Some documents have unknown shareability status. Contact the package owner to clarify.',
      }
    }
    return {
      severity: ALERT_SEVERITY.WARNING,
      title: 'No shareable documents found',
      message: 'All documents in this version are marked as non-shareable by the package owner.',
    }
  }

  // "All documents" scope
  if (summary.nonShareable === 0 && summary.unknown === 0) {
    return {
      severity: ALERT_SEVERITY.SUCCESS,
      title: 'All shareable',
      message: `All ${summary.total} documents will be exported. All are marked as shareable by the package owner.`,
    }
  }

  const hasRestrictedDocuments = summary.nonShareable > 0 || (summary.shareable > 0 && summary.unknown > 0)

  if (hasRestrictedDocuments) {
    const parts: string[] = []

    if (summary.nonShareable > 0) {
      parts.push(`${summary.nonShareable} ${formatDocumentWord(summary.nonShareable)} marked as non-shareable`)
    }
    if (summary.unknown > 0) {
      parts.push(`${summary.unknown} ${formatDocumentWord(summary.unknown)} with unknown shareability status`)
    }

    return {
      severity: ALERT_SEVERITY.ERROR,
      title: 'Includes restricted documents',
      message: `All ${summary.total} documents will be exported, including ${parts.join(' and ')}.`,
    }
  }

  return {
    severity: ALERT_SEVERITY.WARNING,
    title: 'Unknown shareability',
    message: `${summary.unknown} ${formatDocumentWord(summary.unknown)} ${
      getVerbHaveOrHas(summary.unknown)
    } unknown shareability status. Contact the package owner to clarify.`,
  }
}
