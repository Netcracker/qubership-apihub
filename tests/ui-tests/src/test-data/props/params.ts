/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
