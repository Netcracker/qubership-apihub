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

import JSZip from 'jszip'
import { version } from '../../package.json'

import {
  ApiOperation,
  BuilderContext,
  BuildResult,
  BuildResultDto,
  ComparisonInternalDocument,
  DdlComparison,
  ExportDocument,
  NotificationMessage,
  PackageConfig,
  PackageNotifications,
  PackageOperation,
  VersionDocument,
  VersionsComparison,
  ZippableDocument,
} from '../types'
import { unknownApiBuilder } from '../apitypes'
import { BUILD_TYPE, MESSAGE_CATEGORY, MESSAGE_SEVERITY, PACKAGE } from '../consts'
import { ComparisonErrorSource, comparisonHasErrors, EXPORT_FORMAT_TO_FILE_FORMAT, getSplittedVersionKey } from '../utils'
import { toDdlComparisonDto, toVersionsComparisonDto } from '../utils/transformToDto'
import { assertReleaseIsPublishable, comparisonPhaseNotifications, toNotificationsError } from './release-gate'
import { dumpDocument } from './document'
import { erroredDocumentSlugs } from './errored-documents'
import { McpEntityIndex } from '../types/package/mcp'
import { DdlEntityIndex } from '../types/package/ddl'
import {
  buildCachedComparisons,
  buildComparisonInternalDocumentsIndex,
  buildComparisonOperations,
  buildComparisonsIndex,
  buildDdlComparisonEntities,
  buildDdlComparisonsIndex,
  buildDdlFile,
  buildMcpFile,
  buildComparisonNotifications,
  DeclaredPair,
  buildNotifications,
  buildPackageDocuments,
  buildPackageOperations,
  buildVersionInternalDocumentsIndex,
  takeComparisonInternalDocumentEntry,
  takeVersionInternalDocumentEntry,
} from './build-result-index'

export interface ZipTool {
  // todo method should only accept Blob content, transformation is not a responsibility of this method
  file: (name: string, content: object | string | Blob) => Promise<void>
  folder: (name: string) => ZipTool
  buildResult: (options?: JSZip.JSZipGeneratorOptions) => Promise<any>
}

export const createVersionPackage = async (
  buildResult: BuildResult,
  zip: ZipTool,
  ctx: BuilderContext,
  options?: JSZip.JSZipGeneratorOptions,
): Promise<any> => {
  try {
    return await writeVersionPackage(buildResult, zip, ctx, options)
  } catch (error) {
    // only a `build` or `changelog` failure carries its notifications; other build types throw the plain error
    const buildType = ctx.config.buildType ?? BUILD_TYPE.BUILD
    if (buildType !== BUILD_TYPE.BUILD && buildType !== BUILD_TYPE.CHANGELOG) { throw error }
    // for a changelog `buildResult.notifications` is empty: it builds no documents
    throw toNotificationsError(error, buildResult.notifications, [comparisonPhaseNotifications(buildResult)])
  }
}

