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
import { BUILD_TYPE, FILE_FORMAT_HTML, FILE_FORMAT_JSON, FILE_FORMAT_YAML, VERSION_STATUS } from '../../consts'
import { OpenApiExtensionKey } from '@netcracker/qubership-apihub-api-unifier'

export type BuildType = KeyOfConstType<typeof BUILD_TYPE>
export type VersionStatus = KeyOfConstType<typeof VERSION_STATUS>

export const YAML_EXPORT_GROUP_FORMAT = 'yaml'
export const JSON_EXPORT_GROUP_FORMAT = 'json'
export const HTML_EXPORT_GROUP_FORMAT = 'html'

export type OperationsGroupExportFormat =
  | typeof YAML_EXPORT_GROUP_FORMAT
  | typeof JSON_EXPORT_GROUP_FORMAT
  | typeof HTML_EXPORT_GROUP_FORMAT

export type ExportFormat =
  | typeof FILE_FORMAT_YAML
  | typeof FILE_FORMAT_JSON
  | typeof FILE_FORMAT_HTML

export const VALIDATION_RULES_SEVERITY_LEVEL_ERROR = 'error'
export const VALIDATION_RULES_SEVERITY_LEVEL_WARNING = 'warning'

export type ValidationRulesSeverityLevel =
  | typeof VALIDATION_RULES_SEVERITY_LEVEL_ERROR
  | typeof VALIDATION_RULES_SEVERITY_LEVEL_WARNING

export interface ValidationRulesSeverity {
  brokenRefs: ValidationRulesSeverityLevel
}

// todo remove
export interface BuildConfig extends BuildConfigBase {
  packageId: PackageId
  version: VersionId // @revision for rebuild
  status: VersionStatus
  previousVersion?: VersionId
  previousVersionPackageId?: PackageId

  buildType: BuildType

  currentGroup?: string
  previousGroup?: string
  groupName?: string // for documentGroup buildType
  apiType?: OperationsApiType

  refs?: BuildConfigRef[]
  files?: BuildConfigFile[]

  metadata?: Record<string, unknown>
  format?: OperationsGroupExportFormat

  // todo since it goes straight to the info.json, remove it from every buildconfig except the one that is 'build'
  validationRulesSeverity?: ValidationRulesSeverity
  operationsSpecTransformation?: OperationsSpecTransformation
}

// todo rename
export interface BuildConfigBase {
// export interface BuildConfig {
  buildType: BuildType
}

export function isPublishBuildConfig(config: BuildConfigBase): config is PublishBuildConfig {
  return config.buildType === BUILD_TYPE.BUILD
}

export interface PublishBuildConfig extends BuildConfigBase {
  buildType: typeof BUILD_TYPE.BUILD
  version: VersionId // @revision for rebuild
  previousVersion?: VersionId
  previousVersionPackageId?: PackageId
  status: VersionStatus
  versionLabels?: string[]
  refs?: BuildConfigRef[]
  files?: BuildConfigFile[]

  metadata?: Record<string, unknown>
}

export interface ExportVersionBuildConfig extends BuildConfigBase {
  buildType: typeof BUILD_TYPE.EXPORT_VERSION
  packageId: PackageId
  version: VersionId // @revision for rebuild
  format: OperationsGroupExportFormat
  allowedOasExtensions?: OpenApiExtensionKey[]
}

export interface ExportRestDocumentBuildConfig extends BuildConfigBase {
  buildType: typeof BUILD_TYPE.EXPORT_REST_DOCUMENT
  packageId: PackageId
  version: VersionId // @revision for rebuild
  documentId: string
  // apiType?: OperationsApiType //todo Document transformation is available only for apiType = REST
  format: OperationsGroupExportFormat
  allowedOasExtensions?: OpenApiExtensionKey[]
}

export interface ExportRestOperationsGroupBuildConfig extends BuildConfigBase {
  buildType: typeof BUILD_TYPE.EXPORT_REST_OPERATIONS_GROUP
  packageId: PackageId
  version: VersionId // @revision for rebuild
  // apiType?: OperationsApiType //todo Document transformation is available only for apiType = REST
  groupName: string
  operationsSpecTransformation: OperationsSpecTransformation
  format: OperationsGroupExportFormat
  allowedOasExtensions?: OpenApiExtensionKey[]
}

// deprecated
export interface ReducedSourceSpecificationsBuildConfig extends BuildConfigBase {
  buildType: typeof BUILD_TYPE.REDUCED_SOURCE_SPECIFICATIONS
  packageId: PackageId
  version: VersionId // @revision for rebuild
  groupName: string
  format: OperationsGroupExportFormat
  apiType?: OperationsApiType
}

// deprecated
export interface MergedSpecificationBuildConfig extends BuildConfigBase {
  buildType: typeof BUILD_TYPE.MERGED_SPECIFICATION
  packageId: PackageId
  version: VersionId // @revision for rebuild
  groupName: string
  format: OperationsGroupExportFormat
  apiType?: OperationsApiType
}

// todo
export interface ChangelogBuildConfig extends BuildConfigBase {
  buildType: typeof BUILD_TYPE.CHANGELOG
  packageId: PackageId
  version: VersionId // @revision for rebuild
  status: VersionStatus
  previousVersion?: VersionId
  previousVersionPackageId?: PackageId

  format: OperationsGroupExportFormat
  apiType?: OperationsApiType
}
// todo
export interface PrefixGroupsChangelogBuildConfig extends BuildConfigBase {
  buildType: typeof BUILD_TYPE.PREFIX_GROUPS_CHANGELOG
  packageId: PackageId
  version: VersionId // @revision for rebuild
  status: VersionStatus
  previousVersion?: VersionId
  previousVersionPackageId?: PackageId
  currentGroup?: string
  previousGroup?: string

  format: OperationsGroupExportFormat
  apiType?: OperationsApiType
}

// todo rename
export type BuildConfigAggregator =
  | PublishBuildConfig
  | ExportVersionBuildConfig
  | ExportRestDocumentBuildConfig
  | ExportRestOperationsGroupBuildConfig
  | ReducedSourceSpecificationsBuildConfig
  | MergedSpecificationBuildConfig
  | ChangelogBuildConfig
  | PrefixGroupsChangelogBuildConfig

export const TRANSFORMATION_KIND_REDUCED = 'reducedSourceSpecifications'
export const TRANSFORMATION_KIND_MERGED = 'mergedSpecification'

export type OperationsSpecTransformation =
  | typeof TRANSFORMATION_KIND_REDUCED
  | typeof TRANSFORMATION_KIND_MERGED

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
