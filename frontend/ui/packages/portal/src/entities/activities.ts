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

import type { ActivityEventType, EventType } from './activity-enums'
import type { PackageKind } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import type { VersionStatus } from '@netcracker/qubership-apihub-ui-shared/entities/version-status'
import type { Principal } from '@netcracker/qubership-apihub-ui-shared/entities/principals'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'

type Version = string

type VersionMeta = Array<'status' | 'label'>

type PackageMeta = Array<'name' | 'description' | 'serviceName' | 'defaultRole'>

type ActivityKind = PackageKind

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

export type Role = {
  roleId: string
  role: string
}

export type GrantOrDeleteRoleEventDetails = {
  memberId: string
  memberName: string
  roles: Role[]
}

export type UpdateRoleEventDetails = {
  memberId: string
  memberName: string
}

export type PublishOrDeleteVersionEventDetails = {
  version: Version
  status: VersionStatus
}

export type PublishNewRevisionEventDetails = {
  version: Version
  status: VersionStatus
  notLatestRevision?: boolean
}

export type PatchVersionMetaEventDetails = {
  version: Version
  versionMeta: VersionMeta
}

export type PatchPackageMetaEventDetails = {
  packageMeta: PackageMeta
}

export type CreateOrDeleteManualGroupEventDetails = {
  version: Version
  groupName: string
  notLatestRevision?: boolean
  apiType: ApiType
}

export type UpdateOperationsGroupParametersEventDetails = {
  version: Version
  groupName: string
  groupParameters: GroupParameters
  notLatestRevision?: boolean
  isPrefixGroup: boolean
  apiType: ApiType
}

export type EventDetails =
  | GrantOrDeleteRoleEventDetails
  | UpdateRoleEventDetails
  | PublishOrDeleteVersionEventDetails
  | PublishNewRevisionEventDetails
  | PatchVersionMetaEventDetails
  | PatchPackageMetaEventDetails
  | CreateOrDeleteManualGroupEventDetails
  | UpdateOperationsGroupParametersEventDetails

export type ActivityDto = {
  eventType: EventType
  date: string
  principal: Principal
  userId: string
  packageId: string
  packageName: string
  kind: ActivityKind
  params: EventDetails
}

export type ActivityHistoryDto = {
  events: Array<ActivityDto>
}

// DTO

export type GrantOrDeleteRoleActivityDetails = GrantOrDeleteRoleEventDetails

export type UpdateRoleActivityDetails = UpdateRoleEventDetails

export type PublishOrDeleteVersionActivityDetails = PublishOrDeleteVersionEventDetails

export type PublishNewRevisionActivityDetails = PublishNewRevisionEventDetails

export type PatchVersionMetaActivityDetails = PatchVersionMetaEventDetails

export type PatchPackageMetaActivityDetails = PatchPackageMetaEventDetails

export type CreateOrDeleteManualGroupActivityDetails = CreateOrDeleteManualGroupEventDetails

export type UpdateOperationsGroupParametersActivityDetails = UpdateOperationsGroupParametersEventDetails

export type ActivityDetails =
  | GrantOrDeleteRoleActivityDetails
  | UpdateRoleActivityDetails
  | PublishOrDeleteVersionActivityDetails
  | PublishNewRevisionActivityDetails
  | PatchVersionMetaActivityDetails
  | PatchPackageMetaActivityDetails
  | CreateOrDeleteManualGroupActivityDetails
  | UpdateOperationsGroupParametersActivityDetails

export type Activity = {
  activityType: ActivityEventType
  date: string
  principal: Principal
  userId: string
  packageId: string
  packageName: string
  kind: ActivityKind
  details: ActivityDetails
}

export type Activities = ReadonlyArray<Activity>