const writeVersionPackage = async (
  buildResult: BuildResult,
  zip: ZipTool,
  ctx: BuilderContext,
  options?: JSZip.JSZipGeneratorOptions,
): Promise<any> => {
  // a malformed diff belongs to the comparison being serialized, so the closure is per comparison; it is a
  // Warning because api-diff produced the diff and the publisher has nothing to fix in their documents
  const reportProblemFor = (notifications: NotificationMessage[]) => (message: string): void => {
    notifications.push({
      category: MESSAGE_CATEGORY.ComparisonSerialization,
      severity: MESSAGE_SEVERITY.Warning,
      message: message,
    })
  }
  const buildResultDto: BuildResultDto = {
    ...buildResult,
    comparisons: buildResult.comparisons.map(comparison =>
      withComparisonErrors(toVersionsComparisonDto(comparison, ctx.normalizedSpecFragmentsHashCache, reportProblemFor(comparison.notifications)), comparison)),
  }
  // merged REST documents and merged Realms share one index and one directory, so both kinds are collected
  const comparisonInternalDocuments: ComparisonInternalDocument[] = [
    ...buildResult.comparisons.flatMap(comparison => comparison.comparisonInternalDocuments),
    ...buildResult.ddlComparisons.flatMap(comparison => comparison.comparisonInternalDocuments),
  ]

  const documents = buildResultDto.merged ? [buildResultDto.merged] : [...buildResultDto.documents.values()]

  switch (buildResult.config.buildType) {
    case BUILD_TYPE.EXPORT_VERSION:
    case BUILD_TYPE.EXPORT_REST_DOCUMENT:
    case BUILD_TYPE.EXPORT_GRAPHQL_OPERATIONS_GROUP:
    case BUILD_TYPE.EXPORT_ASYNC_API_OPERATIONS_GROUP:
    case BUILD_TYPE.EXPORT_REST_OPERATIONS_GROUP:
      if (buildResult.exportDocuments.length === 1) {
        return Buffer.from(await buildResultDto.exportDocuments[0].data.arrayBuffer())
      }
      await createExportDocumentDataFiles(zip, buildResultDto.exportDocuments)
      return await zip.buildResult(options)
  }

  // A changelog recalculates the changes of a version that is already published: it produces no documents of
  // its own and its `info.json` describes a comparison. It therefore carries neither the `hasErrors` flags nor
  // the version's own content — an empty `documents.json` or `operations.json` would describe the published
  // version as having none. Every other build type here publishes documents.
  const buildType = ctx.config.buildType ?? BUILD_TYPE.BUILD
  const publishesDocuments = buildType !== BUILD_TYPE.CHANGELOG && buildType !== BUILD_TYPE.PREFIX_GROUPS_CHANGELOG

  await createInfoFile(zip, buildResultDto.config, publishesDocuments && hasBuildError(buildResultDto.notifications))

  if (publishesDocuments) {
    createDocumentsFile(zip, documents, erroredDocumentSlugs(buildResultDto.notifications))
    createVersionInternalDocumentsFile(zip, documents)

    await createDocumentDataFiles(zip, documents, ctx)
    await createVersionInternalDocumentDataFiles(zip, documents)

    createOperationsFile(zip, buildResultDto.operations)
    createSearchTextFiles(zip, buildResultDto.operations)
    const operationsDir = zip.folder(PACKAGE.OPERATIONS_DIR_NAME)!
    for (const { data, operationId } of buildResultDto.operations.values()) {
      if (!data) { continue }
      createOperationDataFile(operationsDir, operationId, data)
    }
  }

  if (buildResultDto.mcpEntities.size) {
    createMcpFiles(zip, buildResultDto.mcpEntities)
  }

  if (buildResultDto.ddlEntities.size) {
    createDdlFiles(zip, buildResultDto.ddlEntities)
  }

  if (buildResultDto.comparisons.length) {
    zip.file(PACKAGE.COMPARISONS_FILE_NAME, buildComparisonsIndex(buildResultDto.comparisons))
    zip.file(
      PACKAGE.CACHED_COMPARISONS_FILE_NAME,
      buildCachedComparisons([...buildResult.comparisons, ...buildResult.ddlComparisons]),
    )
    const comparisonsDir = zip.folder(PACKAGE.COMPARISONS_DIR_NAME)

    for (const comparison of buildResultDto.comparisons) {
      if (!comparison.comparisonFileId || !comparison.data) { continue }
      comparisonsDir!.file(comparison.comparisonFileId, buildComparisonOperations(comparison.data))
    }
  }

  // DDL comparisons ship as siblings, leaving the operation comparisons untouched (AD2).
  const ddlComparisonsDto = buildResult.ddlComparisons.map(comparison =>
    withComparisonErrors(toDdlComparisonDto(comparison, ctx.normalizedSpecFragmentsHashCache, reportProblemFor(comparison.notifications)), comparison))
  if (ddlComparisonsDto.length) {
    zip.file(PACKAGE.DDL_COMPARISONS_FILE_NAME, buildDdlComparisonsIndex(ddlComparisonsDto))
    const ddlComparisonsDir = zip.folder(PACKAGE.DDL_COMPARISONS_DIR_NAME)
    for (const comparison of ddlComparisonsDto) {
      if (!comparison.comparisonFileId || !comparison.data) { continue }
      ddlComparisonsDir!.file(comparison.comparisonFileId, buildDdlComparisonEntities(comparison.data))
    }
  }

  if (comparisonInternalDocuments.length) {
    createComparisonInternalDocumentsFile(zip, comparisonInternalDocuments)
    await createComparisonInternalDocumentDataFiles(zip, comparisonInternalDocuments)
  }

  // build stream only where documents are published — see `publishesDocuments`
  if (publishesDocuments) { createNotificationsFile(zip, { notifications: buildResultDto.notifications }) }
  // built from the pair arrays themselves, not from the DTOs — the DTOs deliberately drop `notifications`
  createComparisonNotificationsFile(zip, [...buildResult.comparisons, ...buildResult.ddlComparisons], buildResult)

  // `BuildStrategy` gates before the archive is written, so a message raised while writing it arrives too late
  // for that check. Nothing raised here is an `Error` today; without this call, the first one would let a
  // release ship with `hasErrors` on the comparison.
  if (buildType === BUILD_TYPE.BUILD) {
    assertReleaseIsPublishable(ctx.config.status, [], comparisonPhaseNotifications(buildResult))
  }

  return await zip.buildResult(options)
}

