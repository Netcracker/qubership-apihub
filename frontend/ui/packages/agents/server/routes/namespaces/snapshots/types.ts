export type ChangeSummaryDto = Readonly<{
  breaking: number
  semiBreaking: number
  deprecate: number
  nonBreaking: number
  annotation: number
  unclassified: number
}>

export type ServicePublishInfoDto = Readonly<{
  id: string
  packageId: string
  previousVersionPackageId?: string
  changes?: ChangeSummaryDto
  viewChangesUrl?: string
  viewSnapshotUrl?: string
  viewBaselineUrl?: string
}>

export type SnapshotPublishInfoDto = Readonly<{
  services: ReadonlyArray<ServicePublishInfoDto>
}>

export type SnapshotsDto = Readonly<{
  packageId: string
  snapshots: ReadonlyArray<SnapshotDto>
}>

export type SnapshotDto = Readonly<{
  version: string
  previousVersion: string | ''
  publishedAt: string
}>

export type SnapshotConfig = SnapshotConfigDto
export type ServiceConfig = ServiceConfigDto

export type PublishConfigDto = Readonly<{
  snapshot?: SnapshotConfigDto
  services: ReadonlyArray<ServiceConfigDto>
}>

type SnapshotConfigDto = {
  publishId: string
  packageId: string
}

type ServiceConfigDto = {
  serviceId: string
  publishId: string
  packageId: string
  version: string
  previousVersion: string
  previousVersionPackageId?: string
  versionFolder: string
  apihubPackageUrl?: string
  labels: string[]
  status: unknown
  refs: unknown[]
  files: {
    fileId: string
    publish: boolean
    labels: string[]
  }[]
}

export type PublishSnapshotRequestDto = {
  version: string
  previousVersion: string
  services: string[]
  status?: 'draft' | 'release'
}
