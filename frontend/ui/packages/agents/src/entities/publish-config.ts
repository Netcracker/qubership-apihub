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

import type { Key, PackageKey, PublishKey, ServiceKey, VersionKey } from './keys'
import type { BuildConfigRef, ResolvedOperation, VersionStatus } from '@netcracker/qubership-apihub-api-processor'

export type PublishConfig = Readonly<{
  snapshotConfig?: SnapshotConfig
  serviceConfigs: ReadonlyArray<ServiceConfig>
  builderId: string
}>

export type SnapshotConfig = SnapshotConfigDto
export type ServiceConfig = ServiceConfigDto

export type PublishConfigDto = Readonly<{
  snapshot?: SnapshotConfigDto
  services: ReadonlyArray<ServiceConfigDto>
}>

type SnapshotConfigDto = {
  publishId: PublishKey
  packageId: PackageKey
}

type ServiceConfigDto = {
  serviceId: ServiceKey
  publishId: PublishKey
  packageId: PackageKey
  version: VersionKey
  previousVersion: VersionKey
  previousVersionPackageId?: PackageKey
  versionFolder: string
  apihubPackageUrl?: string
  labels: string[]
  status: VersionStatus
  refs: BuildConfigRef[]
  files: {
    fileId: Key
    publish: boolean
    labels: string[]
  }[]
  operations: ResolvedOperation[]
}

export function toPublishConfig(value: PublishConfigDto, builderId: string): PublishConfig {
  return {
    snapshotConfig: value.snapshot,
    serviceConfigs: value.services,
    builderId: builderId,
  }
}
