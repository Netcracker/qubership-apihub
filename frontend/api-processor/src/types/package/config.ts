import { BuildConfigRef, BuildType, ExportFormat, PackageId, VersionId } from '../external'

export interface PackageConfig {
  packageId: PackageId
  version: VersionId
  previousVersion?: VersionId
  previousVersionPackageId?: PackageId

  buildType?: BuildType

  refs?: BuildConfigRef[]

  metadata?: Record<string, unknown>
  format?: ExportFormat

  previousVersionBuilderVersion?: string
  currentVersionBuilderVersion?: string
}
