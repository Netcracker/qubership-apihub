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

import type { Key } from './keys'
import type { Operation } from './operations'
import type { BranchConfigDto, ChangeType } from './branches'
import type { RefDto } from './refs'
import type { UserDto } from '@netcracker/qubership-apihub-ui-shared/types/user'
import type { ChangeStatus } from '@netcracker/qubership-apihub-ui-shared/entities/change-statuses'
import type { VersionStatus } from '@netcracker/qubership-apihub-ui-shared/entities/version-status'

// branch
export const BRANCH_RESET_EVENT_TYPE = 'branch:reset'
export const BRANCH_SAVED_EVENT_TYPE = 'branch:saved'
export const BRANCH_PUBLISHED_EVENT_TYPE = 'branch:published'

// branch:config
export const BRANCH_CONFIG_SNAPSHOT_EVENT_TYPE = 'branch:config:snapshot'
export const BRANCH_CONFIG_UPDATED_EVENT_TYPE = 'branch:config:updated'

// branch:files
export const BRANCH_FILES_RESET_EVENT_TYPE = 'branch:files:reset'
export const BRANCH_FILES_UPDATED_EVENT_TYPE = 'branch:files:updated'
export const BRANCH_FILES_DATA_MODIFIED_EVENT_TYPE = 'branch:files:data:modified'

// branch:refs
export const BRANCH_REFS_UPDATED_EVENT_TYPE = 'branch:refs:updated'

// branch:editors
export const BRANCH_EDITORS_ADDED_EVENT_TYPE = 'branch:editors:added'
export const BRANCH_EDITORS_REMOVED_EVENT_TYPE = 'branch:editors:removed'

// user
export const USER_CONNECTED_EVENT_TYPE = 'user:connected'
export const USER_DISCONNECTED_EVENT_TYPE = 'user:disconnected'

export type UserConnectedEventData = {
  type: typeof USER_CONNECTED_EVENT_TYPE
  sessionId: Key
  connectedAt: string
  user: UserDto
  userColor: string
}

export function isUserConnectedEventData(
  value: Record<string, unknown>,
): value is UserConnectedEventData {
  return value.type === USER_CONNECTED_EVENT_TYPE
}

export type UserDisconnectedEventData = {
  type: typeof USER_DISCONNECTED_EVENT_TYPE
  sessionId: Key
  user: UserDto
}

export function isUserDisconnectedEventData(
  value: Record<string, unknown>,
): value is UserDisconnectedEventData {
  return value.type === USER_DISCONNECTED_EVENT_TYPE
}

export type BranchConfigSnapshotEventData = {
  type: typeof BRANCH_CONFIG_SNAPSHOT_EVENT_TYPE
  data: BranchConfigDto
}

export function isBranchConfigSnapshotEventData(
  value: Record<string, unknown>,
): value is BranchConfigSnapshotEventData {
  return value.type === BRANCH_CONFIG_SNAPSHOT_EVENT_TYPE
}

export type BranchEditorsAddedEventData = {
  type: typeof BRANCH_EDITORS_ADDED_EVENT_TYPE
  userId: Key
}

export function isBranchConfigUpdatedEventData(
  value: Record<string, unknown>,
): value is BranchConfigUpdatedEventData {
  return value.type === BRANCH_CONFIG_UPDATED_EVENT_TYPE
}

export type BranchConfigUpdatedEventData = {
  type: typeof BRANCH_CONFIG_UPDATED_EVENT_TYPE
  data: {
    changeType: ChangeType
  }
}

export function isBranchEditorsAddedEventData(
  value: Record<string, unknown>,
): value is BranchEditorsAddedEventData {
  return value.type === BRANCH_EDITORS_ADDED_EVENT_TYPE
}

export type BranchEditorsRemovedEventData = {
  type: typeof BRANCH_EDITORS_REMOVED_EVENT_TYPE
  userId: Key
}

export function isBranchEditorsRemovedEventData(
  value: Record<string, unknown>,
): value is BranchEditorsRemovedEventData {
  return value.type === BRANCH_EDITORS_REMOVED_EVENT_TYPE
}

export type BranchFilesResetEventData = {
  type: typeof BRANCH_FILES_RESET_EVENT_TYPE
  userId: Key
  fileId: Key
}

export function isBranchFilesResetEventData(
  value: Record<string, unknown>,
): value is BranchFilesResetEventData {
  return value.type === BRANCH_FILES_RESET_EVENT_TYPE
}

export type BranchFilesContent = {
  fileId: string
  publish?: boolean
  labels?: string[]
  status?: ChangeStatus
  blobId?: Key
  changeType?: ChangeType
  movedFrom?: string
  conflictedBlobId?: string
}

export type BranchFilesUpdatedEventData = {
  type: typeof BRANCH_FILES_UPDATED_EVENT_TYPE
  userId: Key
  fileId: Key
  operation: Operation
  data?: BranchFilesContent
}

export function isBranchFilesUpdatedEventData(
  value: Record<string, unknown>,
): value is BranchFilesUpdatedEventData {
  return value.type === BRANCH_FILES_UPDATED_EVENT_TYPE
}

export type BranchFilesDataModifiedEventData = {
  type: typeof BRANCH_FILES_DATA_MODIFIED_EVENT_TYPE
  userId: Key
  fileId: Key
}

export function isBranchFilesDataModifiedEventData(
  value: Record<string, unknown>,
): value is BranchFilesDataModifiedEventData {
  return value.type === BRANCH_FILES_DATA_MODIFIED_EVENT_TYPE
}

export type BranchRefsUpdatedEventData = {
  type: typeof BRANCH_REFS_UPDATED_EVENT_TYPE
  userId: Key
  operation: Operation
  refId?: Key
  version: string
  data?: RefDto
}

export function isBranchRefsUpdatedEventData(
  value: Record<string, unknown>,
): value is BranchRefsUpdatedEventData {
  return value.type === BRANCH_REFS_UPDATED_EVENT_TYPE
}

export type BranchResetEventData = {
  type: typeof BRANCH_RESET_EVENT_TYPE
  userId: Key
}

export function isBranchResetEventData(
  value: Record<string, unknown>,
): value is BranchResetEventData {
  return value.type === BRANCH_RESET_EVENT_TYPE
}

export type BranchSavedEventData = {
  type: typeof BRANCH_SAVED_EVENT_TYPE
  userId: Key
  comment: string
  branch?: string
  mrUrl?: string
}

export function isBranchSavedEventData(
  value: Record<string, unknown>,
): value is BranchSavedEventData {
  return value.type === BRANCH_SAVED_EVENT_TYPE
}

export type BranchPublishedEventData = {
  type: typeof BRANCH_PUBLISHED_EVENT_TYPE
  userId: Key
  version: string
  status?: VersionStatus
}

export function isBranchPublishedEventData(
  value: Record<string, unknown>,
): value is BranchPublishedEventData {
  return value.type === BRANCH_PUBLISHED_EVENT_TYPE
}
