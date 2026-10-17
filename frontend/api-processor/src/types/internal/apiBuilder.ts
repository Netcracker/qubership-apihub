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
  ExportFormat,
  FileId,
  GroupDocumentsResolver,
  OperationId,
  OperationsApiType,
  PackageId,
  RawDocumentResolver,
  ResolvedOperation,
  ResolvedVersionDocument,
  TemplatePath,
  VersionDeprecatedResolver,
  VersionDocumentsResolver,
  VersionId,
} from '../external'
import { ComparisonDocument, OperationChanges } from './compare'
import { BuilderConfiguration, BuilderRunOptions, VersionCache } from './builder'
import { ExportDocument, VersionDocument, ZippableDocument } from './documents'
import { NotificationMessage } from '../package/notifications'
import { TEXT_API_TYPE, UNKNOWN_API_TYPE } from '../../apitypes'
import { SourceFile, TextFile } from './internal'
import { ApiOperation } from './operation'
import { McpEntity } from '../package/mcp'
import { DdlEntity, DdlEntityId } from '../package/ddl'
import { Diff } from '@netcracker/qubership-apihub-api-diff'
import { Realm } from '@netcracker/qubership-apihub-ddlapi'
import { ResolvedPackage } from '../external/package'
import {
  ASYNCAPI_API_TYPE,
  DDL_CONTRACT_TYPE,
  FILE_FORMAT_JSON,
  FILE_FORMAT_YAML,
  GRAPHQL_API_TYPE,
  MCP_CONTRACT_TYPE,
  REST_API_TYPE,
} from '../../consts'
import { OpenApiExtensionKey } from '@netcracker/qubership-apihub-api-unifier'
import { OperationsMap } from '../../components'
import { ObjectHashCache } from '../../utils/hashes'

export type BuilderType =
  | typeof REST_API_TYPE
  | typeof GRAPHQL_API_TYPE
  | typeof ASYNCAPI_API_TYPE
  | typeof TEXT_API_TYPE
  | typeof UNKNOWN_API_TYPE
  | typeof MCP_CONTRACT_TYPE
  | typeof DDL_CONTRACT_TYPE

export interface BuilderContext<T = any> {
  apiBuilders: ApiBuilder<T>[]
  operationResolver: _OperationResolver
  versionDeprecatedResolver: VersionDeprecatedResolver
  basePath: string
  parsedFileResolver: _ParsedFileResolver
  templateResolver: _TemplateResolver
  packageResolver: _PackageResolver
  readonly notifications: NotificationMessage[]
  config: BuildConfig
  builderRunOptions: BuilderRunOptions
  configuration?: BuilderConfiguration
  versionDocumentsResolver: VersionDocumentsResolver
  groupDocumentsResolver: GroupDocumentsResolver
  groupExportTemplateResolver?: GroupExportTemplateResolver
  rawDocumentResolver: _RawDocumentResolver
  versionLabels?: Array<string>
  normalizedSpecFragmentsHashCache: ObjectHashCache
}

export type GroupExportTemplateResolver = (
  apiType: OperationsApiType,
  version: VersionId,
  packageId: PackageId,
  filterByOperationGroup: string,
) => Promise<string>

export type _RawDocumentResolver = (
  version: VersionId,
  packageId: PackageId,
  slug: string,
) => Promise<File>

export interface CompareOperationsPairContext {
  apiType: OperationsApiType
  readonly notifications: NotificationMessage[]
  rawDocumentResolver: RawDocumentResolver
  versionDeprecatedResolver: VersionDeprecatedResolver
  versionDocumentsResolver: VersionDocumentsResolver
  previousVersion: VersionId
  currentVersion: VersionId
  previousPackageId: PackageId
  currentPackageId: PackageId
  currentGroup?: string
  previousGroup?: string
  currentGroupSlug: string
  previousGroupSlug: string
  normalizedSpecFragmentsHashCache: ObjectHashCache
}

export type NormalizedOperationId = string

