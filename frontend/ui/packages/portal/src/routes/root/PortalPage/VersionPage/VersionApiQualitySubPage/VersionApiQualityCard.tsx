import { useValidationDetailsByDocument } from '@apihub/api-hooks/ApiQuality/useValidationDetailsByDocument'
import { ValidationRulesettLink } from '@apihub/components/ApiQuality/ValidatationRulesetLink'
import type { DocumentValidationSummary } from '@apihub/entities/api-quality/package-version-validation-summary'
import { JSON_FILE_FORMAT, YAML_FILE_FORMAT } from '@netcracker/qubership-apihub-ui-shared/entities/file-formats'
import { transformIssuesToMarkers } from '@apihub/utils/api-quality/issues'
import { Box, Typography } from '@mui/material'
import { BodyCard } from '@netcracker/qubership-apihub-ui-shared/components/BodyCard'
import { LoadingIndicator } from '@netcracker/qubership-apihub-ui-shared/components/LoadingIndicator'
import { ModuleFetchingErrorBoundary } from '@netcracker/qubership-apihub-ui-shared/components/ModuleFetchingErrorBoundary/ModuleFetchingErrorBoundary'
import { MonacoEditor } from '@netcracker/qubership-apihub-ui-shared/components/MonacoEditor'
import { CONTENT_PLACEHOLDER_AREA, Placeholder } from '@netcracker/qubership-apihub-ui-shared/components/Placeholder/Placeholder'
import { Toggler } from '@netcracker/qubership-apihub-ui-shared/components/Toggler'
import type { SpecItemUri } from '@netcracker/qubership-apihub-ui-shared/utils/specifications'
import type { FC, ReactNode } from 'react'
import { memo, useCallback, useMemo, useState } from 'react'
import { useParams } from 'react-router'
import { ClientValidationStatuses, useApiQualityValidationSummary } from '../ApiQualityValidationSummaryProvider'
import { usePublishedDocumentRaw } from '@netcracker/qubership-apihub-ui-shared/hooks/documents/usePublishedDocumentRaw'
import type { OriginalDocumentFileFormat } from './types'
import { useTransformedRawDocumentByFormat } from './utilities/hooks'
import { ValidatedDocumentSelector } from './ValidatedDocumentSelector'
import { ValidationResultsTable } from './ValidationResultsTable'

type TwoSidedCardProps = Partial<{
  leftHeader: ReactNode
  rightHeader: ReactNode
  leftBody: ReactNode
  rightBody: ReactNode
}>

const TwoSidedCard: FC<TwoSidedCardProps> = memo<TwoSidedCardProps>((props) => {
  const { leftHeader, rightHeader, leftBody, rightBody } = props

  const borderStyle = useMemo(() => '1px solid #D5DCE3', [])
  const internalIndent = 2

  return (
    <Box display='flex' flexDirection='column' height="calc(100% - 50px)">
      <Box display='flex' justifyContent='space-between' alignItems='center' width="100%" mb={1}>
        {leftHeader}
        {rightHeader}
      </Box>
      <Box
        display="grid"
        height="100%"
        gridTemplateAreas={`
          "left-body right-body"
        `}
        gridTemplateColumns="50% 50%"
        gridTemplateRows="100%"
      >
        <Box
          gridArea="left-body"
          sx={{ borderTop: borderStyle, borderRight: borderStyle, pt: internalIndent, pr: internalIndent }}
        >
          {leftBody}
        </Box>
        <Box
          gridArea="right-body"
          sx={{ borderTop: borderStyle, borderLeft: borderStyle, pt: internalIndent, pl: internalIndent }}
        >
          {rightBody}
        </Box>
      </Box>
    </Box>
  )
})

const MONACO_EDITOR_FORMATS: readonly OriginalDocumentFileFormat[] = [JSON_FILE_FORMAT, YAML_FILE_FORMAT]

const MONACO_EDITOR_PRETTY_FORMATS = {
  [JSON_FILE_FORMAT]: JSON_FILE_FORMAT.toUpperCase(),
  [YAML_FILE_FORMAT]: YAML_FILE_FORMAT.toUpperCase(),
}

