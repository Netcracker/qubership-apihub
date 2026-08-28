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
  ExportDocument,
  PackageConfig,
  PackageNotifications,
  PackageOperation,
  VersionDocument,
  ZippableDocument,
} from '../types'
import { unknownApiBuilder } from '../apitypes'
import { BUILD_TYPE, MESSAGE_SEVERITY, PACKAGE } from '../consts'
import { EXPORT_FORMAT_TO_FILE_FORMAT } from '../utils'
import { toDdlComparisonDto, toVersionsComparisonDto } from '../utils/transformToDto'
import { McpEntityIndex } from '../types/package/mcp'
import { DdlEntityIndex } from '../types/package/ddl'
import {
  buildComparisonInternalDocumentsIndex,
  buildComparisonOperations,
  buildComparisonsIndex,
  buildDdlComparisonEntities,
  buildDdlComparisonsIndex,
  buildDdlFile,
  buildMcpFile,
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
  const logError = (message: string): void => {
    ctx.notifications.push({
      severity: MESSAGE_SEVERITY.Error,
      message: message,
    })
  }
  const buildResultDto: BuildResultDto = {
    ...buildResult,
    comparisons: buildResult.comparisons.map(comparison => toVersionsComparisonDto(comparison, ctx.normalizedSpecFragmentsHashCache, logError)),
  }
  // comparison-internal documents are shared between operation and DDL comparisons (the merged REST docs
  // and merged Realms land in the same index/dir)
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

  createDocumentsFile(zip, documents)
  createVersionInternalDocumentsFile(zip, documents)

  await createDocumentDataFiles(zip, documents, ctx)
  await createVersionInternalDocumentDataFiles(zip, documents)

  await createInfoFile(zip, buildResultDto.config)

  createOperationsFile(zip, buildResultDto.operations)
  createSearchTextFiles(zip, buildResultDto.operations)
  const operationsDir = zip.folder(PACKAGE.OPERATIONS_DIR_NAME)!
  for (const { data, operationId } of buildResultDto.operations.values()) {
    if (!data) { continue }
    createOperationDataFile(operationsDir, operationId, data)
  }

  if (buildResultDto.mcpEntities.size) {
    createMcpFiles(zip, buildResultDto.mcpEntities)
  }

  if (buildResultDto.ddlEntities.size) {
    createDdlFiles(zip, buildResultDto.ddlEntities)
  }

  if (buildResultDto.comparisons.length) {
    zip.file(PACKAGE.COMPARISONS_FILE_NAME, buildComparisonsIndex(buildResultDto.comparisons))
    const comparisonsDir = zip.folder(PACKAGE.COMPARISONS_DIR_NAME)

    for (const comparison of buildResultDto.comparisons) {
      if (!comparison.comparisonFileId || !comparison.data) { continue }
      comparisonsDir!.file(comparison.comparisonFileId, buildComparisonOperations(comparison.data))
    }
  }

  // DDL comparisons go to their own sibling files (ddl-comparisons.json + ddl-comparisons/<id>),
  // leaving the operation comparisons untouched (AD2). The per-pair wrapper key is `entities` (C2).
  const ddlComparisonsDto = buildResult.ddlComparisons.map(comparison => toDdlComparisonDto(comparison, ctx.normalizedSpecFragmentsHashCache, logError))
  if (ddlComparisonsDto.length) {
    zip.file(PACKAGE.DDL_COMPARISONS_FILE_NAME, buildDdlComparisonsIndex(ddlComparisonsDto))
    const ddlComparisonsDir = zip.folder(PACKAGE.DDL_COMPARISONS_DIR_NAME)
    for (const comparison of ddlComparisonsDto) {
      if (!comparison.comparisonFileId || !comparison.data) { continue }
      ddlComparisonsDir!.file(comparison.comparisonFileId, buildDdlComparisonEntities(comparison.data))
    }
  }

  // shared comparison-internal documents (operation merged docs + DDL merged Realms)
  if (comparisonInternalDocuments.length) {
    createComparisonInternalDocumentsFile(zip, comparisonInternalDocuments)
    await createComparisonInternalDocumentDataFiles(zip, comparisonInternalDocuments)
  }

  createNotificationsFile(zip, { notifications: buildResultDto.notifications })

  return await zip.buildResult(options)
}

const createInfoFile = async (zip: ZipTool, config: PackageConfig): Promise<void> => {
  zip.file(PACKAGE.INFO_FILE_NAME, { ...config, builderVersion: version })
}

const createNotificationsFile = (zip: ZipTool, notifications: PackageNotifications): void => {
  zip.file(PACKAGE.NOTIFICATIONS_FILE_NAME, buildNotifications(notifications.notifications))
}

const createDocumentsFile = (zip: ZipTool, documents: VersionDocument[]): void => {
  zip.file(PACKAGE.DOCUMENTS_FILE_NAME, buildPackageDocuments(documents))
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
    const data = apiBuilder.dumpDocument(document, documentFormat)
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