const createInfoFile = async (zip: ZipTool, config: PackageConfig, hasErrors: boolean): Promise<void> => {
  // info.json echoes the config, so anything derived has to be added by hand
  zip.file(PACKAGE.INFO_FILE_NAME, { ...config, builderVersion: version, ...hasErrors ? { hasErrors } : {} })
}

// any build-phase Error makes the version errored, attributed to a document or not
const hasBuildError = (notifications: NotificationMessage[]): boolean =>
  notifications.some(({ severity }) => severity === MESSAGE_SEVERITY.Error)

const createNotificationsFile = (zip: ZipTool, notifications: PackageNotifications): void => {
  zip.file(PACKAGE.NOTIFICATIONS_FILE_NAME, buildNotifications(notifications.notifications))
}

/**
 * Stamp `hasErrors` on the DTO; `comparisonHasErrors` owns the cached-vs-calculated rule.
 *
 * The rule reads `fromCache` off the comparison, not off the DTO — the DTO no longer carries it.
 */
const withComparisonErrors = <T extends { hasErrors?: boolean }>(
  dto: T,
  source: ComparisonErrorSource,
): T => (comparisonHasErrors(source) ? { ...dto, hasErrors: true } : dto)

/**
 * Write `comparison-notifications.json`, or nothing when the build neither calculated a comparison nor
 * raised a comparison-phase message.
 */
const createComparisonNotificationsFile = (
  zip: ZipTool,
  comparisons: Array<VersionsComparison | DdlComparison>,
  buildResult: BuildResult,
): void => {
  // a comparison the host answered for is omitted by `buildComparisonNotifications`, so counting the input
  // would ship `{"comparisons": []}` — the empty list a consumer would replace this version's rows with
  const calculated = comparisons.filter(({ fromCache }) => !fromCache)
  if (!calculated.length && !buildResult.comparisonNotifications.length) { return }

  const { packageId, version, previousVersionPackageId, previousVersion } = buildResult.config
  // `version` can carry a revision (`v2@3`), and a calculated comparison keeps the two apart. The declared
  // pair splits them the same way, or its row names a pair no comparison matches.
  const [versionKey, revision] = getSplittedVersionKey(version)
  const [previousVersionKey, previousVersionRevision] = getSplittedVersionKey(previousVersion)
  const declaredPair: DeclaredPair = {
    packageId,
    version: versionKey,
    revision,
    previousVersionPackageId: previousVersionPackageId || packageId,
    previousVersion: previousVersionKey,
    previousVersionRevision,
    notifications: buildResult.comparisonNotifications,
  }
  zip.file(PACKAGE.COMPARISON_NOTIFICATIONS_FILE_NAME, buildComparisonNotifications(comparisons, declaredPair))
}

const createDocumentsFile = (zip: ZipTool, documents: VersionDocument[], erroredSlugs: ReadonlySet<string>): void => {
  zip.file(PACKAGE.DOCUMENTS_FILE_NAME, buildPackageDocuments(documents, erroredSlugs))
}

const createVersionInternalDocumentDataFiles = async (zip: ZipTool, documents: VersionDocument[]): Promise<void> => {
  const documentsDir = zip.folder(PACKAGE.VERSION_INTERNAL_DOCUMENTS_DIR_NAME)
  await writeVersionInternalDocumentsToZip(documentsDir, documents)
}

const createVersionInternalDocumentsFile = (zip: ZipTool, documents: VersionDocument[]): void => {
  zip.file(PACKAGE.VERSION_INTERNAL_FILE_NAME, buildVersionInternalDocumentsIndex(documents))
}

