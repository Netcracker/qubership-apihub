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
  ComparisonInternalDocumentMetadata,
  ExportDocument,
  InternalDocumentMetadata,
  PackageComparison,
  PackageComparisonOperations,
  PackageComparisons,
  PackageConfig,
  PackageDocuments,
  PackageNotifications,
  PackageOperation,
  PackageOperations,
  VersionDocument,
  ZippableDocument,
} from '../types'
import { unknownApiBuilder } from '../apitypes'
import { BUILD_TYPE, FILE_FORMAT_JSON, MESSAGE_SEVERITY, PACKAGE } from '../consts'
import { EXPORT_FORMAT_TO_FILE_FORMAT, takeIf, toPackageDocument } from '../utils'
import { toVersionsComparisonDto } from '../utils/transformToDto'

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
  const comparisonInternalDocuments: ComparisonInternalDocument[] = buildResult.comparisons.map(comparison => comparison.comparisonInternalDocuments).flat()

  const documents = buildResultDto.merged ? [buildResultDto.merged] : [...buildResultDto.documents.values()]

  switch (buildResult.config.buildType) {
    case BUILD_TYPE.EXPORT_VERSION:
    case BUILD_TYPE.EXPORT_REST_DOCUMENT:
    case BUILD_TYPE.EXPORT_GRAPHQL_OPERATIONS_GROUP:
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
  const operationsDir = zip.folder(PACKAGE.OPERATIONS_DIR_NAME)!
  for (const { data, operationId } of buildResultDto.operations.values()) {
    if (!data) { continue }
    createOperationDataFile(operationsDir, operationId, data)
  }

  if (buildResultDto.comparisons.length) {
    const comparisons: PackageComparison[] = buildResultDto.comparisons.map(({ data, ...rest }) => rest)
    createComparisonsFile(zip, { comparisons })
    const comparisonsDir = zip.folder(PACKAGE.COMPARISONS_DIR_NAME)

    for (const comparison of buildResultDto.comparisons) {
      if (!comparison.comparisonFileId || !comparison.data) { continue }
      createComparisonDataFile(comparisonsDir!, comparison.comparisonFileId, { operations: comparison.data })
    }
    if (comparisonInternalDocuments.length) {
      createComparisonInternalDocumentsFile(zip, comparisonInternalDocuments)
      await createComparisonInternalDocumentDataFiles(zip, comparisonInternalDocuments)
    }
  }

  createNotificationsFile(zip, { notifications: buildResultDto.notifications })

  return await zip.buildResult(options)
}

const createInfoFile = async (zip: ZipTool, config: PackageConfig): Promise<void> => {
  zip.file(PACKAGE.INFO_FILE_NAME, { ...config, builderVersion: version })
}

const createNotificationsFile = (zip: ZipTool, notifications: PackageNotifications): void => {
  zip.file(PACKAGE.NOTIFICATIONS_FILE_NAME, notifications)
}

const createDocumentsFile = (zip: ZipTool, documents: VersionDocument[]): void => {
  const result: PackageDocuments = { documents: [] }

  for (const document of documents) {
    if (!document.publish) { continue }

    result.documents.push(toPackageDocument(document))
  }

  zip.file(PACKAGE.DOCUMENTS_FILE_NAME, result)
}

const createVersionInternalDocumentDataFiles = async (zip: ZipTool, documents: VersionDocument[]): Promise<void> => {
  const documentsDir = zip.folder(PACKAGE.VERSION_INTERNAL_DOCUMENTS_DIR_NAME)
  await writeVersionInternalDocumentsToZip(documentsDir, documents)
}

const createVersionInternalDocumentsFile = (zip: ZipTool, documents: VersionDocument[]): void => {
  const result: { documents: InternalDocumentMetadata[] } = { documents: [] }

  for (const document of documents.values()) {
    const { publish, versionInternalDocument } = document
    if (!versionInternalDocument) { continue }
    const { versionDocumentId: versionInternalDocumentId, serializedVersionDocument } = versionInternalDocument
    if (!publish || !versionInternalDocumentId || !serializedVersionDocument) { continue }
    result.documents.push({
      id: versionInternalDocumentId,
      filename: `${versionInternalDocumentId}.${FILE_FORMAT_JSON}`,
    })
  }

  zip.file(PACKAGE.VERSION_INTERNAL_FILE_NAME, result)
}

