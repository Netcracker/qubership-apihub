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

import { JsonPath } from '@netcracker/qubership-apihub-json-crawl'
import type * as TYPE from './async.types'
import { AsyncOperationActionType, VersionAsyncOperation } from './async.types'
import { BuildConfig, DeprecateItem, NotificationMessage } from '../../types'
import {
  calculateAsyncOperationId,
  getSplittedVersionKey,
  isDeprecatedOperationItem,
  isObject,
  isOperationDeprecated,
  normalizeOperationIds,
  takeIf,
} from '../../utils'
import {
  ASYNCAPI_API_TYPE,
  DEPRECATED_MESSAGE_PREFIX,
  DEPRECATED_SPECIFICATION_EXTENSION,
  ORIGINS_SYMBOL,
  VERSION_STATUS,
} from '../../consts'
import { getCustomTags, resolveApiAudience } from '../../utils/apihubSpecificationExtensions'
import {
  calculateDeprecatedItems,
  Jso,
  JSON_SCHEMA_PROPERTY_DEPRECATED,
  pathItemToFullPath,
  resolveOrigins,
} from '@netcracker/qubership-apihub-api-unifier'
import { calculateHash, ObjectHashCache } from '../../utils/hashes'
import {
  buildAsyncApiSpecFromDocument,
  calculateAsyncApiKind,
  checkHasAsyncApiOperations,
  createBaseAsyncApiSpec,
  enrichAsyncApiWithInlineRefs,
  extractProtocol,
  getAsyncMessageId,
  isMessageObject,
  resolveAsyncApiOperationIdsFromRefs,
} from './async.utils'
import { v3 as AsyncAPIV3 } from '@asyncapi/parser/esm/spec-types'
import { getApiKindProperty } from '../../components/document'
import { calculateTolerantHash } from '../../components/deprecated'

export const buildAsyncApiOperation = (
  operationId: string,
  messageId: string,
  channelId: string,
  asyncOperationId: string,
  action: AsyncOperationActionType,
  channel: AsyncAPIV3.ChannelObject,
  message: AsyncAPIV3.MessageObject,
  document: TYPE.VersionAsyncDocument,
  effectiveDocument: AsyncAPIV3.AsyncAPIObject,
  refsOnlyDocument: AsyncAPIV3.AsyncAPIObject,
  notifications: NotificationMessage[],
  config: BuildConfig,
  normalizedSpecFragmentsHashCache: ObjectHashCache,
): VersionAsyncOperation => {
  const {
    data: documentData,
    slug: documentSlug,
    versionInternalDocument,
    metadata: documentMetadata,
  } = document
  const effectiveOperationObject: AsyncAPIV3.OperationObject = effectiveDocument.operations?.[asyncOperationId] as AsyncAPIV3.OperationObject || {}
  const effectiveSingleOperationSpec = createOperationSpec(effectiveDocument, operationId)

  // TODO Out of scope
  const tags: string[] = effectiveOperationObject?.tags?.map(tag => (tag as AsyncAPIV3.TagObject)?.name) || []

  const deprecatedItems = collectDeprecatedItems(
    config, message, messageId, channel, channelId,
    effectiveSingleOperationSpec, normalizedSpecFragmentsHashCache,
    notifications,
  )

  const operationApiKind = getApiKindProperty(effectiveOperationObject)
  const channelApiKind = getApiKindProperty(channel)

  // TODO: Populate models when AsyncAPI model extraction is implemented
  const models: Record<string, string> = {}
  const specWithSingleOperation = createOperationSpecWithInlineRefs(
    documentData,
    operationId,
    refsOnlyDocument,
  )

  const deprecatedOperationItem = deprecatedItems.find(isDeprecatedOperationItem)

  // Extract custom tags
  const customTags = getCustomTags(effectiveOperationObject)

  // Resolve API audience
  const apiAudience = resolveApiAudience(documentMetadata?.info)

  const protocol = extractProtocol(channel)

  return {
    operationId,
    documentId: documentSlug,
    apiType: ASYNCAPI_API_TYPE,
    apiKind: calculateAsyncApiKind(operationApiKind, channelApiKind),
    deprecated: !!message[DEPRECATED_SPECIFICATION_EXTENSION],
    title: message.title || messageId,
    metadata: {
      action,
      channel: channel.title || channelId,
      protocol,
      customTags,
      messageId,
      asyncOperationId,
    },
    tags,
    data: specWithSingleOperation,
    searchScopes: {}, // TODO: remove after new search is adopted irrevocably
    search: { useOperationDataAsSearchText: true },
    deprecatedItems,
    models,
    ...takeIf({
      deprecatedInfo: deprecatedOperationItem?.deprecatedInfo,
      deprecatedInPreviousVersions: deprecatedOperationItem?.deprecatedInPreviousVersions,
    }, !!deprecatedOperationItem),
    apiAudience,
    versionInternalDocumentId: versionInternalDocument.versionDocumentId,
  }
}

