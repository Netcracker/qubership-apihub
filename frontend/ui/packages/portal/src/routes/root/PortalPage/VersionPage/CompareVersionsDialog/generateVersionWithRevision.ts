import type { PackageVersionContent } from '@netcracker/qubership-apihub-ui-shared/entities/version-contents'
import type { PackageVersion } from '@netcracker/qubership-apihub-ui-shared/entities/versions'

export function generateVersionWithRevision(versionContent: PackageVersionContent | null): PackageVersion | null {
  if (!versionContent) {
    return null
  }
  return {
    key: versionContent.version,
    status: versionContent.status,
    versionLabels: versionContent.versionLabels ?? [],
    latestRevision: versionContent.latestRevision,
    createdBy: versionContent.createdBy,
    apiProcessorVersion: versionContent.apiProcessorVersion,
    hasErrors: versionContent.hasErrors,
    changelogHasErrors: versionContent.changelogHasErrors,
  }
}
