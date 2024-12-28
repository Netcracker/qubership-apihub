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

import { FileId, KeyOfConstType, OperationsApiType, PackageId, VersionId } from './types'
import { BUILD_TYPE, VERSION_STATUS } from '../../consts'

export type BuildType = KeyOfConstType<typeof BUILD_TYPE>
export type VersionStatus = KeyOfConstType<typeof VERSION_STATUS>

export const YAML_EXPORT_GROUP_FORMAT = 'yaml'
export const JSON_EXPORT_GROUP_FORMAT = 'json'
export const HTML_EXPORT_GROUP_FORMAT = 'html'

export type OperationsGroupExportFormat =
  | typeof YAML_EXPORT_GROUP_FORMAT
  | typeof JSON_EXPORT_GROUP_FORMAT
  | typeof HTML_EXPORT_GROUP_FORMAT

export interface BuildConfig {
  packageId: PackageId
  version: VersionId // @revision for rebuild
  status: VersionStatus
  previousVersion?: VersionId
  previousVersionPackageId?: PackageId

  buildType?: BuildType

  currentGroup?: string
  previousGroup?: string
  groupName?: string // for documentGroup buildType
  apiType?: OperationsApiType

  refs?: BuildConfigRef[]
  files?: BuildConfigFile[]

  metadata?: Record<string, unknown>
  format?: OperationsGroupExportFormat
}

export interface BuildConfigFile {
  fileId: FileId
  slug?: string // for rebuild
  apiKind?: string

  // deprecated
  publish?: boolean

  // other params (should pass through to output config)
  [key: string]: unknown

  // labels?: string[]
}

export interface BuildConfigRef {
  refId: string
  version: string
}
