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

import {
  BuildConfig,
  BuildConfigFile,
  BuilderResolvers,
  FileId,
  PackageId,
  ResolvedVersion,
  VersionId,
} from '../external'
import { DdlComparison, VersionsComparison, VersionsComparisonDto } from './compare'
import { PackageConfig } from '../package/config'
import { NotificationMessage } from '../package/notifications'
import { ExportDocument, VersionDocument } from './documents'
import { SourceFile } from './internal'
import { ApiOperation } from './operation'
import { ApiBuilder } from './apiBuilder'
import { McpEntityIndex } from '../package/mcp'
import { DdlEntityIndex } from '../package/ddl'

export type VersionCache = ResolvedVersion & {
  packageId: PackageId
  version: VersionId
}

export interface BuildResultDto {
  config: PackageConfig
  comparisons: VersionsComparisonDto[]
  ddlComparisons: DdlComparison[]
  notifications: NotificationMessage[]
  comparisonNotifications: NotificationMessage[]
  documents: Map<string, VersionDocument>
  exportDocuments: ExportDocument[]
  /** Keyed by `operationKey({ apiType, operationId })`: an operationId is unique only within an api type. */
  operations: Map<string, ApiOperation>
  merged?: VersionDocument
  mcpEntities: McpEntityIndex
  ddlEntities: DdlEntityIndex
}

export interface BuildResult {
  config: PackageConfig
  comparisons: VersionsComparison[]
  notifications: NotificationMessage[]
  comparisonNotifications: NotificationMessage[]
  documents: Map<string, VersionDocument>
  exportDocuments: ExportDocument[]
  exportFileName?: string
  /** Keyed by `operationKey({ apiType, operationId })`: an operationId is unique only within an api type. */
  operations: Map<string, ApiOperation>
  merged?: VersionDocument
  mcpEntities: McpEntityIndex
  ddlEntities: DdlEntityIndex
  ddlComparisons: DdlComparison[]
}

export type BuilderConfiguration = {
  batchSize?: number
  bundleComponents?: boolean
}

export interface BuilderParams {
  resolvers: BuilderResolvers
  configuration?: BuilderConfiguration
}

export interface IPackageVersionBuilder {
  readonly config: BuildConfig
  readonly params: BuilderParams

  readonly parsedFiles: Map<FileId, SourceFile>
  readonly versionsCache: Map<string, VersionCache>

  run: (options?: BuilderRunOptions) => Promise<BuildResult>
  //TODO: remove update method, since it is not used in production code after Editor was removed
  update: (config: BuildConfig, changedFiles?: FileId[], options?: BuilderRunOptions) => Promise<BuildResult>
}

export type FileSourceMap = Record<string, Blob>

export const VERSION_VALIDATION_LEVEL = {
  STRICT: 'strict',
  MAJOR: 'major',
} as const

export type VersionValidationLevel = typeof VERSION_VALIDATION_LEVEL[keyof typeof VERSION_VALIDATION_LEVEL]

/**
 * @param {boolean} [withChangelog=true] - Generate changelog flag.
 * @param {boolean} [withBwc=true] - Check backward compatibility flag.
 * @param {boolean} [cleanCache=false] - Wipe cache before start.
 * @param {FileSourceMap} [fileSources=false] - Set initial version file content for builder.
 */
export type BuilderRunOptions = Partial<{
  withoutChangelog: boolean
  withoutBwc: boolean
  withoutDeprecatedDepth: boolean
  cleanCache: boolean
  apiProcessorVersionValidationLevel: VersionValidationLevel
}>

export interface BuildFileResult<T = any> {
  file: BuildConfigFile
  document: VersionDocument<T>
  builder?: ApiBuilder
  // the document's own source file, kept because `buildFiles` reports its parse problems only once
  // `publish` is settled
  parsedFile?: SourceFile
}


