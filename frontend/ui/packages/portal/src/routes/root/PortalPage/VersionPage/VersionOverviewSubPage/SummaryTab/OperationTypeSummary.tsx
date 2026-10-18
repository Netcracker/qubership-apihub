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

import { Box, Link, Tooltip, Typography } from '@mui/material'
import {
  API_AUDIENCE_EXTERNAL,
  API_AUDIENCE_INTERNAL,
  API_AUDIENCE_UNKNOWN,
  type ApiAudienceTransition,
} from '@netcracker/qubership-apihub-api-processor'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import { API_TYPE_TITLE_MAP } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import type { ChangesSummary } from '@netcracker/qubership-apihub-ui-shared/entities/change-severities'
import {
  DEFAULT_CHANGE_SEVERITY_MAP,
} from '@netcracker/qubership-apihub-ui-shared/entities/change-severities'
import { InfoContextIcon } from '@netcracker/qubership-apihub-ui-shared/icons/InfoContextIcon'
import { DefaultWarningIcon, RedWarningIcon } from '@netcracker/qubership-apihub-ui-shared/icons/WarningIcon'
import type { FC, ReactNode } from 'react'
import { memo, useCallback, useMemo } from 'react'
import { useParams } from 'react-router-dom'

import {
  useAggregatedValidationSummaryByPackageVersion,
} from '@apihub/api-hooks/ApiQuality/useAggregatedValidationSummaryByPackageVersion'
import { useManualRunApiQualityValidation } from '@apihub/api-hooks/ApiQuality/useManualRunApiQualityValidation'
import { ValidationRulesetLink } from '@apihub/components/ApiQuality/ValidatationRulesetLink'
import { ValidationIssuesTooltip } from '@apihub/components/ApiQuality/ValidationIssuesTooltip'
import { ISSUE_SEVERITIES_LIST, ISSUE_SEVERITY_COLOR_MAP } from '@apihub/entities/api-quality/issue-severities'
import type { IssuesSummary } from '@apihub/entities/api-quality/package-version-validation-summary'
import type { RulesetMetadataDto } from '@apihub/entities/api-quality/rulesets'
import { RulesetStatuses } from '@apihub/entities/api-quality/rulesets'
import { ValidationStatuses } from '@apihub/entities/api-quality/validation-statuses'
import {
  ClientValidationStatuses,
  getApiQualitySummaryPlaceholder,
  useApiQualityClientValidationStatus,
  useApiQualityLinterEnabled,
  useApiQualityValidationSummary,
} from '../../ApiQualityValidationSummaryProvider'
import { buildBwcValidationMetrics } from './bwcValidationMetrics'
import { SUMMARY_IMPACTED_ENTITY_OPERATIONS, SUMMARY_METRIC_LABEL_VARIANT_EMPHASIZED } from './entities'
import { type SummaryMetric, SummaryPanels } from './SummaryPanel'
import { SummarySection } from './SummarySection'

export type OperationTypeSummaryProps = Readonly<{
  apiType: ApiType
  operationsCount: number
  deprecatedOperationsCount: number
  noBwcOperationsCount: number
  changesSummary: ChangesSummary
  numberOfImpactedOperations: ChangesSummary
  internalAudienceOperationsCount: number
  unknownAudienceOperationsCount: number
  apiAudienceTransitions: ApiAudienceTransition[]
}>

