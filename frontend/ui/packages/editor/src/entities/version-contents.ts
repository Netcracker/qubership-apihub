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

import type { Key, VersionKey } from './keys'
import type { PublishedSpec, PublishedSpecDto } from './published-specs'
import type { Ref, RefDto } from './refs'
import type { VersionStatus } from '@netcracker/qubership-apihub-ui-shared/entities/version-status'
import type { ChangesSummary, ChangesSummaryDto } from '@netcracker/qubership-apihub-ui-shared/entities/change-severities'

export type ProjectVersionContent = Readonly<{
  key: Key
  status: VersionStatus
  publishedAt: string
  publishedBy: string
  previousVersion?: VersionKey
  previousVersionPackageId?: VersionKey
  versionLabels?: string[]
  summary?: ChangesSummary
  specs: ReadonlyArray<PublishedSpec>
  refs: ReadonlyArray<Ref>
}>

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

export type GroupVersionContent = Readonly<{
  key: Key
  status: VersionStatus
  publishedAt: string
  specs: ReadonlyArray<PublishedSpec>
  refs: ReadonlyArray<Ref>
}>

export type GroupVersionContentDto = Readonly<{
  status: VersionStatus
  publishedAt: string
  files: ReadonlyArray<PublishedSpecDto>
  refs: ReadonlyArray<RefDto>
}>
