import type { TdmOperationGroup, TdmPublishVersion } from '@services/test-data-manager'
import type { OperationTest, PackageApiKey, TestFile } from '@shared/entities'
import type { Group, Workspace } from '@test-data/props/packages'

export type PackageKind = 'workspace' | 'group' | 'package' | 'dashboard'

export interface TestMetaBasePackage {
  readonly updatedName?: string
  readonly updatedDescription?: string
  readonly updatedServiceName?: string
}

export interface BasePackageParams {
  readonly name: string
  readonly alias: string
  readonly description?: string
  readonly testMeta?: TestMetaBasePackage
}

export interface WorkspaceParams extends BasePackageParams {
  readonly defaultRole?: string
  readonly apiKeys?: PackageApiKey[]
}

export interface GroupParams extends WorkspaceParams {
  readonly parent: Workspace | Group
}

export interface PackageParams extends GroupParams {
  serviceName?: string
  releaseVersionPattern?: string
  restGroupingPrefix?: string
}

export interface ProjectParams extends Omit<GroupParams, 'defaultRole'> {
  branch?: string
  packageId?: string
}

export interface Version extends Omit<TdmPublishVersion, 'packageId'> {
  packageName?: string
}

export interface OperationGroup extends TdmOperationGroup {
  testMeta?: {
    changedName?: string
    changedDescription?: string
    operations?: OperationTest[]
    toAdd?: {
      packageName?: string
      operations: OperationTest[]
    }[]
    toRemove?: {
      packageName?: string
      operations: OperationTest[]
    }[]
    templateJson?: TestFile
    templateYaml?: TestFile
  }
}
