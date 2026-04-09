/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { memo, useCallback, type FC } from 'react'
import { usePackageParamsWithRef } from '../../usePackageParamsWithRef'
import { UnsupportedFilePlaceholder } from '@netcracker/qubership-apihub-ui-shared/components/UnsupportedFilePlaceholder'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { ExportedEntityKind } from '@apihub/components/ExportSettingsDialog/api/useExport'
import { useEventBus } from '@apihub/routes/EventBusProvider'
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
