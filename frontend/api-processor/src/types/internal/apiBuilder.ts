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
  BuildConfigRef,
  OperationsApiType,
  OperationsGroupExportFormat,
  PackageId,
  ResolvedOperation,
  VersionDeprecatedResolver,
  VersionDocumentsResolver,
  VersionId,
} from '../external'
import { CompareContext, OperationChanges } from './compare'
import { BuilderConfiguration, BuilderRunOptions, VersionCache } from './builder'
import { VersionDocument } from './documents'
import { NotificationMessage } from '../package/notifications'
import { RestOperationData } from '../../apitypes/rest/rest.types'
import { GRAPHQL_API_TYPE, REST_API_TYPE, TEXT_API_TYPE, UNKNOWN_API_TYPE } from '../../apitypes'
import { ChangeMessage } from '../package'
import { File, TextFile } from './internal'
import { ApiOperation } from './operation'
import { Diff } from '@netcracker/qubership-apihub-api-diff'
import { DebugPerformanceContext } from '../../utils/logs'

export type BuilderType =
  | typeof REST_API_TYPE
  | typeof GRAPHQL_API_TYPE
  | typeof TEXT_API_TYPE
  | typeof UNKNOWN_API_TYPE

export interface BuilderContext<T = any> {
  apiBuilders: ApiBuilder<T>[]
  operationResolver: _OperationResolver
  versionDeprecatedResolver: VersionDeprecatedResolver
  basePath: string
  parsedFileResolver: _ParsedFileResolver
  notifications: NotificationMessage[]
  config: BuildConfig
  builderRunOptions: BuilderRunOptions
  configuration?: BuilderConfiguration
  versionDocumentsResolver: VersionDocumentsResolver
  templateResolver?: TemplateResolver
  versionLabels?: Array<string>
}

export type TemplateResolver = (
  apiType: OperationsApiType,
  version: VersionId,
  packageId: PackageId,
  filterByOperationGroup: string,
) => Promise<string>

export interface CompareOperationsPairContext {
  notifications: NotificationMessage[]
  versionDeprecatedResolver: VersionDeprecatedResolver
  previousVersion: VersionId
  currentVersion: VersionId
  previousPackageId: PackageId
  currentPackageId: PackageId
}

export type NormalizedOperationId = string

export type FileParser = (fileId: string, data: Blob) => Promise<File | undefined>
export type DocumentBuilder<T> = (parsedFile: TextFile, file: BuildConfigFile, ctx: BuilderContext<T>) => Promise<VersionDocument<T>>
export type OperationsBuilder<T, M = any> = (document: VersionDocument<T>, ctx: BuilderContext<T>, debugCtx?: DebugPerformanceContext) => Promise<ApiOperation<M>[]>
export type DocumentDumper<T> = (document: VersionDocument<T>, format?: OperationsGroupExportFormat) => Blob
export type OperationDataCompare<T> = (current: T, previous: T, ctx: CompareOperationsPairContext) => Promise<Diff[]>
export type OperationChangesValidator = (
  changes: ChangeMessage, // + ctx with internal resolvers
  previousOperation?: RestOperationData, // TODO remove
  prePreviousOperation?: RestOperationData, // TODO remove
) => boolean
export type OperationIdNormalizer = (operation: ResolvedOperation) => NormalizedOperationId
export type BreakingChangeReclassifier = (changes: OperationChanges[], previousVersion: string, previousPackageId: string, ctx: CompareContext) => Promise<void>

export interface ApiBuilder<T = any, O = any, M = any> {
  apiType: BuilderType
  types: string[]
  parser: FileParser
  buildDocument: DocumentBuilder<T>
  dumpDocument: DocumentDumper<T>
  buildOperations?: OperationsBuilder<T, M>
  compareOperationsData?: OperationDataCompare<O>
  validateOperationChanges?: OperationChangesValidator
  createNormalizedOperationId?: OperationIdNormalizer
}

// internal
export type _VersionResolver = (packageId: PackageId, version: VersionId) => Promise<VersionCache | null>
export type _VersionReferencesResolver = (packageId: PackageId, version: VersionId) => Promise<BuildConfigRef[]>

export type _ParsedFileResolver = (fileId: string) => Promise<File | null>
export type _OperationResolver = (operationId: string) => ResolvedOperation | null
