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

import { v3 as AsyncAPIV3 } from '@asyncapi/parser/esm/spec-types'
import {
  calculateAsyncOperationId,
  getInlineRefsFomDocument,
  getKeyValue,
  getSymbolValueIfDefined,
  isObject,
  isReferenceObject,
  setValueByPath, takeIfDefined,
} from '../../utils'
import type * as TYPE from './async.types'
import {
  ASYNCAPI_PROPERTY_CHANNELS,
  ASYNCAPI_PROPERTY_COMPONENTS,
  ASYNCAPI_PROPERTY_SERVERS,
  grepValue,
  matchPaths,
  normalize,
  parseRef,
  PREDICATE_ANY_VALUE,
  PREDICATE_UNCLOSED_END,
} from '@netcracker/qubership-apihub-api-unifier'
import {
  APIHUB_API_COMPATIBILITY_KIND_BWC,
  ApihubApiCompatibilityKind,
  FIRST_REFERENCE_KEY_PROPERTY,
  INLINE_REFS_FLAG,
} from '../../consts'

// Re-export shared utilities
export { dump, getCustomTags, resolveApiAudience } from '../../utils/apihubSpecificationExtensions'

/**
 * Extracts protocol from AsyncAPI document servers or channel bindings
 * @param channel - Channel object to extract protocol from
 * @returns Protocol string (e.g., 'kafka', 'amqp', 'mqtt') or 'unknown'
 */
export function extractProtocol(channel: AsyncAPIV3.ChannelObject): string {
  if (!isObject(channel.servers)) {
    return 'unknown'
  }
  for (const server of Object.values(channel.servers as AsyncAPIV3.ServerObject[])) {
    if (isServerObject(server) && server.protocol) {
      const { protocol } = server
      return protocol
    }
  }

  return 'unknown'
}

function isServerObject(obj: AsyncAPIV3.ServerObject | AsyncAPIV3.ReferenceObject): obj is AsyncAPIV3.ServerObject {
  return isObject(obj) && !isReferenceObject(obj)
}

function isTagObject(obj: AsyncAPIV3.TagObject | AsyncAPIV3.ReferenceObject): obj is AsyncAPIV3.TagObject {
  return isObject(obj) && !isReferenceObject(obj)
}

export function isMessageObject(obj: AsyncAPIV3.MessageObject | AsyncAPIV3.ReferenceObject): obj is AsyncAPIV3.MessageObject {
  return isObject(obj) && !isReferenceObject(obj)
}

function isExternalDocumentationObject(item: AsyncAPIV3.ExternalDocumentationObject | AsyncAPIV3.ReferenceObject): item is AsyncAPIV3.ExternalDocumentationObject {
  return (item as AsyncAPIV3.ExternalDocumentationObject).url !== undefined
}

export function toTagObjects(
  data: AsyncAPIV3.AsyncAPIObject,
): AsyncAPIV3.TagObject[] {
  return data?.info?.tags?.map(item => {
    if (isTagObject(item)) {
      return item
    }

    return normalize(item, {
      source: data,
    }) as AsyncAPIV3.TagObject
  }) ?? []
}

export function toExternalDocumentationObject(
  data: AsyncAPIV3.AsyncAPIObject,
): AsyncAPIV3.ExternalDocumentationObject | undefined {
  const externalDocs = data?.info?.externalDocs
  if (!externalDocs) {
    return undefined
  }

  return isExternalDocumentationObject(externalDocs)
    ? externalDocs
    : normalize(externalDocs, {
      source: data,
    }) as AsyncAPIV3.ExternalDocumentationObject
}

export const calculateAsyncApiKind = (
  operationApiKind: ApihubApiCompatibilityKind | undefined,
  channelApiKind: ApihubApiCompatibilityKind | undefined,
): ApihubApiCompatibilityKind => {
  return operationApiKind || channelApiKind || APIHUB_API_COMPATIBILITY_KIND_BWC
}

const getAsyncObjectId = (item: AsyncAPIV3.ChannelObject | AsyncAPIV3.MessageObject): string => {
  return (item as Record<symbol, string>)[FIRST_REFERENCE_KEY_PROPERTY]
}

export const getAsyncMessageId = (message: AsyncAPIV3.MessageObject): string => {
  return getAsyncObjectId(message)
}
export const getAsyncChannelId = (channel: AsyncAPIV3.ChannelObject): string => {
  return getAsyncObjectId(channel)
}