export const OperationTypeSummary: FC<OperationTypeSummaryProps> = memo<OperationTypeSummaryProps>(({
  apiType,
  changesSummary,
  numberOfImpactedOperations,
  operationsCount,
  deprecatedOperationsCount,
  noBwcOperationsCount,
  internalAudienceOperationsCount,
  unknownAudienceOperationsCount,
  apiAudienceTransitions,
}) => {
  // Feature "API Quality Validation"
  const [manualRunLinter] = useManualRunApiQualityValidation()
  const { packageId, versionId } = useParams()
  const [clientValidationStatus = ClientValidationStatuses.CHECKING, setClientValidationStatus] = useApiQualityClientValidationStatus()
  const onManualRunLinter = useCallback(() => {
    if (packageId && versionId && setClientValidationStatus) {
      manualRunLinter({ packageId, versionId })
      setClientValidationStatus(ClientValidationStatuses.CHECKING)
    }
  }, [manualRunLinter, packageId, versionId, setClientValidationStatus])
  const linterEnabled = useApiQualityLinterEnabled(apiType)
  const validationFailed = clientValidationStatus === ClientValidationStatuses.ERROR
  const validationSuccess = clientValidationStatus === ClientValidationStatuses.SUCCESS
  const apiQualitySummaryPlaceholder = getApiQualitySummaryPlaceholder(onManualRunLinter, clientValidationStatus)
  const showApiQualityPlaceholder = !!apiQualitySummaryPlaceholder
  const showApiQualitySummary = !apiQualitySummaryPlaceholder
  const validationSummary = useApiQualityValidationSummary(apiType)
  const validationRulesets = validationSummary?.rulesets ?? []
  const activeRulesets = validationSummary?.rulesets?.filter(({ status }) => status === RulesetStatuses.ACTIVE)

  const hasInactiveRulesets = validationRulesets.some(ruleset => ruleset.status === RulesetStatuses.INACTIVE)
  const aggregatedValidationSummary: IssuesSummary = useAggregatedValidationSummaryByPackageVersion(
    validationSummary && {
      ...validationSummary,
      documents: validationSummary.documents?.filter(document =>
        activeRulesets?.some(ruleset => ruleset.id === document.rulesetId) ?? false,
      ),
    },
  )

  const documentsWithFailedValidation = useMemo(
    () => (validationSummary?.documents ?? []).reduce((result, document) => {
      if (document.status === ValidationStatuses.ERROR) {
        result.push(document.documentName)
      }
      return result
    }, [] as string[]),
    [validationSummary],
  )
  // Feature "API Quality Validation"

  const changeCounter = useMemo(() => changesSummary ?? DEFAULT_CHANGE_SEVERITY_MAP, [changesSummary])
  const affectedOperationCounter = useMemo(() => numberOfImpactedOperations ?? DEFAULT_CHANGE_SEVERITY_MAP, [numberOfImpactedOperations])
  const internalAudienceCounter = useMemo(() => {
    return apiAudienceTransitions?.find(({ previousAudience, currentAudience }) => previousAudience === API_AUDIENCE_EXTERNAL && currentAudience === API_AUDIENCE_INTERNAL)?.operationsCount ?? 0
  }, [apiAudienceTransitions])

  const unknownAudienceCounter = useMemo(() => {
    return apiAudienceTransitions?.reduce((counter, { previousAudience, currentAudience, operationsCount }) => {
      if ((previousAudience === API_AUDIENCE_EXTERNAL || previousAudience === API_AUDIENCE_INTERNAL) && currentAudience === API_AUDIENCE_UNKNOWN) {
        return counter + operationsCount
      }
      return counter
    }, 0) ?? 0
  }, [apiAudienceTransitions])

  const operationsMetrics = useMemo((): ReadonlyArray<SummaryMetric> => [
    {
      label: 'Total number of operations',
      value: operationsCount,
      'data-testid': 'NumberOfOperationsTypography',
    },
    {
      label: 'Number of deprecated operations',
      value: deprecatedOperationsCount,
      'data-testid': 'NumberOfDeprecatedOperationsTypography',
    },
    {
      label: 'Number of no-BWC operations',
      value: noBwcOperationsCount,
      'data-testid': 'NumberOfNoBwcOperationsTypography',
    },
    {
      label: 'Number of operations for internal audience',
      value: (
        <Box display="flex">
          {internalAudienceOperationsCount}
          {internalAudienceCounter !== 0 && (
            <Tooltip title={`API audience changed from external to internal for ${internalAudienceCounter} operations`}>
              <Box><DefaultWarningIcon /></Box>
            </Tooltip>
          )}
        </Box>
      ),
      visible: internalAudienceOperationsCount !== 0,
    },
    {
      label: 'Number of operations for unknown audience',
      value: (
        <Box display="flex">
          {unknownAudienceOperationsCount}
          {unknownAudienceCounter !== 0 && (
            <Tooltip title={`API audience changed from external/internal to unknown for ${unknownAudienceCounter} operations`}>
              <Box><DefaultWarningIcon /></Box>
            </Tooltip>
          )}
        </Box>
      ),
      visible: unknownAudienceOperationsCount !== 0,
    },
  ], [
    deprecatedOperationsCount,
    internalAudienceCounter,
    internalAudienceOperationsCount,
    noBwcOperationsCount,
    operationsCount,
    unknownAudienceCounter,
    unknownAudienceOperationsCount,
  ])

  const validationMetrics = buildOperationValidationMetrics({
    linterEnabled,
    changeCounter,
    affectedOperationCounter,
    validationFailed,
    showApiQualityPlaceholder,
    apiQualitySummaryPlaceholder,
    showApiQualitySummary,
    validationRulesets,
    activeRulesets,
    hasInactiveRulesets,
    onManualRunLinter,
    validationSuccess,
    aggregatedValidationSummary,
    documentsWithFailedValidation,
  })

  return (
    <SummarySection data-testid={`ValidationsContent-${apiType}`}>
      <SummaryPanels
        numbers={{
          title: `${API_TYPE_TITLE_MAP[apiType]} Operations`,
          metrics: operationsMetrics,
        }}
        validations={{
          title: `${API_TYPE_TITLE_MAP[apiType]} Validation`,
          metrics: validationMetrics,
        }}
      />
    </SummarySection>
  )
})

OperationTypeSummary.displayName = 'OperationTypeSummary'

type ValidationRulesetItemProps = Readonly<{
  ruleset: RulesetMetadataDto
}>

const ValidationRulesetItem: FC<ValidationRulesetItemProps> = ({ ruleset }) => (
  <Box display="flex" alignItems="center" data-testid="ValidationRulesetContainer">
    <ValidationRulesetLink data={ruleset} loading={false}/>
  </Box>
)

