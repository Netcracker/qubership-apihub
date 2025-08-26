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

import fs from 'fs/promises'

import {
  ApiOperation,
  BuildConfig,
  BuilderContext,
  FILE_FORMAT_JSON,
  NotificationMessage,
  PackageDocuments,
  PackageOperations,
  unknownApiBuilder,
  VersionDocument,
  VersionsComparisonDto,
} from '../../../src'
import { PACKAGE } from '../../../src/consts'
import objectHash from 'object-hash'
import { toPackageDocument } from '../../../src/utils'

export async function saveComparisonsArray(
  comparisons: VersionsComparisonDto[],
  basePath: string,
): Promise<void> {
  await fs.writeFile(
    `${basePath}/${PACKAGE.COMPARISONS_FILE_NAME}`,
    JSON.stringify({ comparisons }, undefined, 2),
  )
}

export async function saveEachComparison(
  comparisons: VersionsComparisonDto[],
  basePath: string,
): Promise<void> {
  await fs.mkdir(`${basePath}/${PACKAGE.COMPARISONS_DIR_NAME}`)
  for (const comparison of comparisons.values()) {
    comparison.comparisonFileId && await fs.writeFile(
      `${basePath}/${PACKAGE.COMPARISONS_DIR_NAME}/${comparison.comparisonFileId}.json`,
      JSON.stringify({ operations: comparison.data }, undefined, 2),
    )
  }
}

export async function saveNotifications(
  notifications: NotificationMessage[],
  basePath: string,
): Promise<void> {
  await fs.writeFile(
    `${basePath}/${PACKAGE.NOTIFICATIONS_FILE_NAME}`,
    JSON.stringify({ notifications }, undefined, 2),
  )
}

export async function saveOperationsArray(
  operations: Map<string, ApiOperation>,
  basePath: string,
): Promise<void> {
  await fs.writeFile(
    `${basePath}/${PACKAGE.OPERATIONS_FILE_NAME}`,
    getOperationsFileContent(operations),
  )
}

export async function saveEachOperation(
  operations: Map<string, ApiOperation>,
  basePath: string,
): Promise<void> {
  await fs.mkdir(`${basePath}/${PACKAGE.OPERATIONS_DIR_NAME}`)
  for (const operation of operations.values()) {
    await fs.writeFile(
      `${basePath}/${PACKAGE.OPERATIONS_DIR_NAME}/${operation.operationId}.json`,
      JSON.stringify(operation.data, undefined, 2),
    )
  }
}

export async function saveInfo(
  config: BuildConfig,
  basePath: string,
): Promise<void> {
  await fs.writeFile(
    `${basePath}/${PACKAGE.INFO_FILE_NAME}`,
    JSON.stringify(config, undefined, 2),
    {},
  )
}

export async function saveDocumentsArray(
  documents: Map<string, VersionDocument>,
  basePath: string,
): Promise<void> {
  await fs.writeFile(
    `${basePath}/${PACKAGE.DOCUMENTS_FILE_NAME}`,
    getDocumentsFileContent(documents),
  )
}

export function getDocumentsFileContent(
  documentsMap: Map<string, VersionDocument>,
): string {
  const result: PackageDocuments = { documents: [] }

  for (const document of documentsMap.values()) {
    if (!document.publish) { continue }

    result.documents.push(toPackageDocument(document))
  }

  return JSON.stringify(result, undefined, 2)
}

export function getOperationsFileContent(
  operationsMap: Map<string, ApiOperation>,
  updateHash = false,
): string {
  const result: PackageOperations = { operations: [] }
  const SEARCH_SCOPES_MAP: Record<string, string> = {}

  for (const operation of operationsMap.values()) {
    const searchScopes = Object
      .entries(operation.searchScopes)
      .reduce((acc, next) => {
        const [key, value] = next
        acc[key] = [...value.values()].join(' ')
        return acc
      }, { ...SEARCH_SCOPES_MAP })

    result.operations.push({
      operationId: operation.operationId,
      documentId: operation.documentId,
      title: operation.title,
      deprecated: operation.deprecated,
      apiKind: operation.apiKind,
      apiType: operation.apiType,
      metadata: operation.metadata,
      searchScopes: searchScopes,
      deprecatedItems: operation.deprecatedItems,
      deprecatedInfo: operation.deprecatedInfo,
      deprecatedInPreviousVersions: operation.deprecatedInPreviousVersions,
      models: operation.models,
      tags: operation.tags,
      apiAudience: operation.apiAudience,
    })
  }

  return JSON.stringify(result, undefined, 2)
}

export async function saveEachDocument(
  documents: Map<string, VersionDocument>,
  basePath: string,
  ctx: BuilderContext,
): Promise<void> {
  await fs.mkdir(`${basePath}/${PACKAGE.DOCUMENTS_DIR_NAME}`)
  for (const document of documents.values()) {
    // skip components
    if (!document.publish) { continue }

    const filePath = `${basePath}/${PACKAGE.DOCUMENTS_DIR_NAME}/${document.filename}`
    const fileContent = getDocumentFileContent(document, ctx)

    if (fileContent instanceof Blob) {
      await fs.writeFile(filePath, Buffer.from(await fileContent.arrayBuffer()))
      continue
    }
    await fs.writeFile(filePath, fileContent)
  }
}

export function getDocumentFileContent(
  document: VersionDocument,
  ctx: BuilderContext,
): Blob {
  const builder = ctx.apiBuilders.find(({ types }) => types.includes(document.type)) || unknownApiBuilder
  return builder.dumpDocument(document, FILE_FORMAT_JSON)
}
