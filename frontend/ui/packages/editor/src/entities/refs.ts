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
import type { VersionStatus } from '@netcracker/qubership-apihub-ui-shared/entities/version-status'
import type { Url } from '@netcracker/qubership-apihub-ui-shared/types/url'
import type { ChangeStatus } from '@netcracker/qubership-apihub-ui-shared/entities/change-statuses'

export type Ref = Partial<Readonly<{
  key: Key
  version: string
  name: string
  type: RefType
  kind: RefKind
  versionStatus: VersionStatus
  refUrl: Url
  status: ChangeStatus
}>>

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

export function toRef(value: RefDto): Ref {
  return {
    key: value.refId,
    version: value.version,
    name: value.name,
    type: value.type,
    kind: value.kind === 'package' ? 'project' : value.kind,
    versionStatus: value.versionStatus,
    refUrl: value.refUrl,
    status: value.status,
  }
}

export function toRefDto(value: Ref): RefDto {
  return {
    refId: value.key,
    version: value.version,
    name: value.name,
    type: value.type,
    kind: value.kind,
    versionStatus: value.versionStatus,
    refUrl: value.refUrl,
    status: value.status,
  }
}
