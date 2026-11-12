import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useVersionWithRevision } from './useVersionWithRevision'
import { generatePath } from 'react-router-dom'
import { portalRequestJson } from '@portal/utils/requests'
import type { VersionReferences, VersionReferencesDto } from '@netcracker/qubership-apihub-ui-shared/entities/version-references'
import { toVersionReferences } from '@netcracker/qubership-apihub-ui-shared/entities/version-references'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { getPackageRedirectDetails } from '@netcracker/qubership-apihub-ui-shared/utils/redirects'
import { API_V3 } from '@netcracker/qubership-apihub-ui-shared/utils/requests'

export const REFERENCES_QUERY_KEY = 'references-query-key'

type VersionReferencesQueryContent = {
  data: VersionReferences
  isLoading: IsLoading
  isInitialLoading: IsLoading
  error: Error | null
}

export function useVersionReferences(options: {
  packageKey?: Key
  version?: Key
  enabled?: boolean
}): VersionReferencesQueryContent {
  const {
    packageKey,
    version,
    enabled,
  } = options ?? {}

  const {
    fullVersion,
    isLoading: isVersionLoading,
    isInitialLoading: isInitialVersionLoading,
  } = useVersionWithRevision(version, packageKey, enabled)

  const { data, isLoading, isInitialLoading, error } = useQuery<VersionReferencesDto, Error, VersionReferences>({
    queryKey: [REFERENCES_QUERY_KEY, packageKey, fullVersion, enabled],
    queryFn: ({ signal }) => getReferences(packageKey!, fullVersion!, signal),
    select: toVersionReferences,
    enabled: enabled && !!fullVersion,
  })

  const result = useMemo(() => {
    return data ?? {}
  }, [data])

  return {
    data: result,
    isLoading: isLoading || isVersionLoading,
    isInitialLoading: isInitialLoading || isInitialVersionLoading,
    error: error,
  }
}

export async function getReferences(
  packageKey: Key,
  version: Key,
  signal?: AbortSignal,
): Promise<VersionReferencesDto> {
  const packageId = encodeURIComponent(packageKey)
  const versionId = encodeURIComponent(version)

  const pathPattern = '/packages/:packageId/versions/:versionId/references'
  return await portalRequestJson<VersionReferencesDto>(
    generatePath(pathPattern, { packageId, versionId }),
    { method: 'GET' },
    {
      basePath: API_V3,
      customRedirectHandler: (response) => getPackageRedirectDetails(response, pathPattern),
    },
    signal,
  )
}

