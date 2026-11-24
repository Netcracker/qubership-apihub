import { memo, useCallback, type FC } from 'react'
import { usePackageParamsWithRef } from '../../usePackageParamsWithRef'
import { UnsupportedFilePlaceholder } from '@netcracker/qubership-apihub-ui-shared/components/UnsupportedFilePlaceholder'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { ExportedEntityKind } from '@portal/components/ExportSettingsDialog/api/useExport'
import { useEventBus } from '@portal/routes/EventBusProvider'
import { useDocument } from '../useDocument'
import { useVersionWithRevision } from '../../../useVersionWithRevision'

export type UnsupportedViewProps = {
  documentId: Key | undefined
}

export const UnsupportedView: FC<UnsupportedViewProps> = memo<UnsupportedViewProps>(({ documentId }) => {
  const [docPackageKey, docPackageVersionKey] = usePackageParamsWithRef()
  const [document] = useDocument(docPackageKey, docPackageVersionKey, documentId)
  const { fullVersion } = useVersionWithRevision(docPackageVersionKey, docPackageKey)
  const { showExportSettingsDialog } = useEventBus()
  const canExport = !!docPackageKey && !!docPackageVersionKey && !!documentId && !!fullVersion

  const handleExport = useCallback(() => {
    showExportSettingsDialog({
      specType: document.type,
      shareabilityStatus: document.shareabilityStatus,
      exportedEntity: ExportedEntityKind.SINGLE_DOCUMENT,
      packageId: docPackageKey!,
      version: fullVersion,
      documentId: documentId,
    })
  }, [document.type, document.shareabilityStatus, docPackageKey, fullVersion, documentId, showExportSettingsDialog])

  return (
    <UnsupportedFilePlaceholder
      message="Preview is not available"
      onDownload={canExport ? handleExport : undefined}
      buttonLabel="Export"
    />
  )
})
