import type { ValidationDetails, ValidationDetailsDto } from '@apihub/entities/api-quality/document-validation-details'
import type { Key } from '@apihub/entities/keys'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { requestJson } from '@netcracker/qubership-apihub-ui-shared/utils/requests'
import { useQuery } from '@tanstack/react-query'
import { generatePath } from 'react-router'
import { API_LINTER_API_V1 } from './constants'

const QUERY_KEY_VALIDATION_DETAILS_BY_DOCUMENT = 'validation-details-by-document'

export function useValidationDetailsByDocument(
  packageId: Key,
  version: Key,
  slug: Key, // Normalized document name, e.g. public-api-yaml
): [ValidationDetails | undefined, IsLoading, Error | null] {
  const packageKey = encodeURIComponent(packageId)
  const versionKey = encodeURIComponent(version)

  const { data, isLoading, error } = useQuery<ValidationDetailsDto, Error, ValidationDetails>({
    queryKey: [QUERY_KEY_VALIDATION_DETAILS_BY_DOCUMENT, packageKey, versionKey, slug],
    queryFn: () => getValidationDetailsByDocument(packageKey, versionKey, slug),
    select: toValidationDetails,
    enabled: !!packageId && !!version && !!slug,
  })

  return [data, isLoading, error]
}

function getValidationDetailsByDocument(
  packageKey: Key,
  versionKey: Key,
  slug: Key,
): Promise<ValidationDetailsDto> {
  const pattern = '/packages/:packageId/versions/:version/validation/documents/:documentId/details'
  const endpoint = generatePath(pattern, {
    packageId: packageKey,
    version: versionKey,
    documentId: slug,
  })

  return requestJson<ValidationDetailsDto>(
    endpoint,
    { method: 'GET' },
    { basePath: API_LINTER_API_V1 },
  )
}

function toValidationDetails(dto: ValidationDetailsDto): ValidationDetails {
  return {
    ruleset: dto.ruleset,
    issues: dto.issues,
    document: dto.document,
  }
}
