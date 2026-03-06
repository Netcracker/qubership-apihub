import { useValidationDetailsByDocument } from '@apihub/api-hooks/ApiQuality/useValidationDetailsByDocument'
import { IssueSeverityFilters } from '@apihub/components/ApiQuality/IssueSeverityFilters'
import { ValidationRulesetsDropdown } from '@apihub/components/ApiQuality/ValidationRulesetsDropdown'
import type { IssueSeverity } from '@apihub/entities/api-quality/issue-severities'
import type { Issue } from '@apihub/entities/api-quality/issues'
import type { Linter } from '@apihub/entities/api-quality/linters'
import type { DocumentValidationSummary } from '@apihub/entities/api-quality/package-version-validation-summary'
import type { RulesetMetadata } from '@apihub/entities/api-quality/rulesets'
import { transformIssuesToMarkers } from '@apihub/utils/api-quality/issues'
import { Box, Typography } from '@mui/material'
import { BodyCard } from '@netcracker/qubership-apihub-ui-shared/components/BodyCard'
import { LoadingIndicator } from '@netcracker/qubership-apihub-ui-shared/components/LoadingIndicator'
import { ModuleFetchingErrorBoundary } from '@netcracker/qubership-apihub-ui-shared/components/ModuleFetchingErrorBoundary/ModuleFetchingErrorBoundary'
import { MonacoEditor } from '@netcracker/qubership-apihub-ui-shared/components/MonacoEditor'
import { CONTENT_PLACEHOLDER_AREA, DATA_RAINY_DAY_PLACEHOLDER_VARIANT, DATA_SUNNY_DAY_PLACEHOLDER_VARIANT, Placeholder } from '@netcracker/qubership-apihub-ui-shared/components/Placeholder/Placeholder'
import { Toggler } from '@netcracker/qubership-apihub-ui-shared/components/Toggler'
import { JSON_FILE_FORMAT, YAML_FILE_FORMAT } from '@netcracker/qubership-apihub-ui-shared/entities/file-formats'
import { usePublishedDocumentRaw } from '@netcracker/qubership-apihub-ui-shared/hooks/documents/usePublishedDocumentRaw'
import type { SpecItemUri } from '@netcracker/qubership-apihub-ui-shared/utils/specifications'
import type { FC, ReactNode } from 'react'
import { memo, useCallback, useMemo, useState } from 'react'
import { useParams } from 'react-router'
import type { OriginalDocumentFileFormat } from './types'
import { useTransformedRawDocumentByFormat } from './utilities/hooks'
import { flatMapValidationIssues, flatMapValidationRulesets } from './utilities/transformers'
import { ValidationResultsExportToolbar } from './ValidationResultsExportToolbar'
import { ValidationResultsTable } from './ValidationResultsTable'
import { useLinters } from '@apihub/api-hooks/ApiQuality/useLinters'

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
      <Box display='flex' alignItems='center' width="100%">
        <Box width="50%" display='flex' justifyContent='flex-start' borderRight={borderStyle} pb={1} pr={1}>
          {leftHeader}
        </Box>
        <Box width='50%' display='flex' justifyContent='flex-end' pb={1} pl={1}>
          {rightHeader}
        </Box>
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
          sx={{ borderTop: borderStyle, pt: internalIndent, pl: internalIndent }}
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

type VersionApiQualityCardProps = {
  selectedDocument: DocumentValidationSummary
  selectedIssuePath: SpecItemUri | undefined
  setSelectedIssuePath: (value: SpecItemUri | undefined) => void
  validationSummaryAvailable: boolean
}

