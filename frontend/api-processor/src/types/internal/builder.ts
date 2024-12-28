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

import { BuildConfig, BuilderResolvers, FileId, PackageId, ResolvedVersion, VersionId } from '../external'
import { VersionsComparisonDto } from './compare'
import { PackageConfig } from '../package/config'
import { NotificationMessage } from '../package/notifications'
import { VersionDocument } from './documents'
import { File } from './internal'
import { ApiOperation } from './operation'

export type VersionCache = ResolvedVersion & {
  packageId: PackageId
  version: VersionId
}

export interface BuildResult {
  config: PackageConfig
  comparisons: VersionsComparisonDto[]
  notifications: NotificationMessage[]
  documents: Map<string, VersionDocument>
  operations: Map<string, ApiOperation>
  merged?: VersionDocument
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

  readonly parsedFiles: Map<FileId, File>
  readonly versionsCache: Map<string, VersionCache>

  run: (options?: BuilderRunOptions) => Promise<BuildResult>
  update: (config: BuildConfig, changedFiles?: FileId[], options?: BuilderRunOptions) => Promise<BuildResult>
}

export type FileSourceMap = Record<string, Blob>

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
}>

export interface BuildFileResult<T = any> {
  document: VersionDocument<T>
  operations?: ApiOperation[]
}


