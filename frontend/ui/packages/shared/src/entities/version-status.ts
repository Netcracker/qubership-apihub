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

import type { PackagePermission } from './package-permissions'
import {
  MANAGE_ARCHIVED_VERSION_PERMISSION,
  MANAGE_DRAFT_VERSION_PERMISSION,
  MANAGE_RELEASE_VERSION_PERMISSION,
} from './package-permissions'
import type { Key } from './keys'

export const DRAFT_VERSION_STATUS = 'draft'
export const RELEASE_VERSION_STATUS = 'release'
export const ARCHIVED_VERSION_STATUS = 'archived'

export type VersionStatus =
  | typeof DRAFT_VERSION_STATUS
  | typeof RELEASE_VERSION_STATUS
  | typeof ARCHIVED_VERSION_STATUS

export type VersionStatuses = ReadonlyArray<VersionStatus>

export const PUBLISH_STATUSES = new Map([
  [DRAFT_VERSION_STATUS, 'Draft'],
  [RELEASE_VERSION_STATUS, 'Release'],
  [ARCHIVED_VERSION_STATUS, 'Archived'],
])

export const VERSION_STATUS_MANAGE_PERMISSIONS: Record<VersionStatus, PackagePermission> = {
  [DRAFT_VERSION_STATUS]: MANAGE_DRAFT_VERSION_PERMISSION,
  [RELEASE_VERSION_STATUS]: MANAGE_RELEASE_VERSION_PERMISSION,
  [ARCHIVED_VERSION_STATUS]: MANAGE_ARCHIVED_VERSION_PERMISSION,
}

export const VERSION_STATUSES: VersionStatuses = [
  DRAFT_VERSION_STATUS,
  RELEASE_VERSION_STATUS,
  ARCHIVED_VERSION_STATUS,
]

export const NO_PREVIOUS_RELEASE_VERSION_OPTION: Key = 'No previous release version'
