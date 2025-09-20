import type { ValidationSummary, ValidationSummaryDto } from '@apihub/entities/api-quality/package-version-validation-summary'
import { ValidationStatuses } from '@apihub/entities/api-quality/validation-statuses'
import type { Key } from '@apihub/entities/keys'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { requestJson } from '@netcracker/qubership-apihub-ui-shared/utils/requests'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { generatePath } from 'react-router'
import type { SetClientValidationStatus } from '../../routes/root/PortalPage/VersionPage/ApiQualityValidationSummaryProvider'
import { ClientValidationStatuses } from '../../routes/root/PortalPage/VersionPage/ApiQualityValidationSummaryProvider'
import { API_LINTER_API_V1 } from './constants'

const QUERY_KEY_VALIDATION_SUMMARY_FOR_PACKAGE_VERSION = 'validation-summary-for-package-version'

export type RefetchValidationSummary = () => void

export type ValidationSummaryQueryState = {
  data: ValidationSummary | undefined
  isLoading: IsLoading
  error: Error | null
  refetch: RefetchValidationSummary
}

export function useValidationSummaryByPackageVersion(
  linterEnabled: boolean,
  packageId: Key,
  version: Key,
  setClientValidationStatus: SetClientValidationStatus,
): ValidationSummaryQueryState {
  const packageKey = encodeURIComponent(packageId)
  const versionKey = encodeURIComponent(version)

  const { data, isLoading, error, refetch } = useQuery<ValidationSummaryDto, Error, ValidationSummary>({
    queryKey: [QUERY_KEY_VALIDATION_SUMMARY_FOR_PACKAGE_VERSION, packageKey, versionKey],
    queryFn: () => getValidationSummaryByPackageVersion(packageKey, versionKey),
    enabled: linterEnabled,
    onSuccess: (summary: ValidationSummaryDto) => {
      switch (summary.status) {
        case ValidationStatuses.IN_PROGRESS:
          setClientValidationStatus(ClientValidationStatuses.IN_PROGRESS)
          break
        case ValidationStatuses.ERROR:
          setClientValidationStatus(ClientValidationStatuses.ERROR)
          break
        case ValidationStatuses.SUCCESS:
          setClientValidationStatus(ClientValidationStatuses.SUCCESS)
          break
      }
    },
    retry: (failureCount) => {
      if (failureCount < 5) {
        return true
      }
      setClientValidationStatus(ClientValidationStatuses.NOT_VALIDATED)
      return false
    },
    retryDelay: 1000,
  })

  return { data, isLoading, error, refetch }
}

function getValidationSummaryByPackageVersion(
  packageKey: Key,
  versionKey: Key,
): Promise<ValidationSummaryDto> {
  const pattern = '/packages/:packageId/versions/:version/validation/summary'
  const endpoint = generatePath(pattern, {
    packageId: packageKey,
    version: versionKey,
  })

  return requestJson<ValidationSummaryDto>(
    endpoint,
    { method: 'GET' },
    {
      basePath: API_LINTER_API_V1,
      customErrorHandler: (response) => {
        throw new Error(`Request failed with status ${response.status}`)
      },
    },
  )
}

type CallbackInvalidateValidationSummaryByPackageVersion = () => void

export function useInvalidateValidationSummaryByPackageVersion(): CallbackInvalidateValidationSummaryByPackageVersion {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({
      queryKey: [QUERY_KEY_VALIDATION_SUMMARY_FOR_PACKAGE_VERSION],
    })
  }
}
