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
  ComparisonKey,
  DdlChangesDto,
  DiffTypeDto,
  InternalDocumentMetadata,
  NotificationMessage,
  PackageCachedComparisons,
  PackageComparisonOperation,
  PackageComparisonOperations,
  PackageComparisons,
  PackageDocuments,
  PackageComparisonNotifications,
  PackageComparisonNotificationsEntry,
  PackageNotifications,
  PackageOperations,
  VersionDocument,
  VersionsComparisonDto,
} from '../types'
import { FILE_FORMAT_JSON } from '../consts'
import { calculateChangeId, takeIf, toPackageDocument } from '../utils'
import { DdlComparison, DdlComparisonDto, VersionsComparison } from '../types/internal/compare'
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
  // Fixed-width zero-padding only sorts correctly for non-negative integers that fit the width — true of
  // revision and severity, the only numbers used as key parts. Anything else would sort wrong silently.
  if (!Number.isInteger(part) || part < 0 || part >= 1e10) {
    throw new Error(`Sort key number out of range: ${part} (expected a non-negative integer below 1e10)`)
  }
  return String(part).padStart(10, '0')
}

const tupleKey = (...parts: KeyPart[]): string => JSON.stringify(parts.map(encodeKeyPart))

const comparisonSortKey = (comparison: ComparisonKey): string => tupleKey(
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
  notification.category,
  notification.documentId ?? null,
)

/**
 * Add a message unless the list already carries an identical one.
 *
 * A pair's operation and DDL comparisons resolve the same versions, and resolver failures are not cached, so
 * one pair can raise the same message twice: it would double the release-failure count and store a repeat
 * row. Identity is the sort key, so what deduplicates here and what orders the file cannot drift apart.
 */
export const pushOnce = (notifications: NotificationMessage[], message: NotificationMessage): void => {
  const key = notificationSortKey(message)
  if (!notifications.some(existing => notificationSortKey(existing) === key)) { notifications.push(message) }
}

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
  // an operationId is unique only within an api type, so the key spans both — otherwise two rows tie and
  // fall back to `config.files` order
  result.operations = sortByKey(result.operations, ({ apiType, operationId }) => tupleKey(apiType, operationId))
  return result
}

export function buildPackageDocuments(
  documents: Iterable<VersionDocument>,
  erroredSlugs: ReadonlySet<string> = new Set(),
): PackageDocuments {
  const result: PackageDocuments = { documents: [] }
  for (const document of documents) {
    if (!document.publish) { continue }
    result.documents.push(toPackageDocument(document, erroredSlugs.has(document.slug)))
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

const buildComparisonIndex = <T extends ComparisonKey & { data?: unknown }>(comparisons: T[]): Omit<T, 'data'>[] =>
  sortByKey(comparisons.map(({ data, ...rest }) => rest), comparisonSortKey)

export function buildComparisonsIndex(comparisons: VersionsComparisonDto[]): PackageComparisons {
  return { comparisons: buildComparisonIndex(comparisons) }
}

/**
 * Build `cached-comparisons.json`: the version pairs this build reused from the host instead of calculating.
 *
 * One entry per pair, not per comparison — both of a pair's comparisons reach one row in the host's store.
 * Values are copied, never derived: a key must match the comparison it names field for field.
 */
export function buildCachedComparisons(comparisons: Array<VersionsComparison | DdlComparison>): PackageCachedComparisons {
  const byPair = new Map<string, ComparisonKey>()

  for (const comparison of comparisons) {
    if (!comparison.fromCache) { continue }
    const key: ComparisonKey = {
      packageId: comparison.packageId,
      version: comparison.version,
      revision: comparison.revision,
      previousVersionPackageId: comparison.previousVersionPackageId,
      previousVersion: comparison.previousVersion,
      previousVersionRevision: comparison.previousVersionRevision,
    }
    byPair.set(comparisonSortKey(key), key)
  }

  return { cachedComparisons: sortByKey([...byPair.values()], comparisonSortKey) }
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

// The pair a config asked for, carrying what no comparison owns.
export interface DeclaredPair {
  packageId: string
  version: string
  revision: number
  previousVersionPackageId: string
  previousVersion: string
  previousVersionRevision: number
  notifications: NotificationMessage[]
}

/**
 * Group the comparison phase's notifications into `comparison-notifications.json`, one entry per version pair.
 *
 * The backend replaces a pair's stored rows on republish, so an entry has to mean "this build calculated this
 * pair". A pair calculated here therefore gets an entry even when it has nothing to report, and a pair served
 * from the host's cache gets none — an empty entry would delete the messages the build that did calculate it
 * recorded.
 *
 * Identity is the six-part version tuple, never `comparisonFileId`: a refs-only dashboard comparison has no
 * file id. A pair's operation and DDL comparisons arrive as two objects sharing one array, and grouping by
 * that identity is what collapses them — see `CompareContext.forPair`.
 *
 * `declaredPair` carries what no comparison owns. A baseline that never resolved leaves no pair to report
 * against, and this file has no build-wide bucket to fall back to.
 */
export function buildComparisonNotifications(
  comparisons: Array<VersionsComparison | DdlComparison>,
  declaredPair?: DeclaredPair,
): PackageComparisonNotifications {
  const byPair = new Map<string, PackageComparisonNotificationsEntry>()

  // fields picked one by one: the comparison carries the whole changelog, and spreading it would ship it
  const merge = (source: PackageComparisonNotificationsEntry): void => {
    const { packageId, version, revision, previousVersionPackageId, previousVersion, previousVersionRevision } = source
    const key = tupleKey(packageId, version, revision ?? null, previousVersionPackageId, previousVersion, previousVersionRevision ?? null)
    const existing = byPair.get(key)
    if (!existing) {
      byPair.set(key, {
        packageId,
        version,
        revision,
        previousVersionPackageId,
        previousVersion,
        previousVersionRevision,
        notifications: [...source.notifications],
      })
      return
    }
    // by identity: the shared array is already in, so only a pair arriving with a second one adds anything
    existing.notifications.push(...source.notifications.filter(notification => !existing.notifications.includes(notification)))
  }

  for (const comparison of comparisons) {
    if (comparison.fromCache) { continue }
    merge(comparison)
  }

  if (declaredPair?.notifications.length) { merge(declaredPair) }

  const entries = [...byPair.values()]
    .map(entry => ({ ...entry, notifications: sortByKey(entry.notifications, notificationSortKey) }))

  // the same six-part identity `comparisons.json` sorts by, so the two files list pairs in the same order
  return {
    comparisons: sortByKey(entries, entry => tupleKey(
      entry.packageId,
      entry.version,
      entry.revision ?? null,
      entry.previousVersionPackageId,
      entry.previousVersion,
      entry.previousVersionRevision ?? null,
    )),
  }
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
