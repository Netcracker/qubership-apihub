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

import type { VersionKey } from './keys'
import type { VersionStatus } from '@netcracker/qubership-apihub-ui-shared/entities/version-status'
import type { Principal } from '@netcracker/qubership-apihub-ui-shared/entities/principals'

export type PackageVersions = Readonly<PackageVersion[]>

export type PackageVersion = Readonly<{
  key: VersionKey
  status: VersionStatus
  publishedAt: string
  versionLabels: string[]
  latestRevision: boolean
  createdBy: Principal
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

export type GroupVersions = Readonly<GroupVersion[]>

export type GroupVersion = Readonly<{
  key: VersionKey
  status: VersionStatus
  publishedAt: string
  folder?: string
}>

export type GroupVersionDto = Readonly<{
  version: VersionKey
  status: VersionStatus
  publishedAt: string
  revision: number
  folder?: string
}>

export type GroupVersionsDto = Readonly<{
  versions: ReadonlyArray<GroupVersionDto>
}>