type BuildOperationValidationMetricsOptions = Readonly<{
  linterEnabled: boolean
  changeCounter: ChangesSummary
  affectedOperationCounter: ChangesSummary
  validationFailed: boolean
  showApiQualityPlaceholder: boolean
  apiQualitySummaryPlaceholder: ReactNode
  showApiQualitySummary: boolean
  validationRulesets: ReadonlyArray<RulesetMetadataDto>
  activeRulesets: ReadonlyArray<RulesetMetadataDto> | undefined
  hasInactiveRulesets: boolean
  onManualRunLinter: () => void
  validationSuccess: boolean
  aggregatedValidationSummary: IssuesSummary
  documentsWithFailedValidation: ReadonlyArray<string>
}>

function buildOperationValidationMetrics({
  linterEnabled,
  changeCounter,
  affectedOperationCounter,
  validationFailed,
  showApiQualityPlaceholder,
  apiQualitySummaryPlaceholder,
  showApiQualitySummary,
  validationRulesets,
  activeRulesets,
  hasInactiveRulesets,
  onManualRunLinter,
  validationSuccess,
  aggregatedValidationSummary,
  documentsWithFailedValidation,
}: BuildOperationValidationMetricsOptions): ReadonlyArray<SummaryMetric> {
  const metrics: SummaryMetric[] = []

  if (linterEnabled) {
    metrics.push({
      label: 'Backward Compatibility Validation',
      labelVariant: SUMMARY_METRIC_LABEL_VARIANT_EMPHASIZED,
    })
  }

  metrics.push(...buildBwcValidationMetrics({
    changesSummary: changeCounter,
    numberOfImpacted: affectedOperationCounter,
    impactedEntity: SUMMARY_IMPACTED_ENTITY_OPERATIONS,
  }))

  if (!linterEnabled) {
    return metrics
  }

  metrics.push({
    label: 'Quality Validation',
    labelVariant: SUMMARY_METRIC_LABEL_VARIANT_EMPHASIZED,
    'data-testid': 'QualityValidationTitle',
    value: validationFailed
      ? (
        <Tooltip
          title="Validation failed. Some documents could not be processed during quality validation. See information icon below for details about failed documents."
          placement="right"
        >
          <Box data-testid="ValidationFailedAlert">
            <RedWarningIcon />
          </Box>
        </Tooltip>
      )
      : undefined,
  })

  if (showApiQualityPlaceholder && apiQualitySummaryPlaceholder !== undefined) {
    metrics.push({
      label: apiQualitySummaryPlaceholder,
      'data-testid': 'QualityValidationPlaceholder',
    })
  }

  if (showApiQualitySummary) {
    if (validationRulesets.length > 0) {
      metrics.push({
        label: 'Validation rulesets',
        value: (
          <Box
            display="flex"
            flexDirection="column"
            alignItems="flex-start"
            gap={1}
          >
            {(activeRulesets?.length
              ? activeRulesets : validationRulesets).map(ruleset => (
                <ValidationRulesetItem key={ruleset.id} ruleset={ruleset}/>
              ))}
            {hasInactiveRulesets && (
              <Typography variant="body2">
                <Link onClick={onManualRunLinter} data-testid="RunValidationLink">
                  Run Validation
                </Link>
              </Typography>
            )}
          </Box>
        ),
      })
    }

    if (validationSuccess) {
      metrics.push({
        label: 'Number of quality issues',
        value: (
          <Box display="flex" alignItems="center" gap={1.5}>
            {ISSUE_SEVERITIES_LIST.map(severity => (
              <ValidationIssuesTooltip key={severity} issueSeverity={severity}>
                <Box display="flex" alignItems="center" gap={1} data-testid={`IssueCount-${severity}`}>
                  <Box
                    component="span"
                    sx={{ backgroundColor: ISSUE_SEVERITY_COLOR_MAP[severity], width: 8, height: 8, borderRadius: '50%' }}
                  />
                  <Typography variant="body2" component="span" sx={{ fontSize: 13 }}>
                    {aggregatedValidationSummary[severity]}
                  </Typography>
                </Box>
              </ValidationIssuesTooltip>
            ))}
          </Box>
        ),
      })
    }

    if (validationFailed) {
      metrics.push({
        label: 'Number of failed documents',
        value: (
          <Box display="flex" alignItems="center" gap={1} data-testid="FailedDocumentsContainer">
            <Typography variant="body2">
              {documentsWithFailedValidation.length}
            </Typography>
            <Tooltip
              disableHoverListener={false}
              title={
                <Box display="flex" flexDirection="column" gap={1} p={1}>
                  {documentsWithFailedValidation.map(doc => (
                    <Typography key={doc} variant="body2">
                      {doc}
                    </Typography>
                  ))}
                </Box>
              }
              placement="right"
            >
              <InfoContextIcon fontSize='extra-small' />
            </Tooltip>
          </Box>
        ),
      })
    }
  }

  return metrics
}
