import type { PackageVersion } from '@netcracker/qubership-apihub-ui-shared/entities/versions'
import { getSplittedVersionKey } from '@netcracker/qubership-apihub-ui-shared/utils/versions'

export function handleVersionsRevision(versions: ReadonlyArray<PackageVersion>): ReadonlyArray<PackageVersion> {
  return versions.map(handleVersionRevision)
}

function handleVersionRevision(version: PackageVersion): PackageVersion {
  const { key, latestRevision } = version
  const { versionKey } = getSplittedVersionKey(key, latestRevision)
  return {
    ...version,
    key: versionKey,
  }
}
