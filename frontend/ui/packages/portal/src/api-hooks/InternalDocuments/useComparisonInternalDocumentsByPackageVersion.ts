import type { PackageKey, VersionKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { API_V1, requestJson } from '@netcracker/qubership-apihub-ui-shared/utils/requests'
import { useQuery } from '@tanstack/react-query'
import { generatePath } from 'react-router-dom'
import type { InternalDocuments, QueryResult } from './useInternalDocumentsByPackageVersion'
import { optionalSearchParams } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'

const QUERY_KEY = 'query-key-comparison-internal-documents-by-package-version'

export function useComparisonInternalDocumentsByPackageVersion(
  packageId: PackageKey | undefined,
  versionId: VersionKey | undefined,
  previousPackageId: PackageKey | undefined,
  previousVersionId: VersionKey | undefined,
): QueryResult<InternalDocuments, Error | null> {
  const { data, isLoading, error } = useQuery<InternalDocuments, Error, InternalDocuments>({
    queryKey: [QUERY_KEY, packageId, versionId, previousPackageId, previousVersionId],
    queryFn: () => (
      packageId && versionId && previousPackageId && previousVersionId
        ? getComparisonInternalDocumentsByPackageVersion(
          packageId,
          versionId,
          previousPackageId,
          previousVersionId,
        )
        : Promise.resolve([])
    ),
    enabled: !!packageId && !!versionId && !!previousPackageId && !!previousVersionId,
  })

  return { data, isLoading, error }
}

function getComparisonInternalDocumentsByPackageVersion(
  packageId: PackageKey,
  versionId: VersionKey,
  previousPackageId: PackageKey,
  previousVersionId: VersionKey,
): Promise<InternalDocuments> {
  const endpointPattern = '/packages/:packageId/versions/:versionId/comparison-internal-documents'
  const endpoint = `${generatePath(endpointPattern, { packageId, versionId })}?${optionalSearchParams({
    previousPackageId: { value: previousPackageId },
    previousVersionId: { value: previousVersionId },
  })}`
  return requestJson<InternalDocuments>(
    endpoint,
    { method: 'GET' },
    { basePath: API_V1 },
  )
}