/**
 * Collects deprecation data for an AsyncAPI 3.0 operation.
 *
 * In AsyncAPI 3.0, native `deprecated: true` exists only on Schema Object (JSON Schema).
 * For Message and Channel objects, deprecation is expressed via the custom `x-deprecated` extension.
 *
 * **Message deprecation** (`x-deprecated` on Message Object):
 * If the resolved message has `x-deprecated: true`, the APIHUB operation is treated as
 * deprecated.
 *
 * **Channel deprecation** (`x-deprecated` on Channel Object):
 * If the channel has `x-deprecated: true`, the channel are treated as channel-deprecated.
 */
const collectDeprecatedItems = (
  config: BuildConfig,
  message: AsyncAPIV3.MessageObject,
  messageId: string,
  channel: AsyncAPIV3.ChannelObject,
  channelId: string,
  effectiveSingleOperationSpec: TYPE.AsyncOperationData,
  normalizedSpecFragmentsHashCache: ObjectHashCache,
  notifications: NotificationMessage[],
): DeprecateItem[] => {

  const deprecatedItems: DeprecateItem[] = []
  const [version] = getSplittedVersionKey(config.version)
  const deprecatedInPreviousVersions = config.status === VERSION_STATUS.RELEASE ? [version] : []

  const resolveDeclarationJsonPaths = (value: Jso): JsonPath[] => (
    resolveOrigins(value, DEPRECATED_SPECIFICATION_EXTENSION, ORIGINS_SYMBOL)?.map(pathItemToFullPath) ?? []
  )

  // Handled Custom extensions (x-deprecated) on Message
  if (message[DEPRECATED_SPECIFICATION_EXTENSION]) {
    const declarationJsonPaths = resolveDeclarationJsonPaths(message as Jso)
    const messageTitle = message.title || messageId

    deprecatedItems.push({
      declarationJsonPaths,
      description: `${DEPRECATED_MESSAGE_PREFIX} message '${messageTitle}'`,
      ...{ [isOperationDeprecated]: true },
      deprecatedInPreviousVersions,
    })
  }
  // Handled Custom extensions (x-deprecated) on Channel
  if (channel[DEPRECATED_SPECIFICATION_EXTENSION]) {
    const declarationJsonPaths = resolveDeclarationJsonPaths(channel as Jso)
    const channelTitle = channel.title || channelId

    deprecatedItems.push({
      declarationJsonPaths,
      description: `${DEPRECATED_MESSAGE_PREFIX} channel '${channelTitle}'`,
      deprecatedInPreviousVersions,
      hash: calculateHash(channel, normalizedSpecFragmentsHashCache),
      tolerantHash: calculateTolerantHash(channel as Jso, notifications),
    })
  }

  // Native `deprecated: true` on Schema Objects in payload/headers — calculated by api-unifier
  const foundDeprecatedItems = calculateDeprecatedItems(effectiveSingleOperationSpec, ORIGINS_SYMBOL)
  for (const item of foundDeprecatedItems) {
    const { description, value } = item
    const declarationJsonPaths = resolveOrigins(value, JSON_SCHEMA_PROPERTY_DEPRECATED, ORIGINS_SYMBOL)?.map(pathItemToFullPath) ?? []

    deprecatedItems.push({
      declarationJsonPaths,
      description,
      deprecatedInPreviousVersions,
      hash: calculateHash(value, normalizedSpecFragmentsHashCache),
      tolerantHash: calculateTolerantHash(value as Jso, notifications),
    })
  }

  return deprecatedItems
}

