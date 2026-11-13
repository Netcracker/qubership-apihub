import { usePackageVersions } from '@netcracker/qubership-apihub-ui-shared/hooks/versions/usePackageVersions'
import { useMemo } from 'react'
import { generateVersionWithRevision } from './generateVersionWithRevision'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { PackageVersionContent } from '@netcracker/qubership-apihub-ui-shared/entities/version-contents'
import type { PackageVersion } from '@netcracker/qubership-apihub-ui-shared/entities/versions'
import { getSplittedVersionKey } from '@netcracker/qubership-apihub-ui-shared/utils/versions'

export function useVersionCandidate(option: {
  packageKey: Key | undefined
  versionKey: Key | undefined
  versionContent: PackageVersionContent | null
}): PackageVersion | undefined {
  const { packageKey, versionKey, versionContent } = option
  const { versions } = usePackageVersions({ packageKey: packageKey, textFilter: versionKey })
  const isLatestRevision = versionContent?.latestRevision

  const versionsCandidates = useMemo(() => {
    const searchVersionWithRevision = generateVersionWithRevision(versionContent)
    if (searchVersionWithRevision && !isLatestRevision) {
      return [
        ...versions,
        // add version with not the latest revision to options
        searchVersionWithRevision,
      ]
    }
    return versions
  }, [isLatestRevision, versionContent, versions])

  return useMemo(() => {
    return versionsCandidates?.find(({ key }) => {
      const { versionKey: candidateVersionKey } = getSplittedVersionKey(key)
      const { versionKey: currentVersionKey } = getSplittedVersionKey(versionKey)
      return isLatestRevision ? candidateVersionKey === currentVersionKey : key === versionKey
    })

  }, [isLatestRevision, versionKey, versionsCandidates])
}
