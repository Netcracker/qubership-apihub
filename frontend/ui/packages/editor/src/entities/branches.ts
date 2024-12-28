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

import type { ProjectFile, ProjectFileDto } from './project-files'
import type { Ref, RefDto } from './refs'
import type { Key } from './keys'
import type { User, UserDto } from '@netcracker/qubership-apihub-ui-shared/types/user'
import type { VersionStatus } from '@netcracker/qubership-apihub-ui-shared/entities/version-status'

export const CONFIG_FILE_KEY_PREFIX: ConfigFileKeyPrefixType = 'apihub-config'

export type ConfigFileKeyPrefixType = 'apihub-config'

export type ConfigFileKey = `${ConfigFileKeyPrefixType}${string}`

export type BranchConfig = Readonly<{
  key: ConfigFileKey
  files: ReadonlyArray<ProjectFile>
  refs: ReadonlyArray<Ref>
  editors: ReadonlyArray<User>
  permissions?: ReadonlyArray<BranchPermission>
  changeType: ChangeType
}>

export type BranchConfigDto = Readonly<{
  configFileId: ConfigFileKey
  files: ReadonlyArray<ProjectFileDto>
  refs: ReadonlyArray<RefDto>
  editors: ReadonlyArray<UserDto>
  permissions?: ReadonlyArray<BranchPermission>
  changeType: ChangeType
}>

export const ALL_BRANCH_PERMISSION_TYPE = 'all'
export const SAVE_BRANCH_PERMISSION_TYPE = 'save'
export const PUBLISH_BRANCH_PERMISSION_TYPE = 'publish'
export const EDIT_BRANCH_PERMISSION_TYPE = 'edit'

export type BranchPermission =
  | typeof ALL_BRANCH_PERMISSION_TYPE
  | typeof SAVE_BRANCH_PERMISSION_TYPE
  | typeof PUBLISH_BRANCH_PERMISSION_TYPE
  | typeof EDIT_BRANCH_PERMISSION_TYPE

export type Branches = Readonly<Branch[]>

export type Branch = Readonly<{
  key: string
  name: string
  version?: string
  status?: VersionStatus
  publishedAt?: string
  permissions?: ReadonlyArray<BranchPermission>
}>

export type BranchDto = Readonly<{
  name: string
  version?: string
  status?: VersionStatus
  publishedAt?: string
  permissions?: ReadonlyArray<BranchPermission>
}>

export type BranchesDto = Readonly<{
  branches: ReadonlyArray<BranchDto>
}>

export const NONE_CHANGE_TYPE = 'none'
export const ADDED_CHANGE_TYPE = 'added'
export const DELETED_CHANGE_TYPE = 'deleted'
export const UPDATED_CHANGE_TYPE = 'updated'

export type ChangeType =
  | typeof NONE_CHANGE_TYPE
  | typeof ADDED_CHANGE_TYPE
  | typeof UPDATED_CHANGE_TYPE
  | typeof DELETED_CHANGE_TYPE

export type BranchConflictsDto = {
  files: Key[]
}
