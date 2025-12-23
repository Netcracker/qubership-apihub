import type { DiffType } from '@netcracker/qubership-apihub-api-diff'
import { replacePropertyInChangesSummary, type DiffTypeDto } from '@netcracker/qubership-apihub-api-processor'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import type { ChangesSummary } from '@netcracker/qubership-apihub-ui-shared/entities/change-severities'
import { API_V2, requestJson } from '@netcracker/qubership-apihub-ui-shared/utils/requests'
import { optionalSearchParams } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { useQuery } from '@tanstack/react-query'
import { generatePath } from 'react-router-dom'

type Options = {
  packageId: string | undefined
  versionId: string | undefined
  previousPackageId: string | undefined
  previousVersionId: string | undefined
  apiType: ApiType
  operationId: string
  enabled: boolean
}

type Result = {
  data: ChangesSummary
  isLoading: boolean
  error: Error | null
}

const QUERY_KEY_OPERATION_CHANGES_SUMMARY = 'operationChangesSummary'

const EMPTY_CHANGES_SUMMARY: ChangesSummary = {
  breaking: 0,
  risky: 0,
  deprecated: 0,
  'non-breaking': 0,
  unclassified: 0,
  annotation: 0,
}

type ChangesSummaryDto = ChangesSummary<DiffTypeDto>

export function useOperationChangesSummary(options: Options): Result {
  const { packageId, versionId, previousPackageId, previousVersionId, apiType, operationId, enabled } = options
  const {
    data: operationChangesSummary,
    isLoading: loadingOperationChangesSummary,
    error: errorOperationChangesSummary,
  } = useQuery<ChangesSummaryDto, Error, ChangesSummary>({
    queryKey: [QUERY_KEY_OPERATION_CHANGES_SUMMARY, packageId, versionId, previousPackageId, previousVersionId, apiType, operationId],
    queryFn: () => getOperationChangesSummary(options),
    enabled: enabled && !!packageId && !!versionId && !!apiType && !!operationId,
    select: toOperationChangesSummary,
  })
  return {
    data: operationChangesSummary ?? EMPTY_CHANGES_SUMMARY,
    isLoading: loadingOperationChangesSummary,
    error: errorOperationChangesSummary,
  }
}

function getOperationChangesSummary(options: Options): Promise<ChangesSummaryDto> {
  const { packageId, versionId, previousPackageId, previousVersionId, apiType, operationId } = options

  const packageKey = packageId ?? ''
  const versionKey = versionId ?? ''
  const previousPackageKey = previousPackageId ?? ''
  const previousVersionKey = previousVersionId ?? ''

  const endpointPattern = '/packages/:packageId/versions/:versionId/:apiType/operations/:operationId/changes/summary'
  const queryParams = optionalSearchParams({
    previousVersion: { value: previousVersionKey },
    previousVersionPackageId: { value: previousPackageKey },
  })
  const endpoint = generatePath(
    endpointPattern,
    {
      packageId: packageKey,
      versionId: versionKey,
      apiType: apiType,
      operationId: operationId,
    },
  )
  return requestJson<ChangesSummaryDto>(
    `${endpoint}?${queryParams}`,
    { method: 'GET' },
    { basePath: API_V2 },
  )
}

function toOperationChangesSummary(dto: ChangesSummaryDto): ChangesSummary {
  return replacePropertyInChangesSummary<DiffTypeDto, DiffType>(dto)
}
