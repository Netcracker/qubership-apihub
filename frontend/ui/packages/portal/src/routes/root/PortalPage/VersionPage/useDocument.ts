import type { QueryKey } from '@tanstack/react-query'
import { useQuery } from '@tanstack/react-query'
import { useVersionWithRevision } from '../../useVersionWithRevision'
import { generatePath } from 'react-router-dom'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import type { Document, DocumentDto } from '@portal/entities/documents'
import { EMPTY_DOC, toDocument } from '@portal/entities/documents'
import { portalRequestJson } from '@portal/utils/requests'
import { API_V3 } from '@netcracker/qubership-apihub-ui-shared/utils/requests'
import { getPackageRedirectDetails } from '@netcracker/qubership-apihub-ui-shared/utils/redirects'
import { useMemo } from 'react'

export const DOCUMENT_QUERY_KEY = 'document-query-key'

export function useDocument(
  packageKey?: Key,
  versionKey?: Key,
  docKey?: Key,
  options?: {
    enabled?: boolean
  },
): [Document, IsLoading] {
  const { fullVersion } = useVersionWithRevision(versionKey, packageKey)

  const queryKey = useMemo(
    () => [DOCUMENT_QUERY_KEY, packageKey, fullVersion, docKey],
    [docKey, fullVersion, packageKey],
  )

  const enabledManually = options?.enabled ?? true
  const enabledByQueryKey = isEnabledByQueryKey(queryKey)

  const { data, isLoading } = useQuery<DocumentDto, Error, Document>({
    queryKey: queryKey,
    queryFn: ({ signal }) => getDocument(packageKey!, fullVersion, docKey!, signal),
    enabled: enabledManually && enabledByQueryKey,
    select: toDocument,
  })

  return [data ?? EMPTY_DOC, isLoading]
}

async function getDocument(
  packageKey: Key,
  versionKey: Key,
  slug: Key,
  signal?: AbortSignal,
): Promise<DocumentDto> {
  const packageId = encodeURIComponent(packageKey)
  const versionId = encodeURIComponent(versionKey)
  const docId = encodeURIComponent(slug)

  const pathPattern = '/packages/:packageId/versions/:versionId/documents/:docId'
  return await portalRequestJson<DocumentDto>(
    generatePath(pathPattern, { packageId, versionId, docId }),
    { method: 'get' },
    {
      basePath: API_V3,
      customRedirectHandler: (response) => getPackageRedirectDetails(response, pathPattern),
    },
    signal,
  )
}

function isEnabledByQueryKey(queryKey: QueryKey): boolean {
  return queryKey.every(keyItem => !!keyItem)
}