export const VersionApiQualityCard: FC<VersionApiQualityCardProps> = memo((props) => {
  const { selectedDocument, selectedIssuePath, setSelectedIssuePath, validationSummaryAvailable } = props

  const { packageId, versionId } = useParams()

  const [format, setFormat] = useState<OriginalDocumentFileFormat>(YAML_FILE_FORMAT)

  const [validationDetails, loadingValidationDetails] = useValidationDetailsByDocument(
    packageId ?? '',
    versionId ?? '',
    selectedDocument?.slug ?? '',
  )
  const validationRulesets = useMemo(
    () => [...flatMapValidationRulesets(validationDetails)],
    [validationDetails],
  )

  const [selectedDocumentContent, loadingSelectedDocumentContent] = usePublishedDocumentRaw({
    packageKey: packageId,
    versionKey: versionId,
    slug: selectedDocument?.slug ?? '',
  })

  const transformedSelectedDocumentContent = useTransformedRawDocumentByFormat(selectedDocumentContent, format)

  const { data: lintersList = [] } = useLinters(selectedDocument?.apiType)

  const [selectedRulesets, setSelectedRulesets] = useState<Set<RulesetMetadata>>(new Set())
  const [issueSeverityFilters, setIssueSeverityFilters] = useState<IssueSeverity[]>([])
  const originalValidationIssues = useMemo(() => flatMapValidationIssues(validationDetails), [validationDetails])
  const validationIssuesFilteredByRulesets = useMemo(() => {
    return filterBySelectedRulesets(originalValidationIssues, selectedRulesets)
  }, [originalValidationIssues, selectedRulesets])
  const validationIssuesFilteredByRulesetsAndSeverities = useMemo(() => {
    return filterByIssueSeverityFilters(validationIssuesFilteredByRulesets, issueSeverityFilters)
  }, [validationIssuesFilteredByRulesets, issueSeverityFilters])

  const selectedDocumentMarkers = useMemo(() => {
    if (!transformedSelectedDocumentContent) {
      return []
    }
    if (!validationDetails) {
      return []
    }
    if (!validationIssuesFilteredByRulesets.length) {
      return []
    }
    return transformIssuesToMarkers(
      transformedSelectedDocumentContent,
      format,
      validationIssuesFilteredByRulesets,
      lintersList,
    )
  }, [transformedSelectedDocumentContent, validationDetails, validationIssuesFilteredByRulesets, format, lintersList])

  const onFormatChange = useCallback((value: OriginalDocumentFileFormat) => {
    setFormat(value)
    setSelectedIssuePath(undefined)
  }, [setSelectedIssuePath])

  const [placeholderMessage, isSunnyDayPlaceholder] = useMemo(() => {
    // check originalValidationIssues
    //  because it's impossible to have no issues by selected linter(s) (ruleset(s))
    //  due to list will contain only linter(s) (ruleset(s)) from issues
    if (selectedRulesets.size > 0 && originalValidationIssues.length === 0) {
      return [
        <Box display='flex' flexDirection='column' gap={1}>
          <Typography component='div' variant='h5'>
            No issues
          </Typography>
          <Typography component="div" variant="h6" color="#8F9EB4">
            No errors were found with the selected linter(s).
          </Typography>
        </Box>,
        true,
      ]
    }
    if (selectedRulesets.size === 0) {
      return [
        <Box display='flex' flexDirection='column' gap={1}>
          <Typography component='div' variant='h5'>
            No linters
          </Typography>
          <Typography component="div" variant="h6" color="#8F9EB4">
            Choose one or more linters from the «Validated by» dropdown above
            to view API quality validation results.
          </Typography>
        </Box>,
        false,
      ]
    }
    return []
  }, [originalValidationIssues.length, selectedRulesets.size])

  const isExportToolbarDisabled = useMemo(
    () => selectedRulesets.size === 0 || validationIssuesFilteredByRulesetsAndSeverities.length === 0,
    [selectedRulesets.size, validationIssuesFilteredByRulesetsAndSeverities.length],
  )

  return (
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
          <TwoSidedCard
            leftHeader={
              <Box
                display='flex'
                justifyContent='space-between'
                alignItems='center'
                gap={1}
                width="100%"
              >
                <ValidationRulesetsDropdown
                  options={validationRulesets}
                  onChange={setSelectedRulesets}
                  loading={loadingValidationDetails}
                />
                <Box display='flex' alignItems='center' gap={1}>
                  <IssueSeverityFilters
                    data={validationIssuesFilteredByRulesets}
                    filters={issueSeverityFilters}
                    handleFilters={setIssueSeverityFilters}
                  />
                  <ValidationResultsExportToolbar
                    disabled={isExportToolbarDisabled}
                    data={validationIssuesFilteredByRulesetsAndSeverities}
                  />
                </Box>
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
              <Placeholder
                invisible={!placeholderMessage}
                area={CONTENT_PLACEHOLDER_AREA}
                variant={isSunnyDayPlaceholder ? DATA_SUNNY_DAY_PLACEHOLDER_VARIANT : DATA_RAINY_DAY_PLACEHOLDER_VARIANT}
                message={placeholderMessage}
              >
                <ValidationResultsTable
                  data={validationIssuesFilteredByRulesetsAndSeverities}
                  loading={loadingValidationDetails}
                  onSelectIssue={setSelectedIssuePath}
                />
              </Placeholder>
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

function filterBySelectedRulesets(source: Issue[], selectedRulesets: Set<RulesetMetadata>): Issue[] {
  const selectedRulesetsList = Array.from(selectedRulesets)
  const selectedLinters = new Set<Linter['linter']>(selectedRulesetsList.map(ruleset => ruleset.linter))
  return source.filter(issue => selectedLinters.has(issue.linter))
}

function filterByIssueSeverityFilters(source: Issue[], issueSeverityFilters: IssueSeverity[]): Issue[] {
  return issueSeverityFilters.length
    ? source.filter(issue => issueSeverityFilters.includes(issue.severity))
    : source
}
