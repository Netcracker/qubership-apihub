import { useMemo } from 'react'
import { usePackageVersionContent } from './usePackageVersionContent'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'

export type VersionWithRevisionQueryState = {
  fullVersion: Key
  latestRevision: boolean
  isLoading: IsLoading
  isInitialLoading: IsLoading
}

export function useVersionWithRevision(
  version: Key | undefined,
  packageKey: Key | undefined,
  enabled?: boolean,
): VersionWithRevisionQueryState {
  const { versionContent, isLoading, isInitialLoading } = usePackageVersionContent({
    versionKey: version,
    packageKey: packageKey,
    enabled: enabled,
  })
  const { version: versionWithRevision, latestRevision } = versionContent ?? {}
  return useMemo(
    () => ({
      fullVersion: versionWithRevision ?? '',
      latestRevision: latestRevision ?? true,
      isLoading: isLoading,
      isInitialLoading: isInitialLoading,
    }),
    [isInitialLoading, isLoading, latestRevision, versionWithRevision],
  )
}
