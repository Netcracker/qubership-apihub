import { Box, Typography } from '@mui/material'
import type { FC } from 'react'
import { memo, useCallback, useMemo, useState } from 'react'

import type { DocumentValidationSummary } from '@apihub/entities/api-quality/package-version-validation-summary'
import { BodyCard } from '@netcracker/qubership-apihub-ui-shared/components/BodyCard'
import { LayoutWithSidebar } from '@netcracker/qubership-apihub-ui-shared/components/PageLayouts/LayoutWithSidebar'
import {
  CONTENT_PLACEHOLDER_AREA,
  Placeholder,
} from '@netcracker/qubership-apihub-ui-shared/components/Placeholder/Placeholder'
import type { SpecItemUri } from '@netcracker/qubership-apihub-ui-shared/utils/specifications'
import { ClientValidationStatuses, useApiQualityValidationSummary } from '../ApiQualityValidationSummaryProvider'
import { ValidatedDocumentSelector } from './ValidatedDocumentSelector'
import { VersionApiQualityCard } from './VersionApiQualityCard'

export const VersionApiQualitySubPage: FC = memo(() => {
  const validationSummary = useApiQualityValidationSummary()
  const validationSummaryAvailable = validationSummary?.status === ClientValidationStatuses.SUCCESS

  const validatedDocuments = useMemo(() => {
    const documents = validationSummary?.documents ?? []
    return [...new Map(documents.map(doc => [doc.slug, doc])).values()]
  }, [validationSummary])
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
        <Box display="flex" alignItems="center" gap={2} mt={1}>
          <Box>Quality Validation</Box>
          {validationSummaryAvailable && (
            <ValidatedDocumentSelector
              value={selectedDocument}
              onSelect={onSelectDocument}
              options={validatedDocuments}
              loading={loadingValidatedDocuments}
            />
          )}
        </Box>
      }
      body={
        <BodyCard
          body={
            <Placeholder
              invisible={validationSummaryAvailable}
              area={CONTENT_PLACEHOLDER_AREA}
              testId="ApiQualityNoResultsPlaceholder"
              message={
                <Typography component="div" variant="h6" color="#8F9EB4">
                  API Quality results are not available
                  <br />
                  Please check the Summary tab for validation status
                </Typography>
              }
            >
              {selectedDocument && (
                <VersionApiQualityCard
                  selectedDocument={selectedDocument}
                  selectedIssuePath={selectedIssuePath}
                  setSelectedIssuePath={setSelectedIssuePath}
                />
              )}
            </Placeholder>
          }
        />
      }
      disableHorizontalDivider
    />
  )
})
