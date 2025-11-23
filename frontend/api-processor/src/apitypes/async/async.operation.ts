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

import { JsonPath, syncCrawl } from '@netcracker/qubership-apihub-json-crawl'
import { ASYNC_KIND_KEY } from './async.consts'
import type * as TYPE from './async.types'
import {
  BuildConfig,
  DeprecateItem,
  NotificationMessage,
  SearchScopes,
} from '../../types'
import {
  capitalize,
  getSplittedVersionKey,
  isDeprecatedOperationItem,
  isOperationDeprecated,
  rawToApiKind,
  takeIf,
  takeIfDefined,
} from '../../utils'
import { API_KIND, INLINE_REFS_FLAG, ORIGINS_SYMBOL, VERSION_STATUS } from '../../consts'
import { getCustomTags, resolveApiAudience } from '../../utils/apihubSpecificationExtensions'
import { DebugPerformanceContext, syncDebugPerformance } from '../../utils/logs'
import {
  calculateDeprecatedItems,
  JSON_SCHEMA_PROPERTY_DEPRECATED,
  matchPaths,
  OPEN_API_PROPERTY_PATHS,
  parseRef,
  pathItemToFullPath,
  PREDICATE_ANY_VALUE,
  PREDICATE_UNCLOSED_END,
  resolveOrigins,
} from '@netcracker/qubership-apihub-api-unifier'
import { calculateObjectHash } from '../../utils/hashes'
import { extractProtocol } from './async.utils'

export const buildAsyncApiOperation = (
  operationId: string,
  operationKey: string,
  action: 'send' | 'receive',
  channel: string,
  document: TYPE.VersionAsyncDocument,
  effectiveDocument: TYPE.AsyncApiDocument,
  refsOnlyDocument: TYPE.AsyncApiDocument,
  notifications: NotificationMessage[],
  config: BuildConfig,
  debugCtx?: DebugPerformanceContext,
): TYPE.VersionAsyncOperation => {

  const { servers, components } = document.data
  const effectiveOperationObject = effectiveDocument.operations?.[operationKey] || {}
  const effectiveSingleOperationSpec = createSingleOperationSpec(effectiveDocument, operationKey)
  const refsOnlySingleOperationSpec = createSingleOperationSpec(refsOnlyDocument, operationKey)
  const tags = effectiveOperationObject.tags || []

  // Extract search scopes (similar to REST)
  const scopes: SearchScopes = {}
  syncDebugPerformance('[SearchScopes]', () => {
    const handledObject = new Set<unknown>()
    syncCrawl(
      effectiveOperationObject,
      ({ key, value }) => {
        if (typeof key === 'symbol') {
          return { done: true }
        }
        if (handledObject.has(value)) {
          return { done: true }
        }
        handledObject.add(value)
        // For AsyncAPI, we could build search scopes for messages, but for now keep it simple
        return { value }
      },
    )
  }, debugCtx)

  // Calculate deprecated items
  const deprecatedItems: DeprecateItem[] = []
  syncDebugPerformance('[DeprecatedItems]', () => {
    const foundedDeprecatedItems = calculateDeprecatedItems(effectiveSingleOperationSpec, ORIGINS_SYMBOL)

    for (const item of foundedDeprecatedItems) {
      const { description, deprecatedReason, value } = item

      const declarationJsonPaths = resolveOrigins(value, JSON_SCHEMA_PROPERTY_DEPRECATED, ORIGINS_SYMBOL)?.map(pathItemToFullPath) ?? []
      const isOperation = isOperationPaths(declarationJsonPaths)
      const [version] = getSplittedVersionKey(config.version)

      const tolerantHash = undefined // Skip tolerant hash for now
      const hash = isOperation ? undefined : calculateObjectHash(value)

      deprecatedItems.push({
        declarationJsonPaths,
        description,
        ...takeIfDefined({ deprecatedInfo: deprecatedReason }),
        ...takeIf({ [isOperationDeprecated]: true }, isOperation),
        deprecatedInPreviousVersions: config.status === VERSION_STATUS.RELEASE ? [version] : [],
        ...takeIfDefined({ hash: hash }),
        ...takeIfDefined({ tolerantHash: tolerantHash }),
      })
    }
  }, debugCtx)

  // Extract API kind
  const apiKind = effectiveOperationObject[ASYNC_KIND_KEY] || document.apiKind || API_KIND.BWC

  // Build operation data with models
  const models: Record<string, string> = {}
  const [specWithSingleOperation] = syncDebugPerformance('[ModelsAndOperationHashing]', () => {
    const specWithSingleOperation = createSingleOperationSpec(
      document.data,
      operationKey,
      servers,
      components,
    )
    // For AsyncAPI, we could calculate spec refs similar to REST, but keeping it simple for now
    return [specWithSingleOperation]
  }, debugCtx)

  const deprecatedOperationItem = deprecatedItems.find(isDeprecatedOperationItem)

  // Extract custom tags
  const customTags = getCustomTags(effectiveOperationObject)

  // Resolve API audience
  const apiAudience = resolveApiAudience(document.metadata?.info)

  // Extract protocol from servers or channel bindings
  const protocol = extractProtocol(effectiveDocument, channel)

  return {
    operationId,
    documentId: document.slug,
    apiType: 'asyncapi',
    apiKind: rawToApiKind(apiKind),
    deprecated: !!effectiveOperationObject.deprecated,
    title: effectiveOperationObject.title || effectiveOperationObject.summary || operationKey.split('-').map(str => capitalize(str)).join(' '),
    metadata: {
      action,
      channel,
      protocol,
      customTags,
    },
    tags: Array.isArray(tags) ? tags : tags ? [tags] : [],
    data: specWithSingleOperation,
    searchScopes: scopes,
    deprecatedItems,
    models,
    ...takeIf({
      deprecatedInfo: deprecatedOperationItem?.deprecatedInfo,
      deprecatedInPreviousVersions: deprecatedOperationItem?.deprecatedInPreviousVersions,
    }, !!deprecatedOperationItem),
    apiAudience,
  }
}

const isOperationPaths = (paths: JsonPath[]): boolean => {
  return !!matchPaths(
    paths,
    [[OPEN_API_PROPERTY_PATHS, PREDICATE_ANY_VALUE, PREDICATE_ANY_VALUE, PREDICATE_ANY_VALUE]],
  )
}

/**
 * Creates a single operation spec from AsyncAPI document
 * Crops the document to contain only the specific operation
 */
const createSingleOperationSpec = (
  document: TYPE.AsyncApiDocument,
  operationKey: string,
  servers?: Record<string, any>,
  components?: Record<string, any>,
): TYPE.AsyncOperationData => {
  const operation = document.operations?.[operationKey]

  if (!operation) {
    throw new Error(`Operation ${operationKey} not found in document`)
  }

  return {
    asyncapi: document.asyncapi || '3.0.0',
    info: document.info,
    ...takeIfDefined({ servers }),
    operations: {
      [operationKey]: operation,
    },
    channels: document.channels,
    ...takeIfDefined({ components }),
  }
}

