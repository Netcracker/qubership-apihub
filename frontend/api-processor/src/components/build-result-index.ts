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
  ApiOperation,
  ChangeMessage,
  ComparisonInternalDocument,
  ComparisonInternalDocumentMetadata,
  DdlChangesDto,
  DiffTypeDto,
  InternalDocumentMetadata,
  NotificationMessage,
  PackageComparisonOperation,
  PackageComparisonOperations,
  PackageComparisons,
  PackageDocuments,
  PackageNotifications,
  PackageOperations,
  VersionDocument,
  VersionsComparisonDto,
} from '../types'
import { FILE_FORMAT_JSON } from '../consts'
import { calculateChangeId, takeIf, toPackageDocument } from '../utils'
import { DdlComparisonDto } from '../types/internal/compare'
import { groupMcpEntitiesByKind, KIND_TO_FIELD as MCP_KIND_TO_FIELD } from './mcp'
import { McpEntityIndex, PackageMcpFile } from '../types/package/mcp'
import { groupDdlEntitiesByKind, KIND_TO_FIELD as DDL_KIND_TO_FIELD } from './ddl'
import { DdlEntityIndex, PackageDdlFile } from '../types/package/ddl'

const sortByKey = <T>(items: T[], key: (item: T) => string): T[] =>
  items
    .map(item => ({ item, key: key(item) }))
    .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
    .map(entry => entry.item)

type KeyPart = string | number | null

const encodeKeyPart = (part: KeyPart): string | null => {
  if (typeof part !== 'number') { return part }
  // Zero-padding to a fixed width limits numbers to non-negative integers below 1e10 (covers revision
  // and severity); outside that range the padding would sort wrong, so it throws instead.
  if (!Number.isInteger(part) || part < 0 || part >= 1e10) {
    throw new Error(`Sort key number out of range: ${part} (expected a non-negative integer below 1e10)`)
  }
  return String(part).padStart(10, '0')
}

const tupleKey = (...parts: KeyPart[]): string => JSON.stringify(parts.map(encodeKeyPart))

type ComparisonKeyFields = {
  packageId: string
  version: string
  revision?: number
  previousVersionPackageId: string
  previousVersion: string
  previousVersionRevision?: number
}

const comparisonSortKey = (comparison: ComparisonKeyFields): string => tupleKey(
  comparison.packageId,
  comparison.version,
  comparison.revision ?? null,
  comparison.previousVersionPackageId,
  comparison.previousVersion,
  comparison.previousVersionRevision ?? null,
)

const comparisonOperationSortKey = (operation: PackageComparisonOperation): string =>
  tupleKey(operation.operationId ?? null, operation.previousOperationId ?? null)

const ddlComparisonEntitySortKey = (entry: DdlChangesDto): string =>
  tupleKey(entry.ddlEntityData?.ddlEntityId ?? null, entry.previousDdlEntityData?.ddlEntityId ?? null)

const notificationSortKey = (notification: NotificationMessage): string => tupleKey(
  notification.severity,
  notification.message,
  notification.fileId ?? null,
  notification.operationId ?? null,
  notification.previousOperationId ?? null,
)

const sortChanges = <T extends { changes?: ChangeMessage<DiffTypeDto>[] }>(entry: T): T =>
  (entry.changes
    ? { ...entry, changes: sortByKey(entry.changes, change => calculateChangeId(change as ChangeMessage)) }
    : entry)

export function buildPackageOperations(operations: Map<string, ApiOperation>): PackageOperations {
  const result: PackageOperations = { operations: [] }
  for (const operation of operations.values()) {
    result.operations.push({
      operationId: operation.operationId,
      documentId: operation.documentId,
      title: operation.title,
      deprecated: operation.deprecated,
      apiKind: operation.apiKind,
      apiType: operation.apiType,
      metadata: operation.metadata,
      search: operation.search,

      ...(takeIf({ deprecatedItems: operation.deprecatedItems }, !!operation.deprecatedItems?.length)),
      deprecatedInfo: operation.deprecatedInfo,
      // Not sorted: already source-deterministic — sorting would churn semantics (e.g. version order).
      deprecatedInPreviousVersions: operation.deprecatedInPreviousVersions,
      models: operation.models,
      tags: operation.tags,
      apiAudience: operation.apiAudience,
      versionInternalDocumentId: operation.versionInternalDocumentId,
    })
  }
  result.operations = sortByKey(result.operations, operation => operation.operationId)
  return result
}

