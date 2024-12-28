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

export type PagedPackageVersions = Readonly<PackageVersions[]>

export type PackageVersions = Readonly<PackageVersion[]>

export type PackageVersion = Readonly<{
  key: VersionKey
  status: VersionStatus
  createdBy?: string
  createdAt?: string
  versionLabels: string[]
  previousVersion?: string
  latestRevision: boolean
}>

export type PackageVersionDto = Readonly<{
  version: VersionKey
  status: VersionStatus
  createdBy?: string
  createdAt?: string
  versionLabels?: string[]
  previousVersion?: string
  notLatestRevision?: boolean
}>

export type PackageVersionsDto = Readonly<{
  versions: ReadonlyArray<PackageVersionDto>
}>

export const SPECIAL_VERSION_KEY = '@'
export const REVISION_DELIMITER = '@'
