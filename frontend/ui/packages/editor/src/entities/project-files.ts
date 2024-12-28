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
import type { ChangeType } from './branches'
import type { SpecType } from '@netcracker/qubership-apihub-ui-shared/utils/specs'
import type { FileFormat } from '@netcracker/qubership-apihub-ui-shared/utils/files'
import type { ChangeStatus } from '@netcracker/qubership-apihub-ui-shared/entities/change-statuses'

export type FileData = {
  content: FileContent
  type: SpecType
  format: FileFormat
  title: string
  refFileKeys: FileKey[]
  source?: Blob
}

export type FileContent = string

export type ProjectFile = Readonly<{
  key: Key
  name: string
  format: FileFormat
  blobKey?: Key
  publish?: boolean
  labels?: string[]
  status: ChangeStatus
  changeType?: ChangeType
  movedFrom?: string
  conflictedBlobKey?: Key
  conflictedFileKey?: Key
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
