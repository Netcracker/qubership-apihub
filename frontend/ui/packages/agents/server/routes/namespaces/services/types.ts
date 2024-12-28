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

import type { DiscoveryStatus } from '../../../types'

const DRAFT_VERSION_STATUS = 'draft'
const RELEASE_VERSION_STATUS = 'release'
const ARCHIVED_VERSION_STATUS = 'archived'

type VersionStatus =
  | typeof DRAFT_VERSION_STATUS
  | typeof RELEASE_VERSION_STATUS
  | typeof ARCHIVED_VERSION_STATUS

type VersionStatuses = ReadonlyArray<VersionStatus>

export type SpecDto = Readonly<{
  fileId: string
  name: string
  format: 'json' | 'yaml' | 'md' | 'graphql'
  type: string
}>
export type ServiceLabels = Record<string, string>
type BaselineDto = Readonly<{
  packageId: string
  name: string
  versions: ReadonlyArray<string>
  url: string
}>

export type ServiceDto = Readonly<{
  id: string
  specs: ReadonlyArray<SpecDto>
  serviceLabels?: ServiceLabels
  availablePromoteStatuses?: VersionStatuses
  baseline?: BaselineDto
}>

export type ServicesDto = Readonly<{
  status: DiscoveryStatus
  services: ReadonlyArray<ServiceDto>
}>