export type FileParser = (fileId: string, data: Blob) => Promise<SourceFile | undefined>
export type DocumentBuilder<T> = (parsedFile: TextFile<T>, file: BuildConfigFile, ctx: BuilderContext<T>) => Promise<VersionDocument<T>>
export type OperationsBuilder<T, M = any> = (document: VersionDocument<T>, ctx: BuilderContext<T>) => Promise<ApiOperation<M>[]>
export type DocumentDumper<T> = (document: ZippableDocument<T>, format?: typeof FILE_FORMAT_YAML | typeof FILE_FORMAT_JSON) => Blob
export type McpEntitiesBuilder<T> =
  (document: VersionDocument<T>, file: BuildConfigFile, notifications?: NotificationMessage[]) => McpEntity[]
export type DdlEntitiesBuilder<T> =
  (document: VersionDocument<T>, file: BuildConfigFile, notifications?: NotificationMessage[]) => DdlEntity[]
export type OperationDataCompare<T> = (current: T, previous: T, ctx: CompareOperationsPairContext) => Promise<Diff[]>
export type DocumentsCompareData = {
  operationChanges: OperationChanges[]
  tags: Set<string>
  comparisonDocument?: ComparisonDocument
}
export type DocumentsCompare = (operationsMap: OperationsMap, currDoc: ResolvedVersionDocument | undefined, prevDoc: ResolvedVersionDocument | undefined, ctx: CompareOperationsPairContext) => Promise<DocumentsCompareData>
export type OperationIdNormalizer = (operation: ResolvedOperation) => NormalizedOperationId
export type DocumentExporter = (
  filename: string,
  data: string,
  format: ExportFormat,
  packageName: string,
  version: string,
  templateResolver: _TemplateResolver,
  allowedOasExtensions?: OpenApiExtensionKey[],
  generatedHtmlExportDocuments?: ExportDocument[],
  addBackLink?: boolean,
) => Promise<ExportDocument>

// ---- DDL per-document-pair compare hook ----
// `compareVersionsDdl` (Task 9) owns resolution + ddlEntityId pairing (incl. cross-file moves) and
// calls this once per resolved Realm pair. A one-sided pair (whole .sql added/removed) passes
// `undefined` on the missing side; the hook builds the empty counterpart internally (analog of REST's
// createCopyWithEmptyPathItems). The hook runs apiDiff, walks the merged Realm, and fans shared-type
// diffs out to every referencing table (D2).
export interface DdlComparePairContext {
  previousVersion: VersionId
  currentVersion: VersionId
  previousPackageId: PackageId
  currentPackageId: PackageId
  readonly notifications: NotificationMessage[]
  normalizedSpecFragmentsHashCache: ObjectHashCache
}

export interface DdlDiffResult {
  changesByEntityId: Map<DdlEntityId, Diff[]> // a shared-type diff appears under each referencing id (D2)
  mergedRealm: Realm // serialized to the comparison-internal doc, REST merged form (D5)
}

export type DdlDocumentsCompare = (
  prevRealm: Realm | undefined,
  currRealm: Realm | undefined,
  ctx: DdlComparePairContext,
) => DdlDiffResult

export interface ApiBuilder<T = any, O = any, M = any> {
  apiType: BuilderType
  types: string[]
  parser: FileParser
  buildDocument: DocumentBuilder<T>
  dumpDocument: DocumentDumper<T>
  buildOperations?: OperationsBuilder<T, M>
  buildMcpEntities?: McpEntitiesBuilder<T>
  buildDdlEntities?: DdlEntitiesBuilder<T>
  compareOperationsData?: OperationDataCompare<O>
  compareDocuments?: DocumentsCompare
  compareDdlDocuments?: DdlDocumentsCompare
  createNormalizedOperationId?: OperationIdNormalizer
  createExportDocument?: DocumentExporter
}

// internal
export type _PackageResolver = (packageId: PackageId) => Promise<ResolvedPackage>
export type _VersionResolver = (packageId: PackageId, version: VersionId) => Promise<VersionCache | null>
export type _VersionReferencesResolver = (packageId: PackageId, version: VersionId) => Promise<BuildConfigRef[]>

export type _ParsedFileResolver = (fileId: FileId) => Promise<SourceFile | null>
export type _TemplateResolver = (templatePath: TemplatePath) => Promise<Blob>
export type _OperationResolver = (apiType: string, operationId: OperationId) => ResolvedOperation | null
