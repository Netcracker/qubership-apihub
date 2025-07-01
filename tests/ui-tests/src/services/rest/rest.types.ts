import type { OperationsApiType, PackageApiKey, TestFile, VersionStatuses } from '@shared/entities'
import type { AgentVersionStatuses } from '@agent/entities'
import type { PackageKind } from '@test-data/props'

export type RestPublishVersion = {
  packageId: string
  sources: Blob
  config: string
}

export type RestPublishConfig = {
  packageId: string
  version: string
  previousVersion?: string
  status: VersionStatuses
  refs?: { refId: string; version: string }[] | []
  files?: RestPublishFile[]
  metadata?: { versionLabels?: string[]; branchName?: string; repositoryUrl?: string }
}

export type RestPublishFile = {
  fileId: string
  publish?: boolean
  labels?: string[]
  blobId?: string
}

export type RestUser = {
  email: string
  name: string
  password: string
}

export type RestPackageUpdate = {
  packageId: string
  name?: string
  description?: string
  serviceName?: string
  imageUrl?: string
  defaultRole?: string
  defaultReleaseVersion?: string
  releaseVersionPattern?: string
  excludeFromSearch?: boolean
  restGroupingPrefix?: string
}

export type RestPackageCreate = {
  name: string
  parentId?: string
  alias: string
  kind: PackageKind
} & Omit<RestPackageUpdate, 'packageId' | 'defaultReleaseVersion'>

export type RestOperationGroup = {
  apiType: OperationsApiType
  groupName: string
  packageId: string
  version: string
  description?: string
  template?: TestFile
}

export type RestOperationGroupUpdate = RestOperationGroup & {
  newGroupName?: string
  operations?: {
    operationId: string
    packageId?: string
    version?: string
  }[]
}

export type RestAgentConfig = {
  cloud: string
  namespace: string
  workspaceId: string
}

export type RestSnapshot = {
  agentId: string
  namespace: string
  promote: boolean
  version: string
  previousVersion: string
  services: string[]
  status?: AgentVersionStatuses
}

export type RestPackageApiKey = PackageApiKey & {
  packageId: string
}
