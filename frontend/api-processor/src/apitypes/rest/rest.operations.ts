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

import { OpenAPIV3 } from 'openapi-types'

import { buildRestOperation } from './rest.operation'
import { NotificationMessage, OperationsBuilder } from '../../types'
import {
  calculateRestOperationId,
  createBundlingErrorHandler,
  createSerializedInternalDocument,
  isNotEmpty,
  removeComponents,
} from '../../utils'
import type * as TYPE from './rest.types'
import { INLINE_REFS_FLAG, MESSAGE_SEVERITY } from '../../consts'
import { asyncFunction } from '../../utils/async'
import { logLongBuild, syncDebugPerformance } from '../../utils/logs'
import { normalize, RefErrorType } from '@netcracker/qubership-apihub-api-unifier'
import { extractOperationBasePath } from '@netcracker/qubership-apihub-api-diff'
import { REST_EFFECTIVE_NORMALIZE_OPTIONS } from './rest.consts'

type OperationInfo = { path: string; method: string }
type DuplicateEntry = { operationId: string; operations: OperationInfo[] }

export const buildRestOperations: OperationsBuilder<OpenAPIV3.Document> = async (document, ctx, debugCtx) => {
  const documentWithoutComponents = removeComponents(document.data)
  const bundlingErrorHandler = createBundlingErrorHandler(ctx, document.fileId)

  const { notifications, normalizedSpecFragmentsHashCache, config } = ctx
  const { effectiveDocument, refsOnlyDocument } = syncDebugPerformance('[NormalizeDocument]', () => {
      const effectiveDocument = normalize(
        documentWithoutComponents,
        {
          ...REST_EFFECTIVE_NORMALIZE_OPTIONS,
          source: document.data,
          onRefResolveError: (message: string, _path: PropertyKey[], _ref: string, errorType: RefErrorType) =>
            bundlingErrorHandler([{ message, errorType }]),
        },
      ) as OpenAPIV3.Document
      const refsOnlyDocument = normalize(
        documentWithoutComponents,
        {
          mergeAllOf: false,
          inlineRefsFlag: INLINE_REFS_FLAG,
          source: document.data,
        },
      ) as OpenAPIV3.Document
      return { effectiveDocument, refsOnlyDocument }
    },
    debugCtx,
  )

  const { paths, servers } = effectiveDocument

  const operations: TYPE.VersionRestOperation[] = []
  if (!paths) { return [] }

  const originalSpecComponentsHashCache = new Map<string, string>()
  const operationIdMap = new Map<string, OperationInfo[]>()

  for (const path of Object.keys(paths)) {
    const pathNotifications = validatePath(path, document.fileId)
    if (pathNotifications.length) {
      ctx.notifications.push(...pathNotifications)
    }

    const pathData = paths[path]
    if (typeof pathData !== 'object' || !pathData) { continue }

    for (const key of Object.keys(pathData)) {
      if (!Object.values(OpenAPIV3.HttpMethods).includes(key as OpenAPIV3.HttpMethods)) { continue }

      await asyncFunction(() => {
        const methodData = pathData[key as OpenAPIV3.HttpMethods]
        const basePath = extractOperationBasePath(methodData?.servers || pathData?.servers || servers || [])
        const operationId = calculateRestOperationId(basePath, path, key)

        const trackedOperations = operationIdMap.get(operationId) ?? []
        trackedOperations.push({ path, method: key })
        operationIdMap.set(operationId, trackedOperations)

        syncDebugPerformance('[Operation]', (innerDebugCtx) =>
          logLongBuild(() => {
            const operation = buildRestOperation(
              operationId,
              path,
              <OpenAPIV3.HttpMethods>key,
              document,
              effectiveDocument,
              refsOnlyDocument,
              basePath,
              notifications,
              config,
              normalizedSpecFragmentsHashCache,
              originalSpecComponentsHashCache,
              innerDebugCtx,
            )
            operations.push(operation)
          },
            `${config.packageId}/${config.version} ${operationId}`,
          ), debugCtx, [operationId])
      })
    }
  }

  const duplicates = findDuplicates(operationIdMap)
  if (isNotEmpty(duplicates)) {
    throw createDuplicatesError(duplicates)
  }

  if (operations.length) {
    createSerializedInternalDocument(document, effectiveDocument, REST_EFFECTIVE_NORMALIZE_OPTIONS)
  }

  return operations
}

function validatePath(path: string, fileId: string): NotificationMessage[] {
  const notifications: NotificationMessage[] = []

  if (path.includes('{}')) {
    notifications.push({
      severity: MESSAGE_SEVERITY.Error,
      message: `Invalid path '${path}': path parameter name could not be empty`,
      fileId: fileId,
    })
  }

  if (path.includes('//')) {
    notifications.push({
      severity: MESSAGE_SEVERITY.Warning,
      message: `Path '${path}' contains double slash sequence`,
      fileId: fileId,
    })
  }

  return notifications
}

function findDuplicates(operationIdMap: Map<string, OperationInfo[]>): DuplicateEntry[] {
  return Array.from(operationIdMap.entries())
    .filter(([, operations]) => operations.length > 1)
    .map(([operationId, operations]) => ({ operationId, operations }))
}

function createDuplicatesError(duplicates: DuplicateEntry[]): Error {
  const duplicatesList = duplicates
    .map(({ operationId, operations }) => {
      const operationsList = operations
        .map((operation: OperationInfo) => `${operation.method.toUpperCase()} ${operation.path}`)
        .join(', ')
      return `- operationId "${operationId}": found ${operations.length} operations: ${operationsList}`
    })
    .join('\n')
  return new Error(`Duplicated operationIds found:\n${duplicatesList}`)
}