export function buildPackageDocuments(documents: Iterable<VersionDocument>): PackageDocuments {
  const result: PackageDocuments = { documents: [] }
  for (const document of documents) {
    if (!document.publish) { continue }
    // operationIds is already deterministic (buildOperations parse order); only the document LIST needs sorting.
    result.documents.push(toPackageDocument(document))
  }
  result.documents = sortByKey(result.documents, document => document.fileId)
  return result
}

export type InternalDocumentEntry = { id: string; filename: string; content: string }

const internalDocumentEntry = (id?: string, content?: string): InternalDocumentEntry | undefined =>
  (id && content ? { id, filename: `${id}.${FILE_FORMAT_JSON}`, content } : undefined)

export const takeVersionInternalDocumentEntry = (document: VersionDocument): InternalDocumentEntry | undefined => {
  const { publish, versionInternalDocument } = document
  return publish
    ? internalDocumentEntry(versionInternalDocument?.versionDocumentId, versionInternalDocument?.serializedVersionDocument)
    : undefined
}

export const takeComparisonInternalDocumentEntry = (
  document: ComparisonInternalDocument,
): (InternalDocumentEntry & { comparisonFileId: string }) | undefined => {
  const entry = document && internalDocumentEntry(document.comparisonDocumentId, document.serializedComparisonDocument)
  return entry && document.comparisonFileId ? { ...entry, comparisonFileId: document.comparisonFileId } : undefined
}

export function buildVersionInternalDocumentsIndex(documents: Iterable<VersionDocument>): { documents: InternalDocumentMetadata[] } {
  const index: InternalDocumentMetadata[] = []
  for (const document of documents) {
    const entry = takeVersionInternalDocumentEntry(document)
    if (entry) { index.push({ id: entry.id, filename: entry.filename }) }
  }
  return { documents: sortByKey(index, document => document.id) }
}

export function buildComparisonInternalDocumentsIndex(comparisonDocuments: ComparisonInternalDocument[]): { documents: ComparisonInternalDocumentMetadata[] } {
  const index: ComparisonInternalDocumentMetadata[] = []
  for (const document of comparisonDocuments) {
    const entry = takeComparisonInternalDocumentEntry(document)
    if (entry) { index.push({ id: entry.id, filename: entry.filename, comparisonFileId: entry.comparisonFileId }) }
  }
  return { documents: sortByKey(index, document => document.id) }
}

const buildComparisonIndex = <T extends ComparisonKeyFields & { data?: unknown }>(comparisons: T[]): Omit<T, 'data'>[] =>
  sortByKey(comparisons.map(({ data, ...rest }) => rest), comparisonSortKey)

export function buildComparisonsIndex(comparisons: VersionsComparisonDto[]): PackageComparisons {
  return { comparisons: buildComparisonIndex(comparisons) }
}

export function buildComparisonOperations(operations: PackageComparisonOperation[]): PackageComparisonOperations {
  return { operations: sortByKey(operations.map(sortChanges), comparisonOperationSortKey) }
}

export function buildDdlComparisonsIndex(comparisons: DdlComparisonDto[]): { comparisons: Omit<DdlComparisonDto, 'data'>[] } {
  return { comparisons: buildComparisonIndex(comparisons) }
}

export function buildDdlComparisonEntities(entities: DdlChangesDto[]): { entities: DdlChangesDto[] } {
  return { entities: sortByKey(entities.map(sortChanges), ddlComparisonEntitySortKey) }
}

export function buildNotifications(notifications: NotificationMessage[]): PackageNotifications {
  return { notifications: sortByKey(notifications, notificationSortKey) }
}

export function buildMcpFile(mcpEntities: McpEntityIndex): PackageMcpFile {
  const grouped = groupMcpEntitiesByKind(mcpEntities)
  for (const kind of Object.values(MCP_KIND_TO_FIELD)) {
    grouped[kind] = sortByKey(grouped[kind], entity => entity.mcpEntityId)
  }
  return grouped
}

export function buildDdlFile(ddlEntities: DdlEntityIndex): PackageDdlFile {
  const grouped = groupDdlEntitiesByKind(ddlEntities)
  for (const kind of Object.values(DDL_KIND_TO_FIELD)) {
    grouped[kind] = sortByKey(grouped[kind], entity => entity.ddlEntityId)
  }
  return grouped
}
