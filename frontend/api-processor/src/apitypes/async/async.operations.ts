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

import { OperationsBuilder } from '../../types'
import {
  calculateAsyncOperationId,
  createBundlingErrorHandler,
  createSerializedInternalDocument,
  DuplicateEntry,
  findDuplicates,
  isNotEmpty,
  isObject,
  removeComponents,
} from '../../utils'
import type * as TYPE from './async.types'
import { AsyncOperationActionType } from './async.types'
import { FIRST_REFERENCE_KEY_PROPERTY, INLINE_REFS_FLAG } from '../../consts'
import { asyncFunction } from '../../utils/async'
import { normalize, RefErrorType } from '@netcracker/qubership-apihub-api-unifier'
import { ASYNC_EFFECTIVE_NORMALIZE_OPTIONS } from './async.consts'
import { v3 as AsyncAPIV3 } from '@asyncapi/parser/esm/spec-types'
import { buildAsyncApiOperation } from './async.operation'
import { getAsyncChannelId, getAsyncMessageId } from './async.utils'

type OperationInfo = { messageId: string; channelId: string; asyncOperationId: string }

export const buildAsyncApiOperations: OperationsBuilder<AsyncAPIV3.AsyncAPIObject> = async (document, ctx) => {
  const { data: documentData, fileId: documentFileId } = document
  const documentWithoutComponents = removeComponents(documentData)
  const bundlingErrorHandler = createBundlingErrorHandler(ctx, documentFileId)

  const { notifications, normalizedSpecFragmentsHashCache, config } = ctx
  const effectiveDocument = normalize(
    documentWithoutComponents,
    {
      ...ASYNC_EFFECTIVE_NORMALIZE_OPTIONS,
      source: documentData,
      onRefResolveError: (message: string, _path: PropertyKey[], _ref: string, errorType: RefErrorType) =>
        bundlingErrorHandler([{ message, errorType }]),
    },
  ) as AsyncAPIV3.AsyncAPIObject
  const refsOnlyDocument = normalize(
    documentWithoutComponents,
    {
      mergeAllOf: false,
      firstReferenceKeyProperty: FIRST_REFERENCE_KEY_PROPERTY,
      inlineRefsFlag: INLINE_REFS_FLAG,
      source: documentData,
    },
  ) as AsyncAPIV3.AsyncAPIObject

  const { operations } = effectiveDocument

  const apihubOperations: TYPE.VersionAsyncOperation[] = []
  if (!isObject(operations)) {
    return []
  }

  const operationIdMap = new Map<string, OperationInfo[]>()

  // Iterate through all operations in AsyncAPI 3.0 document
  for (const [asyncOperationId, operationData] of Object.entries(operations)) {
    if (!isObject(operationData)) {
      continue
    }
    const operationObject = operationData as AsyncAPIV3.OperationObject
    const messages = operationData.messages as AsyncAPIV3.MessageObject[]

    if (!Array.isArray(messages) || messages.length === 0) {
      continue
    }

    const action = operationObject.action as AsyncOperationActionType
    const channel = operationObject.channel as AsyncAPIV3.ChannelObject
    if (!action || !channel) {
      continue
    }
    const channelId = getAsyncChannelId(channel)
    for (const message of messages) {
      const messageId = getAsyncMessageId(message)
      const operationId = calculateAsyncOperationId(asyncOperationId, messageId)

      if (!operationIdMap.has(operationId)) {
        operationIdMap.set(operationId, [])
      }
      operationIdMap.get(operationId)!.push({ asyncOperationId, channelId, messageId})

      await asyncFunction(() => {
        const builtOperation = buildAsyncApiOperation(
          operationId,
          messageId,
          channelId,
          asyncOperationId,
          action,
          channel,
          message,
          document,
          effectiveDocument,
          refsOnlyDocument,
          notifications,
          config,
          normalizedSpecFragmentsHashCache,
        )
        apihubOperations.push(builtOperation)
      })
    }
  }

  const duplicates = findDuplicates(operationIdMap)
  if (isNotEmpty(duplicates)) {
    throw createDuplicatesError(documentFileId, duplicates)
  }

  if (apihubOperations.length) {
    createSerializedInternalDocument(document, effectiveDocument, ASYNC_EFFECTIVE_NORMALIZE_OPTIONS)
  }

  return apihubOperations
}

function createDuplicatesError(fileId: string, duplicates: DuplicateEntry<OperationInfo>[]): Error {
  const duplicatesList = duplicates
    .map(({ operationId, operations }) => {
      const operationsList = operations
        .map((operation: OperationInfo) => `${operation.channelId} ${operation.asyncOperationId} ${operation.messageId}`)
        .join(', ')
      return `- operationId '${operationId}': Found ${operations.length} operations: ${operationsList}`
    })
    .join('\n')
  return new Error(`Duplicated operationIds found within document '${fileId}':\n${duplicatesList}`)
}
