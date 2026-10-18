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

export type ChangeSummaryDto = Readonly<{
  breaking: number
  semiBreaking: number
  deprecate: number
  nonBreaking: number
  annotation: number
  unclassified: number
}>

export type ServicePublishInfoDto = Readonly<{
  id: string
  packageId: string
  previousVersionPackageId?: string
  changes?: ChangeSummaryDto
  viewChangesUrl?: string
  viewSnapshotUrl?: string
  viewBaselineUrl?: string
}>

export type SnapshotPublishInfoDto = Readonly<{
  services: ReadonlyArray<ServicePublishInfoDto>
}>

export type SnapshotsDto = Readonly<{
  packageId: string
  snapshots: ReadonlyArray<SnapshotDto>
}>

export type SnapshotDto = Readonly<{
  version: string
  previousVersion: string | ''
  publishedAt: string
}>

export type SnapshotConfig = SnapshotConfigDto
export type ServiceConfig = ServiceConfigDto

export type PublishConfigDto = Readonly<{
  snapshot?: SnapshotConfigDto
  services: ReadonlyArray<ServiceConfigDto>
}>

type SnapshotConfigDto = {
  publishId: string
  packageId: string
}

type ServiceConfigDto = {
  serviceId: string
  publishId: string
  packageId: string
  version: string
  previousVersion: string
  previousVersionPackageId?: string
  versionFolder: string
  apihubPackageUrl?: string
  labels: string[]
  status: unknown
  refs: unknown[]
  files: {
    fileId: string
    publish: boolean
    labels: string[]
  }[]
}

export type PublishSnapshotRequestDto = {
  version: string
  previousVersion: string
  services: string[]
  status?: 'draft' | 'release'
}
