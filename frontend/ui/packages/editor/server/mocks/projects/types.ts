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

import type { Key, Url, VersionKey } from '../../types'
import type { ChangesSummaryDto } from '../changes/types'
import type { GroupDto } from '../groups/types'
import type { IntegrationDto } from '../integrations/types'
import type { Principal } from '../principals/types'
import type { PublishedSpecDto } from '../published-specs/types'
import type { UserDto } from '../users/users'
import type { VersionStatus } from '../version-status/types'

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

export const NONE_CHANGE_TYPE = 'none'
export const ADDED_CHANGE_TYPE = 'added'
export const DELETED_CHANGE_TYPE = 'deleted'
export const UPDATED_CHANGE_TYPE = 'updated'

export type ChangeType =
  | typeof NONE_CHANGE_TYPE
  | typeof ADDED_CHANGE_TYPE
  | typeof UPDATED_CHANGE_TYPE
  | typeof DELETED_CHANGE_TYPE

export const GET_METHOD_TYPE = 'get'
export const POST_METHOD_TYPE = 'post'
export const PUT_METHOD_TYPE = 'put'
export const PATCH_METHOD_TYPE = 'patch'
export const DELETE_METHOD_TYPE = 'delete'

export type MethodType =
  | typeof GET_METHOD_TYPE
  | typeof POST_METHOD_TYPE
  | typeof PUT_METHOD_TYPE
  | typeof PATCH_METHOD_TYPE
  | typeof DELETE_METHOD_TYPE

export type ProjectFileHistoryDto = Readonly<{
  changes: ReadonlyArray<ProjectFileChangeHistoryDto>
}>

export type ProjectFileChangeHistoryDto = Readonly<{
  commitId: Key
  comment: string
  modifiedBy: UserDto
  modifiedAt: string
}>

export type ProjectDto = Readonly<{
  projectId: Key
  groupId: Key
  groups: ReadonlyArray<GroupDto>
  name: string
  alias: string
  isFavorite: boolean
  packageId?: Key
  lastVersion?: string
  integration?: IntegrationDto
  description?: string
}>

export type ProjectsDto = Readonly<{
  projects: ReadonlyArray<ProjectDto>
}>

export type ProjectFileDto = Readonly<{
  fileId: Key
  name: string
  blobId?: Key
  publish?: boolean
  labels?: string[]
  status: ChangeStatus
  changeType?: ChangeType
  movedFrom?: string
  conflictedBlobId?: Key
  conflictedFileId?: Key
}>

export type RefType = 'depend' | 'import'
export type RefKind = 'group' | 'project'

export type RefDto = Partial<Readonly<{
  refId: Key
  name: string
  type: RefType
  kind: RefKind | 'package'
  version: string
  versionStatus: VersionStatus
  refUrl: Url
  status: ChangeStatus
}>>

export type ProjectVersionContentDto = Readonly<{
  status: VersionStatus
  publishedAt: string
  publishedBy: string
  previousVersion?: VersionKey
  previousVersionPackageId?: VersionKey
  versionLabels?: string[]
  summary?: ChangesSummaryDto
  files: ReadonlyArray<PublishedSpecDto>
  refs: ReadonlyArray<RefDto>
}>

export type PackageVersionDto = Readonly<{
  version: VersionKey
  status: VersionStatus
  publishedAt: string
  versionLabels?: string[]
  notLatestRevision?: boolean
  createdBy: Principal
}>

export type PackageVersionsDto = Readonly<{
  versions: ReadonlyArray<PackageVersionDto>
}>
