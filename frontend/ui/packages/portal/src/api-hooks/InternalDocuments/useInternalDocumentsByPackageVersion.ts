import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { API_V1, requestJson } from '@netcracker/qubership-apihub-ui-shared/utils/requests'
import type { PackageKey, VersionKey } from '@netcracker/qubership-apihub-ui-shared/utils/types'
import { useQuery } from '@tanstack/react-query'
import { generatePath } from 'react-router'

export type InternalDocumentMetaData = {
  id: Key
  fileName: string
  hash: string
}

export type InternalDocuments = ReadonlyArray<InternalDocumentMetaData>

export type QueryResult<T, E = Error> = {
  data: T | undefined
  isLoading: boolean
  error: E | null
}

const QUERY_KEY = 'query-key-internal-documents-by-package-version'

export function useInternalDocumentsByPackageVersion(
  packageId: PackageKey | undefined,
  versionId: VersionKey | undefined,
): QueryResult<InternalDocuments, Error> {
  const { data, isLoading, error } = useQuery<InternalDocuments, Error, InternalDocuments>({
    queryKey: [QUERY_KEY, packageId, versionId],
    queryFn: () => (
      packageId && versionId
        ? getInternalDocumentsByPackageVersion(packageId, versionId)
        : Promise.resolve([])
    ),
    enabled: !!packageId && !!versionId,
  })

  return { data, isLoading, error }
}

function getInternalDocumentsByPackageVersion(
  packageKey: PackageKey,
  versionKey: VersionKey,
): Promise<InternalDocuments> {
  const endpointPattern = '/packages/:packageId/versions/:version/version-internal-documents'
  const endpoint = generatePath(endpointPattern, { packageId: packageKey, version: versionKey })

  return requestJson<InternalDocuments>(
    endpoint,
    { method: 'GET' },
    { basePath: API_V1 },
  )
}
