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

import type { VersionStatus } from './version-statuses'
import { DRAFT_VERSION_STATUS, RELEASE_VERSION_STATUS } from './version-statuses'
import type { Principal } from './principal'
import { TOKEN_SAMPLE, USER_SAMPLE, USER_SAMPLE_WITHOUT_ICON, USER_SAMPLE_WITHOUT_NAME } from './principal'
import type { OperationsApiType } from './types'

type Version = string

type VersionMeta = Array<'status' | 'label'>

type PackageMeta = Array<'name' | 'description' | 'serviceName' | 'defaultRole'>

export const GROUP_PARAMETER_NAME = 'name'
export const GROUP_PARAMETER_DESCRIPTION = 'description'
export const GROUP_PARAMETER_TEMPLATE = 'template'
export const GROUP_PARAMETER_OPERATIONS = 'operations'

export type GroupParameter =
  | typeof GROUP_PARAMETER_NAME
  | typeof GROUP_PARAMETER_DESCRIPTION
  | typeof GROUP_PARAMETER_TEMPLATE
  | typeof GROUP_PARAMETER_OPERATIONS

type GroupParameters = Array<GroupParameter>

export enum EventType {
  EVENT_GRANT_ROLE = 'grant_role',
  EVENT_UPDATE_ROLE = 'update_role',
  EVENT_DELETE_ROLE = 'delete_role',
  EVENT_GENERATE_API_KEY = 'generate_api_key',
  EVENT_REVOKE_API_KEY = 'revoke_api_key',
  EVENT_PUBLISH_NEW_VERSION = 'publish_new_version',
  EVENT_PUBLISH_NEW_REVISION = 'publish_new_revision',
  EVENT_PATCH_VERSION_META = 'patch_version_meta',
  EVENT_DELETE_VERSION = 'delete_version',
  EVENT_CREATE_PACKAGE = 'create_package',
  EVENT_DELETE_PACKAGE = 'delete_package',
  EVENT_PATCH_PACKAGE_META = 'patch_package_meta',
  EVENT_CREATE_MANUAL_GROUP = 'create_manual_group',
  EVENT_DELETE_MANUAL_GROUP = 'delete_manual_group',
  EVENT_UPDATE_OPERATIONS_GROUP_PARAMETERS = 'update_operations_group_parameters',
}

type ActivityKind = 'workspace' | 'group' | 'package' | 'dashboard'

type Role = {
  roleId: string
  role: string
}

type ParamsForGrantOrDeleteRole = {
  memberId: string
  memberName: string
  roles: Role[]
}

type ParamsForUpdateRole = {
  memberId: string
  memberName: string
}

type ParamsForPublishOrDeleteVersion = {
  version: Version
  status: VersionStatus
}

type ParamsForPublishNewRevision = {
  version: Version
  revision: number
  status: VersionStatus
}

type ParamsForPatchVersionMeta = {
  version: Version
  versionMeta: VersionMeta
}

type ParamsForPatchPackageMeta = {
  packageMeta: PackageMeta
}

type ParamsForCreateOrDeleteManualGroup = {
  version: Version
  groupName: string
  notLatestRevision?: boolean
  apiType: OperationsApiType
}

type ParamsForUpdateOperationsGroupParameters = {
  version: Version
  groupName: string
  groupParameters: GroupParameters
  notLatestRevision?: boolean
  isPrefixGroup: boolean
  apiType: OperationsApiType
}

type Activity = {
  eventType: EventType
  date: string
  principal: Principal
  userId: string
  packageId: string
  packageName: string
  kind: ActivityKind
  params?:
    | ParamsForGrantOrDeleteRole
    | ParamsForUpdateRole
    | ParamsForPublishOrDeleteVersion
    | ParamsForPublishNewRevision
    | ParamsForPatchVersionMeta
    | ParamsForPatchPackageMeta
    | ParamsForCreateOrDeleteManualGroup
    | ParamsForUpdateOperationsGroupParameters
}

type ActivityHistory = {
  events: Array<Activity>
}

