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

import type { FileFormat } from '../global-search/types'
import type { GroupDto } from '../groups/types'
import type { UserDto } from '../auth/types'
import type { VersionStatus } from '../packages/version-statuses'
import type { Principal } from '../packages/principal'

export type ConfigFileKeyPrefixType = 'apihub-config'
export type ConfigFileKey = `${ConfigFileKeyPrefixType}${string}`

export type BranchConfigDto = Readonly<{
  configFileId: ConfigFileKey
  files: ReadonlyArray<ProjectFileDto>
  refs: ReadonlyArray<RefDto>
  editors: ReadonlyArray<UserDto>
  permissions?: ReadonlyArray<BranchPermission>
  changeType: ChangeType
}>

export type RefDto = Partial<Readonly<{
  refId: string
  name: string
  type: 'depend' | 'import'
  kind: 'group' | 'project' | 'package'
  version: string
  versionStatus: VersionStatus
  refUrl: string
  status: ChangeStatus
}>>

export const ALL_BRANCH_PERMISSION_TYPE = 'all'
export const SAVE_BRANCH_PERMISSION_TYPE = 'save'
export const PUBLISH_BRANCH_PERMISSION_TYPE = 'publish'
export const EDIT_BRANCH_PERMISSION_TYPE = 'edit'

export type BranchPermission =
  | typeof ALL_BRANCH_PERMISSION_TYPE
  | typeof SAVE_BRANCH_PERMISSION_TYPE
  | typeof PUBLISH_BRANCH_PERMISSION_TYPE
  | typeof EDIT_BRANCH_PERMISSION_TYPE

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
  files: string[]
}

export type GitFileDto = Readonly<{
  name: string
  isFolder: boolean
}>

export type GitFilesDto = Readonly<{
  files: GitFileDto[]
}>

export type ProjectFileHistoryDto = Readonly<{
  changes: ReadonlyArray<ProjectFileChangeHistoryDto>
}>

export type ProjectsDto = Readonly<{
  projects: ReadonlyArray<ProjectDto>
}>

export type PackageVersionDto = Readonly<{
  version: string
  status: VersionStatus
  createdBy: Principal
  createdAt?: string
  versionLabels?: string[]
  previousVersion?: string
  summary?: PackageVersionSummary
  notLatestRevision?: boolean
}>

export type PackageVersionSummary = Readonly<{
  breaking?: number
  semiBreaking?: number
  deprecated?: number
  nonBreaking?: number
  annotation?: number
  unclassified?: number
}>

export type PackageVersionsDto = Readonly<{
  versions: ReadonlyArray<PackageVersionDto>
}>

export type ProjectFile = Readonly<{
  key: string
  name: string
  format: FileFormat
  commitKey?: string
  publish?: boolean
  labels?: string[]
  status: ChangeStatus
  changeType?: ChangeType
  movedFrom?: string
  conflictedCommitKey?: string
  conflictedFileKey?: string
}>

export type ProjectFileDto = Readonly<{
  fileId: string
  name: string
  commitId?: string
  publish?: boolean
  labels?: string[]
  status: ChangeStatus
  changeType?: ChangeType
  movedFrom?: string
  conflictedCommitId?: string
  conflictedFileId?: string
}>

export type ProjectDto = Readonly<{
  projectId: string
  groupId: string
  groups: ReadonlyArray<GroupDto>
  name: string
  alias: string
  isFavorite: boolean
  lastVersion?: string
  integration?: IntegrationDto
  description?: string
}>

export type ProjectFileChangeHistoryDto = Readonly<{
  commitId: string
  comment: string
  modifiedBy: UserDto
  modifiedAt: string
  version?: string
  publishedAt?: string
}>

export type IntegrationDto = Partial<Readonly<{
  type: 'gitlab'
  repositoryId: string
  repositoryName: string
  repositoryUrl: string
  defaultBranch: string
  defaultFolder: string
}>>

export const MOVED_CHANGE_STATUS = 'moved'
export const MODIFIED_CHANGE_STATUS = 'modified'
export const EXCLUDED_CHANGE_STATUS = 'excluded'
export const DELETED_CHANGE_STATUS = 'deleted'
export const ADDED_CHANGE_STATUS = 'added'
export const INCLUDED_CHANGE_STATUS = 'included'
export const UNMODIFIED_CHANGE_STATUS = 'unmodified'

export type ChangeStatus =
  | typeof MOVED_CHANGE_STATUS
  | typeof MODIFIED_CHANGE_STATUS
  | typeof EXCLUDED_CHANGE_STATUS
  | typeof DELETED_CHANGE_STATUS
  | typeof ADDED_CHANGE_STATUS
  | typeof INCLUDED_CHANGE_STATUS
  | typeof UNMODIFIED_CHANGE_STATUS

export const ADD_OPERATION = 'add'
export const PATCH_OPERATION = 'patch'
export const REMOVE_OPERATION = 'remove'