export const VersionApiQualityCard: FC = memo(() => {
  const { packageId, versionId } = useParams()

  const [selectedDocument, setSelectedDocument] = useState<DocumentValidationSummary | undefined>()
  const [format, setFormat] = useState<OriginalDocumentFileFormat>(YAML_FILE_FORMAT)

  const [selectedIssuePath, setSelectedIssuePath] = useState<SpecItemUri | undefined>()

  const [validationDetails, loadingValidationDetails] = useValidationDetailsByDocument(
    packageId ?? '',
    versionId ?? '',
    selectedDocument?.slug ?? '',
  )

  const validationSummary = useApiQualityValidationSummary()
  const validationSummaryAvailable = validationSummary?.status === ClientValidationStatuses.SUCCESS
  const validatedDocuments = useMemo(() => validationSummary?.documents ?? [], [validationSummary])
  const loadingValidatedDocuments = useMemo(() => validationSummary === undefined, [validationSummary])

  const [selectedDocumentContent, loadingSelectedDocumentContent] = usePublishedDocumentRaw({
    packageKey: packageId,
    versionKey: versionId,
    slug: selectedDocument?.slug ?? '',
  })

  const transformedSelectedDocumentContent = useTransformedRawDocumentByFormat(selectedDocumentContent, format)

  const selectedDocumentMarkers = useMemo(() => {
    if (!transformedSelectedDocumentContent) {
      return []
    }
    if (!validationDetails) {
      return []
    }
    // TODO 19.09.25 // Remove default because real response doesn't match API
    if (!validationDetails.issues) {
      return []
    }
    const { issues } = validationDetails
    return transformIssuesToMarkers(transformedSelectedDocumentContent, format, issues)
  }, [validationDetails, transformedSelectedDocumentContent, format])

  const onSelectDocument = useCallback((value: DocumentValidationSummary | undefined) => {
    setSelectedDocument(value)
    setSelectedIssuePath(undefined)
  }, [])

  const onFormatChange = useCallback((value: OriginalDocumentFileFormat) => {
    setFormat(value)
    setSelectedIssuePath(undefined)
  }, [])

  return (
    <BodyCard
      body={
        <Placeholder
          invisible={validationSummaryAvailable}
          area={CONTENT_PLACEHOLDER_AREA}
          message={
            <Typography component="div" variant="h6" color="#8F9EB4">
              API Quality results are not available
              <br />
              Please check the Summary tab for validation status
            </Typography>
          }
        >
          <TwoSidedCard
            leftHeader={
              <Box
                display='flex'
                justifyContent='flex-start'
                alignItems='center'
                gap={1}
                width="100%"
              >
                <ValidatedDocumentSelector
                  value={selectedDocument}
                  onSelect={onSelectDocument}
                  options={validatedDocuments}
                  loading={loadingValidatedDocuments}
                />
                <ValidationRulesettLink
                  data={validationDetails?.ruleset}
                  loading={loadingValidationDetails}
                />
              </Box>
            }
            rightHeader={
              <Toggler<OriginalDocumentFileFormat>
                mode={format}
                modes={MONACO_EDITOR_FORMATS}
                modeToText={MONACO_EDITOR_PRETTY_FORMATS}
                onChange={onFormatChange}
              />
            }
            leftBody={
              <ValidationResultsTable
                data={validationDetails}
                loading={loadingValidationDetails}
                onSelectIssue={setSelectedIssuePath}
              />
            }
            rightBody={
              loadingSelectedDocumentContent ? <LoadingIndicator /> : (
                <ModuleFetchingErrorBoundary>
                  <Box height="100%">
                    <MonacoEditor
                      value={transformedSelectedDocumentContent}
                      type={selectedDocument!.apiType}
                      language={format}
                      selectedUri={selectedIssuePath}
                      markers={selectedDocumentMarkers}
                    />
                  </Box>
                </ModuleFetchingErrorBoundary>
              )
            }
          />
        </Placeholder>
      }
    />
  )
})
