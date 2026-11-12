import type { Key, PackageKey, PublishKey, ServiceKey, VersionKey } from './keys'
import type { BuildConfigRef, ResolvedOperation, VersionStatus } from '@netcracker/qubership-apihub-api-processor'

export type PublishConfig = Readonly<{
  snapshotConfig?: SnapshotConfig
  serviceConfigs: ReadonlyArray<ServiceConfig>
  builderId: string
}>

export type SnapshotConfig = SnapshotConfigDto
export type ServiceConfig = ServiceConfigDto

export type PublishConfigDto = Readonly<{
  snapshot?: SnapshotConfigDto
  services: ReadonlyArray<ServiceConfigDto>
}>

type SnapshotConfigDto = {
  publishId: PublishKey
  packageId: PackageKey
}

type ServiceConfigDto = {
  serviceId: ServiceKey
  publishId: PublishKey
  packageId: PackageKey
  version: VersionKey
  previousVersion: VersionKey
  previousVersionPackageId?: PackageKey
  versionFolder: string
  apihubPackageUrl?: string
  labels: string[]
  status: VersionStatus
  refs: BuildConfigRef[]
  files: {
    fileId: Key
    publish: boolean
    labels: string[]
  }[]
  operations: ResolvedOperation[]
}

export function toPublishConfig(value: PublishConfigDto, builderId: string): PublishConfig {
  return {
    snapshotConfig: value.snapshot,
    serviceConfigs: value.services,
    builderId: builderId,
  }
}