const createComparisonInternalDocumentDataFiles = async (zip: ZipTool, comparisonDocument: ComparisonInternalDocument[]): Promise<void> => {
  const comparisonsDir = zip.folder(PACKAGE.COMPARISON_INTERNAL_DOCUMENTS_DIR_NAME)
  await writeComparisonInternalDocumentsToZip(comparisonsDir, comparisonDocument)
}

const createComparisonInternalDocumentsFile = (zip: ZipTool, comparisonDocument: ComparisonInternalDocument[]): void => {
  const result = buildComparisonInternalDocumentsIndex(comparisonDocument)
  if (!result.documents.length) {
    return
  }
  zip.file(PACKAGE.COMPARISON_INTERNAL_FILE_NAME, result)
}

const writeDocumentsToZip = async (zip: ZipTool, documents: ZippableDocument[], ctx: BuilderContext): Promise<void> => {
  const { apiBuilders, config: { format } } = ctx

  for (const document of documents) {
    // skip components
    if (!document.publish) { continue }

    const apiBuilder =
      apiBuilders.find(({ types }) => types.includes(document.type)) || unknownApiBuilder
    const documentFormat = EXPORT_FORMAT_TO_FILE_FORMAT.get(format!)
    const data = dumpDocument(document, apiBuilder, documentFormat)
    await zip.file(document.filename, data)
  }
}

// Both writers share their filter with the matching index builder (take*InternalDocumentEntry), so a
// document is either in the index AND on disk, or in neither.
const writeVersionInternalDocumentsToZip = async (zip: ZipTool, documents: VersionDocument[]): Promise<void> => {
  for (const document of documents) {
    const entry = takeVersionInternalDocumentEntry(document)
    if (entry) { await zip.file(entry.filename, entry.content) }
  }
}

const writeComparisonInternalDocumentsToZip = async (zip: ZipTool, comparisonDocument: ComparisonInternalDocument[]): Promise<void> => {
  for (const document of comparisonDocument) {
    const entry = takeComparisonInternalDocumentEntry(document)
    if (entry) { await zip.file(entry.filename, entry.content) }
  }
}

const createDocumentDataFiles = async (zip: ZipTool, documents: VersionDocument[], ctx: BuilderContext): Promise<void> => {
  const documentsDir = zip.folder(PACKAGE.DOCUMENTS_DIR_NAME)
  await writeDocumentsToZip(documentsDir, documents, ctx)
}

const createExportDocumentDataFiles = async (zip: ZipTool, documents: ExportDocument[]): Promise<void> => {
  for (const document of documents) {
    await zip.file(document.filename, document.data)
  }
}

const createOperationsFile = (zip: ZipTool, operations: Map<string, ApiOperation>): void => {
  zip.file(PACKAGE.OPERATIONS_FILE_NAME, buildPackageOperations(operations))
}

const createSearchTextFiles = (zip: ZipTool, operations: Map<string, ApiOperation>): void => {
  for (const operation of operations.values()) {
    if (operation.searchText && operation.search.searchTextFilePath) {
      zip.file(operation.search.searchTextFilePath, operation.searchText)
    }
  }
}

const createOperationDataFile = (zipFolder: ZipTool, operationId: string, operation: PackageOperation): void => {
  zipFolder.file(operationId, operation)
}

const createMcpFiles = (zip: ZipTool, mcpEntities: McpEntityIndex): void => {
  zip.file(PACKAGE.MCP_FILE_NAME, buildMcpFile(mcpEntities))
  const mcpDir = zip.folder(PACKAGE.MCP_DIR_NAME)
  for (const entity of mcpEntities.values()) {
    mcpDir.file(entity.mcpEntityId, entity.data)
  }
}

const createDdlFiles = (zip: ZipTool, ddlEntities: DdlEntityIndex): void => {
  zip.file(PACKAGE.DDL_FILE_NAME, buildDdlFile(ddlEntities))
  const ddlDir = zip.folder(PACKAGE.DDL_DIR_NAME)
  for (const entity of ddlEntities.values()) {
    // per-entity SQL, named by ddlEntityId, no extension (as operations/ and mcp/)
    ddlDir.file(entity.ddlEntityId, entity.data)
  }
}
