import { type FC, useCallback, useEffect, useMemo, useState } from 'react'

import type { Documents } from '@apihub/entities/documents'
import type { ExportSettingsPopupDetail } from '@apihub/routes/EventBusProvider'
import { useShowErrorNotification } from '@apihub/routes/root/BasePage/Notification'
import { SHAREABILITY_STATUS_UNKNOWN } from '@netcracker/qubership-apihub-api-processor'
import type { PopupProps } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'
import { isExportableSpecType, isOpenApiSpecType } from '@netcracker/qubership-apihub-ui-shared/utils/specs'
import { useExportConfig } from '../../../routes/root/PortalPage/useExportConfig'
import { useDocuments } from '../../../routes/root/PortalPage/VersionPage/useDocuments'
import { useDownloadPublishedDocument } from '../../../routes/root/PortalPage/VersionPage/useDownloadPublishedDocument'
import { ExportedEntityKind, type IRequestDataExport, useExport, useRemoveExportResult } from '../api/useExport'
import { useExportStatus } from '../api/useExportStatus'
import { useShareabilitySummary } from '../hooks/useShareabilitySummary'
import { ExportSettingsForm } from './ExportSettingsForm'

const EMPTY_DOCUMENTS: Documents = []

export const ExportSettingsPopup: FC<PopupProps> = ({ open, setOpen, detail }) => {
  const {
    exportedEntity,
    packageId,
    version,
    documentId,
    groupName,
    shareabilityStatus,
    specType,
  } = detail as ExportSettingsPopupDetail

  const showErrorNotification = useShowErrorNotification()

  const [exportConfig, isExportConfigLoading] = useExportConfig(packageId)

  // Fetch documents for version export
  const isVersionExport = exportedEntity === ExportedEntityKind.VERSION
  const { documents, isLoading: isLoadingDocuments } = useDocuments({
    packageKey: packageId,
    versionKey: version,
    enabled: isVersionExport,
  })

  const shareabilitySummary = useShareabilitySummary(isVersionExport ? documents : EMPTY_DOCUMENTS)

  const hasRestApi = useMemo(
    () => isVersionExport && documents.some(doc => isOpenApiSpecType(doc.type)),
    [isVersionExport, documents],
  )

  // Version with exactly 1 document -> single-doc export behavior
  const resolvedExportParams = useMemo(() => {
    if (isVersionExport && !isLoadingDocuments && documents.length === 1) {
      const [doc] = documents
      return {
        exportedEntity: ExportedEntityKind.SINGLE_DOCUMENT as const,
        documentId: doc.slug,
        specType: doc.type,
        shareabilityStatus: doc.shareabilityStatus,
      }
    }
    return {
      exportedEntity: exportedEntity,
      documentId: documentId,
      specType: specType,
      // For version-export payloads, shareability is absent, so default to UNKNOWN.
      shareabilityStatus: shareabilityStatus ?? SHAREABILITY_STATUS_UNKNOWN,
    }
  }, [isVersionExport, isLoadingDocuments, documents, exportedEntity, documentId, specType, shareabilityStatus])

  const isDownloadOnly = resolvedExportParams.exportedEntity === ExportedEntityKind.SINGLE_DOCUMENT &&
    !!resolvedExportParams.documentId &&
    !isExportableSpecType(resolvedExportParams.specType)

  const [downloadPublishedDocument, isDownloadingDocument] = useDownloadPublishedDocument({
    packageKey: packageId,
    versionKey: version,
    slug: resolvedExportParams.documentId ?? '',
  })

  const [requestDataExport, setRequestDataExport] = useState<IRequestDataExport | undefined>(undefined)
  const [exportTask, isStartingExport, exportStartingError] = useExport(requestDataExport)
  const removeExportResult = useRemoveExportResult(
    requestDataExport?.exportedEntity,
    requestDataExport?.packageId,
    requestDataExport?.version,
  )

  const isLoadingExportConfig = isExportConfigLoading || (isVersionExport && isLoadingDocuments)

  const isStartingAnyExport = isStartingExport || (isDownloadingDocument && isDownloadOnly)

  const [exporting, setExporting] = useState(false)
  const [needToGetExportStatus, setNeedToGetExportStatus] = useState(false)

  useEffect(() => {
    if (exportTask) {
      setExporting(true)
      setNeedToGetExportStatus(true)
    }
  }, [exportTask])

  useEffect(() => {
    if (exportStartingError) {
      showErrorNotification({
        title: 'Starting export failed',
        message: exportStartingError.message,
      })
    }
  }, [exportStartingError, showErrorNotification])

  const completeExport = useCallback(() => {
    removeExportResult()
    setExporting(false)
    setOpen(false)
    setNeedToGetExportStatus(false)
  }, [removeExportResult, setOpen])

  const handleClose = useCallback(() => setOpen(false), [setOpen])

  const handleDownloadPublishedDocument = useCallback(() => {
    if (resolvedExportParams.documentId) {
      downloadPublishedDocument()
      setOpen(false)
    }
  }, [resolvedExportParams.documentId, downloadPublishedDocument, setOpen])

  useExportStatus(exportTask?.exportId, needToGetExportStatus, completeExport, completeExport)

  return (
    <ExportSettingsForm
      open={open}
      onClose={handleClose}
      exportConfig={exportConfig}
      exportedEntity={resolvedExportParams.exportedEntity}
      packageId={packageId}
      version={version}
      documentId={resolvedExportParams.documentId}
      groupName={groupName}
      exporting={exporting}
      isLoadingExportConfig={isLoadingExportConfig}
      isStartingExport={isStartingAnyExport}
      setRequestDataExport={setRequestDataExport}
      hasRestApi={hasRestApi}
      specType={resolvedExportParams.specType}
      shareabilityStatus={resolvedExportParams.shareabilityStatus}
      shareabilitySummary={shareabilitySummary}
      onDownloadPublishedDocument={isDownloadOnly ? handleDownloadPublishedDocument : undefined}
    />
  )
}
