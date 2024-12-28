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

import type { FileKey, Key } from './keys'
import type { FileFormat } from './file-formats'
import type { SpecType } from '@netcracker/qubership-apihub-ui-shared/utils/specs'
import type { ChangeStatus } from '@netcracker/qubership-apihub-ui-shared/entities/change-statuses'

export type FileData = {
  content: FileContent
  type: SpecType
  format: FileFormat
  title: string
  refFileKeys: FileKey[]
  source: FileContent
}

export type FileContent = string

export type ProjectFile = Readonly<{
  key: Key
  name: string
  format: FileFormat
  commitKey?: Key
  publish?: boolean
  labels?: string[]
  status: ChangeStatus
  changeType?: ChangeType
  movedFrom?: string
  conflictedCommitKey?: Key
  conflictedFileKey?: Key
}>

export type ProjectFileDto = Readonly<{
  fileId: Key
  name: string
  commitId?: Key
  publish?: boolean
  labels?: string[]
  status: ChangeStatus
  changeType?: ChangeType
  movedFrom?: string
  conflictedCommitId?: Key
  conflictedFileId?: Key
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
