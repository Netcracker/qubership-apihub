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

import { buildAsyncApiOperation } from './async.operation'
import { OperationsBuilder } from '../../types'
import { createBundlingErrorHandler, createSerializedInternalDocument, isNotEmpty, removeComponents, slugify } from '../../utils'
import type * as TYPE from './async.types'
import { INLINE_REFS_FLAG } from '../../consts'
import { asyncFunction } from '../../utils/async'
import { logLongBuild, syncDebugPerformance } from '../../utils/logs'
import { normalize, RefErrorType } from '@netcracker/qubership-apihub-api-unifier'
import { ASYNC_EFFECTIVE_NORMALIZE_OPTIONS } from './async.consts'

type OperationInfo = { channel: string; action: string }
type DuplicateEntry = { operationId: string; operations: OperationInfo[] }

export const buildAsyncApiOperations: OperationsBuilder<TYPE.AsyncApiDocument> = async (document, ctx, debugCtx) => {
  const documentWithoutComponents = removeComponents(document.data)
  const bundlingErrorHandler = createBundlingErrorHandler(ctx, document.fileId)

  const { effectiveDocument, refsOnlyDocument } = syncDebugPerformance('[NormalizeDocument]', () => {
    const effectiveDocument = normalize(
      documentWithoutComponents,
      {
        ...ASYNC_EFFECTIVE_NORMALIZE_OPTIONS,
        source: document.data,
        onRefResolveError: (message: string, _path: PropertyKey[], _ref: string, errorType: RefErrorType) =>
          bundlingErrorHandler([{ message, errorType }]),
      },
    ) as TYPE.AsyncApiDocument
    const refsOnlyDocument = normalize(
      documentWithoutComponents,
      {
        mergeAllOf: false,
        inlineRefsFlag: INLINE_REFS_FLAG,
        source: document.data,
      },
    ) as TYPE.AsyncApiDocument
    return { effectiveDocument, refsOnlyDocument }
  },
    debugCtx,
  )

  const { operations: operationsObj } = effectiveDocument

  const operations: TYPE.VersionAsyncOperation[] = []
  if (!operationsObj || typeof operationsObj !== 'object') {
    return []
  }

  const operationIdMap = new Map<string, OperationInfo[]>()

  // Iterate through all operations in AsyncAPI 3.0 document
  for (const [operationKey, operationData] of Object.entries(operationsObj)) {
    if (!operationData || typeof operationData !== 'object') {
      continue
    }

    await asyncFunction(async () => {
      // Extract action and channel from operation
      const action = (operationData as any).action as 'send' | 'receive'  //TODO: fix type
      const channelRef = (operationData as any).channel

      if (!action || !channelRef) {
        return
      }

      // Extract channel name from reference (e.g., "#/channels/userSignup" -> "userSignup")
      const channel = typeof channelRef === 'string' && channelRef.startsWith('#/channels/')
        ? channelRef.split('/').pop() || operationKey
        : operationKey

      // TODO: Consider using operationId from spec if present (operationData.operationId)
      const operationId = slugify(`${action}-${channel}`)

      const trackedOperations = operationIdMap.get(operationId) ?? []
      trackedOperations.push({ channel, action })
      operationIdMap.set(operationId, trackedOperations)

      syncDebugPerformance('[Operation]', (innerDebugCtx) =>
        logLongBuild(() => {
          const operation = buildAsyncApiOperation(
            operationId,
            operationKey,
            action,
            channel,
            document,
            effectiveDocument,
            refsOnlyDocument,
            ctx.notifications,
            ctx.config,
            innerDebugCtx,
          )
          operations.push(operation)
        },
          `${ctx.config.packageId}/${ctx.config.version} ${operationId}`,
        ), debugCtx, [operationId])
    })
  }

  const duplicates = findDuplicates(operationIdMap)
  if (isNotEmpty(duplicates)) {
    throw createDuplicatesError(document.fileId, duplicates)
  }

  if (operations.length) {
    createSerializedInternalDocument(document, effectiveDocument, ASYNC_EFFECTIVE_NORMALIZE_OPTIONS)
  }

  return operations
}

function findDuplicates(operationIdMap: Map<string, OperationInfo[]>): DuplicateEntry[] {
  return Array.from(operationIdMap.entries())
    .filter(([, operations]) => operations.length > 1)
    .map(([operationId, operations]) => ({ operationId, operations }))
}

function createDuplicatesError(fileId: string, duplicates: DuplicateEntry[]): Error {
  const duplicatesList = duplicates
    .map(({ operationId, operations }) => {
      const operationsList = operations
        .map((operation: OperationInfo) => `${operation.action.toUpperCase()} ${operation.channel}`)
        .join(', ')
      return `- operationId '${operationId}': Found ${operations.length} operations: ${operationsList}`
    })
    .join('\n')
  return new Error(`Duplicated operationIds found within document '${fileId}':\n${duplicatesList}`)
}