const createComparisonInternalDocumentDataFiles = async (zip: ZipTool, comparisonDocument: ComparisonInternalDocument[]): Promise<void> => {
  const comparisonsDir = zip.folder(PACKAGE.COMPARISON_INTERNAL_DOCUMENTS_DIR_NAME)
  await writeComparisonInternalDocumentsToZip(comparisonsDir, comparisonDocument)
}

const createComparisonInternalDocumentsFile = (zip: ZipTool, comparisonDocument: ComparisonInternalDocument[]): void => {
  const result: { documents: ComparisonInternalDocumentMetadata[] } = { documents: [] }
  for (const comparisonInternalDocument of comparisonDocument) {
    if (!comparisonInternalDocument) {
      continue
    }
    const { comparisonDocumentId: comparisonInternalDocumentId, comparisonFileId } = comparisonInternalDocument
    if(!comparisonInternalDocumentId || !comparisonFileId) {
      continue
    }
    result.documents.push({
      id: comparisonInternalDocumentId,
      filename: `${comparisonInternalDocumentId}.${FILE_FORMAT_JSON}`,
      comparisonFileId,
    })
  }
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

const writeVersionInternalDocumentsToZip = async (zip: ZipTool, documents: VersionDocument[]): Promise<void> => {
  for (const document of documents) {
    const { publish, versionInternalDocument } = document
    const { versionDocumentId: versionInternalDocumentId, serializedVersionDocument } = versionInternalDocument
    if (!publish || !serializedVersionDocument || !versionInternalDocumentId) { continue }
    await zip.file(`${versionInternalDocumentId}.${FILE_FORMAT_JSON}`, serializedVersionDocument)
  }
}

const writeComparisonInternalDocumentsToZip = async (zip: ZipTool, comparisonDocument: ComparisonInternalDocument[]): Promise<void> => {
  for (const comparisonInternalDocument of comparisonDocument) {
    if (!comparisonInternalDocument) {continue}
    const {
      comparisonDocumentId: comparisonInternalDocumentId,
      serializedComparisonDocument,
    } = comparisonInternalDocument
    if (!comparisonInternalDocumentId || !serializedComparisonDocument) {continue}
    await zip.file(`${comparisonInternalDocumentId}.${FILE_FORMAT_JSON}`, serializedComparisonDocument)
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
  const data: PackageOperations = { operations: [] }
  const SEARCH_SCOPES_MAP: Record<string, string> = {}

  for (const operation of operations.values()) {
    const searchScopes = Object
      .entries(operation.searchScopes)
      .reduce((acc, next) => {
        const [key, value] = next
        acc[key] = [...value.values()].sort().join(' ')
        return acc
      }, { ...SEARCH_SCOPES_MAP })

    data.operations.push({
      operationId: operation.operationId,
      documentId: operation.documentId,
      title: operation.title,
      deprecated: operation.deprecated,
      apiKind: operation.apiKind,
      apiType: operation.apiType,
      metadata: operation.metadata,
      searchScopes: searchScopes,

      ...(takeIf({ deprecatedItems: operation.deprecatedItems }, !!operation.deprecatedItems?.length)),
      deprecatedInfo: operation.deprecatedInfo,
      deprecatedInPreviousVersions: operation.deprecatedInPreviousVersions,

      models: operation.models,
      tags: operation.tags,
      apiAudience: operation.apiAudience,
      versionInternalDocumentId: operation.versionInternalDocumentId,
    })
  }

  zip.file(PACKAGE.OPERATIONS_FILE_NAME, data)
}

const createOperationDataFile = (zipFolder: ZipTool, operationId: string, operation: PackageOperation): void => {
  zipFolder.file(operationId, operation)
}

const createComparisonsFile = (zip: ZipTool, comparisons: PackageComparisons): void => {
  zip.file(PACKAGE.COMPARISONS_FILE_NAME, comparisons)
}

const createComparisonDataFile = (zipFolder: ZipTool, comparisonFileId: string, comparison: PackageComparisonOperations): void => {
  zipFolder.file(comparisonFileId, comparison)
}