export const checkHasAsyncApiOperations = (
  document: AsyncAPIV3.AsyncAPIObject,
): Record<string, AsyncAPIV3.OperationObject> => {
  const operations = document?.operations
  if (!operations) {
    throw new Error(
      'AsyncAPI document has no operations. Expected non-empty "operations".',
    )
  }
  return operations as Record<string, AsyncAPIV3.OperationObject>
}

export const createBaseAsyncApiSpec = (
  document: AsyncAPIV3.AsyncAPIObject,
  operations: Record<string, AsyncAPIV3.OperationObject>,
): TYPE.AsyncOperationData => ({
  asyncapi: document.asyncapi || '3.0.0',
  info: document.info,
  ...takeIfDefined({id: document.id}),
  ...takeIfDefined({defaultContentType: document.defaultContentType}),
  operations,
})

export const enrichAsyncApiWithInlineRefs = (
  resultSpec: TYPE.AsyncOperationData,
  document: AsyncAPIV3.AsyncAPIObject,
  refsDocument: AsyncAPIV3.AsyncAPIObject,
): void => {
  const inlineRefs = getInlineRefsFomDocument(refsDocument)

  const componentNameMatcher = grepValue('componentName')
  const matchPatterns = [
    [ASYNCAPI_PROPERTY_COMPONENTS, PREDICATE_ANY_VALUE, componentNameMatcher, PREDICATE_UNCLOSED_END],
    [ASYNCAPI_PROPERTY_CHANNELS, componentNameMatcher, PREDICATE_UNCLOSED_END],
    [ASYNCAPI_PROPERTY_SERVERS, componentNameMatcher, PREDICATE_UNCLOSED_END],
  ]

  inlineRefs.forEach(ref => {
    const parsed = parseRef(ref)
    const path = parsed?.jsonPath
    if (!path) {
      return
    }

    const matchResult = matchPaths([path], matchPatterns)
    if (!matchResult) {
      return
    }

    const component = getKeyValue(document, ...matchResult.path)
    if (!component) {
      return
    }

    setValueByPath(resultSpec, matchResult.path, component)
  })
}

export const buildAsyncApiSpecFromDocument = (
  sourceDocument: AsyncAPIV3.AsyncAPIObject,
  resolved: Map<string, Set<string>>,
): TYPE.AsyncOperationData => {
  const operations = checkHasAsyncApiOperations(sourceDocument)

  const selectedOperations: Record<string, AsyncAPIV3.OperationObject> = {}
  for (const [asyncOperationId, matchedRefs] of resolved.entries()) {
    const sourceOperation = operations[asyncOperationId]

    if (!sourceOperation || isReferenceObject(sourceOperation)) {
      continue
    }

    const sourceMessages = sourceOperation.messages || []
    const filteredMessages = sourceMessages.filter(
      message => isReferenceObject(message) && matchedRefs.has(message.$ref),
    )

    if (filteredMessages.length === 0) {
      continue
    }

    selectedOperations[asyncOperationId] = {
      ...sourceOperation,
      messages: filteredMessages,
    }
  }

  return createBaseAsyncApiSpec(sourceDocument, selectedOperations)
}

export const resolveAsyncApiOperationIdsFromRefs = (
  refOperations: Record<string, AsyncAPIV3.OperationObject>,
  requestedOperationIds: string[],
): Map<string, Set<string>> => {
  const requestedIdsSet = new Set(requestedOperationIds)
  const resolved = new Map<string, Set<string>>()

  for (const [asyncOperationId, operationData] of Object.entries(refOperations)) {
    if (!isObject(operationData)) {
      continue
    }

    const { messages } = (operationData as AsyncAPIV3.OperationObject)
    if (!Array.isArray(messages)) {
      continue
    }

    for (const message of messages) {
      if(!isMessageObject(message)){
        continue
      }
      const inlineRefs = getSymbolValueIfDefined(message, INLINE_REFS_FLAG) as string[] | undefined
      if (!inlineRefs || inlineRefs.length === 0){
        continue
      }
      const lastInlineRef = inlineRefs.at(-1)
      if (!lastInlineRef) {
        continue
      }

      const messageId = getAsyncMessageId(message)
      const calculatedId = calculateAsyncOperationId(asyncOperationId, messageId)

      if (!requestedIdsSet.has(calculatedId)) {
        continue
      }

      let messageRefsForOperation = resolved.get(asyncOperationId)
      if (!messageRefsForOperation) {
        messageRefsForOperation = new Set()
        resolved.set(asyncOperationId, messageRefsForOperation)
      }

      messageRefsForOperation.add(lastInlineRef)
    }
  }

  return resolved
}
