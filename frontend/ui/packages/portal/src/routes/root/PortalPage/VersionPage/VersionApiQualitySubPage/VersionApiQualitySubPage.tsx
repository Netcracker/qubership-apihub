import type { DocumentValidationSummary } from '@apihub/entities/api-quality/package-version-validation-summary'
import { Box } from '@mui/material'
import { LayoutWithSidebar } from '@netcracker/qubership-apihub-ui-shared/components/PageLayouts/LayoutWithSidebar'
import type { SpecItemUri } from '@netcracker/qubership-apihub-ui-shared/utils/specifications'
import type { FC } from 'react'
import { memo, useCallback, useMemo, useState } from 'react'
import { ClientValidationStatuses, useApiQualityValidationSummary } from '../ApiQualityValidationSummaryProvider'
import { ValidatedDocumentSelector } from './ValidatedDocumentSelector'
import { VersionApiQualityCard } from './VersionApiQualityCard'

export const VersionApiQualitySubPage: FC = memo(() => {
  const validationSummary = useApiQualityValidationSummary()
  const validationSummaryAvailable = validationSummary?.status === ClientValidationStatuses.SUCCESS

  const validatedDocuments = useMemo(() => validationSummary?.documents ?? [], [validationSummary])
  const loadingValidatedDocuments = useMemo(() => validationSummary === undefined, [validationSummary])

  const [selectedDocument, setSelectedDocument] = useState<DocumentValidationSummary | undefined>()
  const [selectedIssuePath, setSelectedIssuePath] = useState<SpecItemUri | undefined>()

  const onSelectDocument = useCallback((value: DocumentValidationSummary | undefined) => {
    setSelectedDocument(value)
    setSelectedIssuePath(undefined)
  }, [])

  return (
    <LayoutWithSidebar
      header={
        <Box display='flex' alignItems='center' gap={2} mt={1}>
          <Box>Quality Validation</Box>
          <ValidatedDocumentSelector
            value={selectedDocument}
            onSelect={onSelectDocument}
            options={validatedDocuments}
            loading={loadingValidatedDocuments}
          />
        </Box>
      }
      body={
        selectedDocument && (
          <VersionApiQualityCard
            selectedDocument={selectedDocument}
            selectedIssuePath={selectedIssuePath}
            setSelectedIssuePath={setSelectedIssuePath}
            validationSummaryAvailable={validationSummaryAvailable}
          />
        )
      }
      disableHorizontalDivider
    />
  )
})