export const ACTIVITIES_LIST: ActivityHistory = {
  events: [
    // Corner Case with special symbol in version
    {
      eventType: EventType.EVENT_PUBLISH_NEW_VERSION,
      date: '2020-01-01T13:00:00Z',
      kind: 'package',
      packageId: 'package-4',
      packageName: 'Test Package 4',
      userId: 'tstusr004',
      principal: USER_SAMPLE,
      params: {
        version: '?',
        status: DRAFT_VERSION_STATUS,
      },
    },
    // API Keys & Create Package & Delete Package
    {
      eventType: EventType.EVENT_GENERATE_API_KEY,
      date: '2020-01-01T10:00:00Z',
      kind: 'package',
      packageId: 'package-1',
      packageName: 'Test Package 1',
      userId: 'tstusr001',
      principal: USER_SAMPLE_WITHOUT_ICON,
    },
    {
      eventType: EventType.EVENT_REVOKE_API_KEY,
      date: '2020-01-01T10:01:00Z',
      kind: 'package',
      packageId: 'package-1',
      packageName: 'Test Package 1',
      userId: 'tstusr001',
      principal: USER_SAMPLE_WITHOUT_NAME,
    },
    {
      eventType: EventType.EVENT_CREATE_PACKAGE,
      date: '2020-01-01T10:02:00Z',
      kind: 'package',
      packageId: 'package-0',
      packageName: 'Test Package Without Version',
      userId: 'tstusr001',
      principal: TOKEN_SAMPLE,
    },
    {
      eventType: EventType.EVENT_CREATE_PACKAGE,
      date: '2020-01-01T10:02:01Z',
      kind: 'package',
      packageId: 'package-1',
      packageName: 'Test Package 1',
      userId: 'tstusr001',
      principal: USER_SAMPLE,
    },
    {
      eventType: EventType.EVENT_DELETE_PACKAGE,
      date: '2020-01-01T10:03:00Z',
      kind: 'package',
      packageId: 'package-1',
      packageName: 'Test Package 1',
      userId: 'tstusr001',
      principal: USER_SAMPLE,
    },
    // Grant & Delete Role
    {
      eventType: EventType.EVENT_GRANT_ROLE,
      date: '2020-01-01T11:00:00Z',
      kind: 'package',
      packageId: 'package-2',
      packageName: 'Test Package 2',
      userId: 'tstusr002',
      principal: TOKEN_SAMPLE,
      params: {
        memberId: 'mmbr1',
        memberName: 'Member 1',
        roles: [
          { roleId: 'role1', role: 'Role 1' },
          { roleId: 'role2', role: 'Role 2' },
        ],
      },
    },
    {
      eventType: EventType.EVENT_DELETE_ROLE,
      date: '2020-01-01T11:01:00Z',
      kind: 'package',
      packageId: 'package-2',
      packageName: 'Test Package 2',
      userId: 'tstusr002',
      principal: TOKEN_SAMPLE,
      params: {
        memberId: 'mmbr1',
        memberName: 'Member 1',
        roles: [
          { roleId: 'role3', role: 'Role 3' },
        ],
      },
    },
    // Update Role
    {
      eventType: EventType.EVENT_UPDATE_ROLE,
      date: '2020-01-01T12:00:00Z',
      kind: 'package',
      packageId: 'package-3',
      packageName: 'Test Package 3',
      userId: 'tstusr003',
      principal: TOKEN_SAMPLE,
      params: {
        memberId: 'mmbr2',
        memberName: 'Member 2',
      },
    },
    // Publish & Delete Version
    {
      eventType: EventType.EVENT_PUBLISH_NEW_VERSION,
      date: '2020-01-01T13:00:00Z',
      kind: 'package',
      packageId: 'package-4',
      packageName: 'Test Package 4',
      userId: 'tstusr004',
      principal: TOKEN_SAMPLE,
      params: {
        version: 'myVersion_1.24.9.a181',
        status: DRAFT_VERSION_STATUS,
      },
    },
    {
      eventType: EventType.EVENT_DELETE_VERSION,
      date: '2020-01-01T13:01:00Z',
      kind: 'package',
      packageId: 'package-4',
      packageName: 'Test Package 4',
      userId: 'tstusr004',
      principal: TOKEN_SAMPLE,
      params: {
        version: '1900.1',
        status: RELEASE_VERSION_STATUS,
      },
    },
    // Publish New Revision
    {
      eventType: EventType.EVENT_PUBLISH_NEW_REVISION,
      date: '2020-01-01T14:00:00Z',
      kind: 'package',
      packageId: 'package-5',
      packageName: 'Test Package 5',
      userId: 'tstusr005',
      principal: TOKEN_SAMPLE,
      params: {
        version: 'project-build-20230704-1234',
        status: DRAFT_VERSION_STATUS,
        revision: 100500,
      },
    },
    // Patch Version Meta
    {
      eventType: EventType.EVENT_PATCH_VERSION_META,
      date: '2020-01-01T15:00:00Z',
      kind: 'package',
      packageId: 'package-6',
      packageName: 'Test Package 6',
      userId: 'tstusr006',
      principal: TOKEN_SAMPLE,
      params: {
        version: 'project-build-20230704-1234',
        versionMeta: ['label'],
      },
    },
    // Patch Package Meta
    {
      eventType: EventType.EVENT_PATCH_PACKAGE_META,
      date: '2020-01-01T16:00:00Z',
      kind: 'package',
      packageId: 'package-6',
      packageName: 'Test Package 6',
      userId: 'tstusr007',
      principal: TOKEN_SAMPLE,
      params: {
        packageMeta: ['defaultRole', 'description'],
      },
    },
    {
      eventType: EventType.EVENT_CREATE_MANUAL_GROUP,
      date: '2020-01-01T16:00:00Z',
      kind: 'package',
      packageId: 'package-6',
      packageName: 'Test Package 6',
      userId: 'tstusr007',
      principal: USER_SAMPLE,
      params: {
        version: '2024.1@1',
        groupName: 'my group',
        notLatestRevision: true,
        apiType: 'rest',
      },
    },
    {
      eventType: EventType.EVENT_DELETE_MANUAL_GROUP,
      date: '2020-01-01T16:00:00Z',
      kind: 'package',
      packageId: 'package-6',
      packageName: 'Test Package 6',
      userId: 'tstusr007',
      principal: USER_SAMPLE,
      params: {
        version: '2024.1@1',
        groupName: 'my group',
        notLatestRevision: false,
        apiType: 'rest',
      },
    },
    {
      eventType: EventType.EVENT_UPDATE_OPERATIONS_GROUP_PARAMETERS,
      date: '2020-01-01T16:00:00Z',
      kind: 'package',
      packageId: 'package-6',
      packageName: 'Test Package 6',
      userId: 'tstusr007',
      principal: USER_SAMPLE,
      params: {
        version: '2024.1@1',
        groupName: 'my group',
        groupParameters: [
          GROUP_PARAMETER_NAME,
          GROUP_PARAMETER_DESCRIPTION,
          GROUP_PARAMETER_TEMPLATE,
          GROUP_PARAMETER_OPERATIONS,
        ],
        notLatestRevision: false,
        isPrefixGroup: true,
        apiType: 'rest',
      },
    },
  ],
}
