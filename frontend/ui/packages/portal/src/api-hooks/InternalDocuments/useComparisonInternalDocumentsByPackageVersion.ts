import type { PackageKey, VersionKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { API_V1, requestJson } from '@netcracker/qubership-apihub-ui-shared/utils/requests'
import { useQuery } from '@tanstack/react-query'
import { generatePath } from 'react-router-dom'
import type { InternalDocuments, QueryResult } from './useInternalDocumentsByPackageVersion'

const QUERY_KEY = 'query-key-comparison-internal-documents-by-package-version'

type Options = {
  currentPackageId: PackageKey | undefined
  currentVersionId: VersionKey | undefined
  previousPackageId: PackageKey | undefined
  previousVersionId: VersionKey | undefined
}

export function useComparisonInternalDocumentsByPackageVersion(
  options: Options,
): QueryResult<InternalDocuments, Error | null> {
  const { currentPackageId, currentVersionId, previousPackageId, previousVersionId } = options

  const currentPackageKey = encodeURIComponent(currentPackageId ?? '')
  const currentPackageVersion = encodeURIComponent(currentVersionId ?? '')

  const enabled = !!currentPackageKey && !!currentPackageVersion && !!previousPackageId && !!previousVersionId

  const { data, isLoading, error } = useQuery<InternalDocuments, Error, InternalDocuments>({
    queryKey: [QUERY_KEY, currentPackageKey, currentPackageVersion, previousPackageId, previousVersionId],
    queryFn: () => (
      enabled
        ? getComparisonInternalDocumentsByPackageVersion(
          currentPackageKey,
          currentPackageVersion,
          previousPackageId,
          previousVersionId,
        )
        : Promise.resolve([])
    ),
    enabled: enabled,
  })

  return { data, isLoading, error }
}

function getComparisonInternalDocumentsByPackageVersion(
  currentPackageId: PackageKey,
  currentVersionId: VersionKey,
  previousPackageId: PackageKey,
  previousVersionId: VersionKey,
): Promise<InternalDocuments> {
  const endpointPattern = '/packages/:packageId/versions/:versionId/comparison-internal-documents'
  const endpoint = `${generatePath(endpointPattern, {
    packageId: currentPackageId,
    versionId: currentVersionId,
  })}?${new URLSearchParams({
    previousVersionPackageId: previousPackageId,
    previousVersion: previousVersionId,
  })}`
  return requestJson<InternalDocuments>(
    endpoint,
    { method: 'GET' },
    { basePath: API_V1 },
  )
}
