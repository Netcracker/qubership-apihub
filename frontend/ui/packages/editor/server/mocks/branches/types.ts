import type { Key } from '../../types'
import type { ChangeType, ProjectFileDto, RefDto } from '../projects/types'
import type { UserDto } from '../users/users'
import type { VersionStatus } from '../version-status/types'

export const ALL_BRANCH_PERMISSION_TYPE = 'all'
export const SAVE_BRANCH_PERMISSION_TYPE = 'save'
export const PUBLISH_BRANCH_PERMISSION_TYPE = 'publish'
export const EDIT_BRANCH_PERMISSION_TYPE = 'edit'

export type BranchPermission =
  | typeof ALL_BRANCH_PERMISSION_TYPE
  | typeof SAVE_BRANCH_PERMISSION_TYPE
  | typeof PUBLISH_BRANCH_PERMISSION_TYPE
  | typeof EDIT_BRANCH_PERMISSION_TYPE

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

export type BranchConflictsDto = {
  files: Key[]
}

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
