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

import type { PackageKey, ServicePublishInfoKey } from './keys'
import type { ChangesSummary, ChangesSummaryDto } from '@netcracker/qubership-apihub-ui-shared/entities/change-severities'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'

export type ServicePublishInfo = Readonly<{
  key: ServicePublishInfoKey
  apiTypes?: ApiType[]
  packageKey: PackageKey
  previousVersionPackageKey?: PackageKey
  changeSummary?: ChangesSummary
  viewChangesUrl?: string
  viewSnapshotUrl?: string
  viewBaselineUrl?: string
  baselineFound: boolean
  baselineVersionFound: boolean
}>

export type ServicePublishInfoDto = Readonly<{
  id: ServicePublishInfoKey
  apiTypes?: ApiType[]
  packageId: PackageKey
  previousVersionPackageId?: PackageKey
  changes?: ChangesSummaryDto
  viewChangesUrl?: string
  viewSnapshotUrl?: string
  viewBaselineUrl?: string
  baselineFound: boolean
  baselineVersionFound: boolean
}>

export function toServicePublishInfo(value: ServicePublishInfoDto): ServicePublishInfo {
  return {
    key: value.id,
    apiTypes: value.apiTypes,
    packageKey: value.packageId,
    previousVersionPackageKey: value.previousVersionPackageId,
    changeSummary: value.changes,
    viewChangesUrl: value.viewChangesUrl,
    viewSnapshotUrl: value.viewSnapshotUrl,
    viewBaselineUrl: value.viewBaselineUrl,
    baselineFound: value?.baselineFound ?? false,
    baselineVersionFound: value?.baselineVersionFound ?? false,
  }
}