/**
 * Creates an operation spec (a cropped normalized AsyncAPI document)
 * that contains only the requested operation(s).
 *
 * The returned document includes only:
 * - `asyncapi`
 * - `info`
 * - `operations`
 *
 * @param normalizedDocument Normalized AsyncAPI document to crop.
 * @param operationId Operation id or array of operation ids to include.
 *
 * @throws Error when:
 * - document has no `operations`
 * - no operation ids are provided
 */
export const createOperationSpec = (
  normalizedDocument: AsyncAPIV3.AsyncAPIObject,
  operationId: string | string[],
): TYPE.AsyncOperationData => {
  const operations = checkHasAsyncApiOperations(normalizedDocument)
  const operationIds = normalizeOperationIds(operationId)
  const requestedIdsSet = new Set(operationIds)

  const selectedOperations: Record<string, AsyncAPIV3.OperationObject> = {}
  for (const [asyncOperationId, operationData] of Object.entries(operations)) {
    if (!isObject(operationData)) {
      continue
    }

    const operationObject = operationData as AsyncAPIV3.OperationObject
    const { messages, action, channel } = operationObject

    if (!Array.isArray(messages) || !messages.length) {
      continue
    }
    if (!action || !channel) {
      continue
    }

    for (const message of messages) {
      if (!isMessageObject(message)) {
        continue
      }
      const messageId = getAsyncMessageId(message)
      if (!messageId) {
        throw new Error(
          `Unable to calculate operation ID for async operation "${asyncOperationId}"`,
        )
      }

      const calculatedId = calculateAsyncOperationId(
        asyncOperationId,
        messageId,
      )

      if (requestedIdsSet.has(calculatedId)) {
        selectedOperations[asyncOperationId] = operationObject
        break
      }
    }
  }

  return createBaseAsyncApiSpec(normalizedDocument, selectedOperations)
}

/**
 * Creates an operation spec (a cropped AsyncAPI document)
 * that contains only the requested operation(s) and additionally
 * resolves inline references from the provided refsDocument.
 *
 * If refsDocument contains inline refs for the requested operations,
 * the function will inline referenced:
 * - `channels`
 * - `servers`
 * - `components`
 *
 * @param document Original AsyncAPI 3.0 document.
 * @param operationId Operation id or array of operation ids to include.
 * @param refsDocument Normalized AsyncAPI document containing inline refs metadata.
 *
 * @throws Error when:
 * - no operation ids are provided
 * - operations are missing in document
 * - requested operations are not found
 */
export const createOperationSpecWithInlineRefs = (
  document: AsyncAPIV3.AsyncAPIObject,
  operationId: string | string[],
  refsDocument: AsyncAPIV3.AsyncAPIObject,
): TYPE.AsyncOperationData => {
  const operations = checkHasAsyncApiOperations(refsDocument)
  const operationIds = normalizeOperationIds(operationId)

  const resolvedOperationKeys = resolveAsyncApiOperationIdsFromRefs(
    operations,
    operationIds,
  )

  if (resolvedOperationKeys.size === 0) {
    throw new Error(
      `Operations not found in document.operations: ${
        Array.isArray(operationId) ? operationId.join(', ') : operationId
      }`,
    )
  }

  const resultSpec = buildAsyncApiSpecFromDocument(document, resolvedOperationKeys)

  enrichAsyncApiWithInlineRefs(resultSpec, document, refsDocument)

  return resultSpec
}
