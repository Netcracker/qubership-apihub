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

import { API_AUDIENCE_EXTERNAL, BuildConfig, DeprecateItem, NotificationMessage } from '../../types'
import {
  calculateGraphqlOperationId,
  getKeyValue,
  getSplittedVersionKey,
  isObject,
  isOperationDeprecated,
  setValueByPath,
  takeIf,
  takeIfDefined,
} from '../../utils'
import {
  APIHUB_API_COMPATIBILITY_KIND_BWC,
  GRAPHQL_API_TYPE,
  INLINE_REFS_FLAG,
  ORIGINS_SYMBOL,
  VERSION_STATUS,
} from '../../consts'
import { GraphQLSchemaType, VersionGraphQLDocument, VersionGraphQLOperation } from './graphql.types'
import { GRAPHQL_TYPE, GRAPHQL_TYPE_KEYS, RUNTIME_DIRECTIVE_LOCATIONS } from './graphql.consts'
import { GraphApiSchema } from '@netcracker/qubership-apihub-graphapi'
import { buildGraphQLSearchText } from './graphql.utils'
import { toTitleCase } from '../../utils/strings'
import {
  calculateDeprecatedItems,
  GRAPH_API_PROPERTY_COMPONENTS,
  JSON_SCHEMA_PROPERTY_DEPRECATED,
  matchPaths,
  OPEN_API_PROPERTY_PATHS,
  parseRef,
  pathItemToFullPath,
  PREDICATE_ANY_VALUE,
  PREDICATE_UNCLOSED_END,
  resolveOrigins,
} from '@netcracker/qubership-apihub-api-unifier'
import { JsonPath, syncCrawl } from '@netcracker/qubership-apihub-json-crawl'
import { DebugPerformanceContext, syncDebugPerformance } from '../../utils/logs'
import { calculateHash, ObjectHashCache } from '../../utils/hashes'

export const buildGraphQLOperation = (
  operationId: string,
  type: GraphQLSchemaType,
  method: string,
  // TODO: move to BuildOperationContext
  document: VersionGraphQLDocument,
  effectiveDocument: GraphApiSchema,
  refsOnlyDocument: GraphApiSchema,
  notifications: NotificationMessage[],
  config: BuildConfig,
  normalizedSpecFragmentsHashCache: ObjectHashCache,
  debugCtx?: DebugPerformanceContext,
): VersionGraphQLOperation => {
  const { apiKind: documentApiKind, slug: documentSlug, versionInternalDocument } = document
  const singleOperationEffectiveSpec: GraphApiSchema = createOperationSpec(effectiveDocument, refsOnlyDocument, [operationId])

  const deprecatedItems: DeprecateItem[] = syncDebugPerformance('[DeprecatedItems]', () => {
    const foundedDeprecatedItems = calculateDeprecatedItems(singleOperationEffectiveSpec, ORIGINS_SYMBOL)
    const result: DeprecateItem[] = []
    for (const item of foundedDeprecatedItems) {
      const { description, value, deprecatedReason } = item
      const declarationJsonPaths = resolveOrigins(value, JSON_SCHEMA_PROPERTY_DEPRECATED, ORIGINS_SYMBOL)?.map(pathItemToFullPath) ?? []

      const isOperation = isOperationPaths(declarationJsonPaths)
      const [version] = getSplittedVersionKey(config.version)
      const hash = isOperation ? undefined : calculateHash(value, normalizedSpecFragmentsHashCache)

      result.push({
        declarationJsonPaths,
        ...takeIfDefined({ description }),
        ...takeIfDefined({ deprecatedInfo: deprecatedReason }),
        ...takeIf({ [isOperationDeprecated]: true }, isOperation),
        deprecatedInPreviousVersions: config.status === VERSION_STATUS.RELEASE ? [version] : [],
        ...takeIfDefined({ hash: hash }),
      })
    }
    return result
  }, debugCtx)

  const searchTextFilePath = `search/${operationId}.txt`
  const operation = effectiveDocument[type]?.[method]
  const searchText = buildGraphQLSearchText(operation, method)

  return {
    operationId,
    documentId: documentSlug,
    apiType: GRAPHQL_API_TYPE,
    apiKind: documentApiKind || APIHUB_API_COMPATIBILITY_KIND_BWC,
    deprecated: !!operation?.directives?.deprecated,
    title: toTitleCase(method),
    metadata: {
      type: GRAPHQL_TYPE[type],
      method: method,
    },
    tags: [type],
    data: undefined,  // we do not want to save single-operation specs for GraphQL for performance reasons
    searchScopes: {}, // TODO: remove after new search is adopted irrevocably
    search: {
      useOperationDataAsSearchText: false,
      searchTextFilePath,
    },
    searchText,
    deprecatedItems,
    models: {},
    apiAudience: API_AUDIENCE_EXTERNAL,
    versionInternalDocumentId: versionInternalDocument.versionDocumentId,
  }
}

const isOperationPaths = (paths: JsonPath[]): boolean => {
  return !!matchPaths(
    paths,
    [[OPEN_API_PROPERTY_PATHS, PREDICATE_ANY_VALUE, PREDICATE_ANY_VALUE]],
  )
}

export const calculateSpecRefs = (sourceSpec: unknown, normalizedSpec: unknown, operationOnlySpec: unknown): void => {
  const handledObjects = new Set<unknown>()
  const inlineRefs = new Set<string>()
  syncCrawl(
    normalizedSpec,
    ({ key, value }) => {
      if (typeof key === 'symbol' && key !== INLINE_REFS_FLAG) {
        return { done: true }
      }
      if (handledObjects.has(value)) {
        return { done: true }
      }
      handledObjects.add(value)
      if (key !== INLINE_REFS_FLAG) {
        return { value }
      }
      if (!Array.isArray(value)) {
        return { done: true }
      }
      value.forEach(ref => inlineRefs.add(ref))
    },
  )
  inlineRefs.forEach(ref => {
    const path = parseRef(ref).jsonPath
    const matchResult = matchPaths([path], [
      [GRAPH_API_PROPERTY_COMPONENTS, PREDICATE_ANY_VALUE, PREDICATE_ANY_VALUE, PREDICATE_UNCLOSED_END],
    ])
    if (!matchResult) {
      return
    }
    const component = getKeyValue(sourceSpec, ...matchResult.path)
    if (!component) {
      return
    }
    setValueByPath(operationOnlySpec, matchResult.path, component)
  })
}

const copyRuntimeDirectives = (source: GraphApiSchema, target: GraphApiSchema): void => {
  const directives = source.components?.directives
  if (!isObject(directives)) { return }

  const runtimeDirectives = Object.fromEntries(
    Object.entries(directives).filter(([, directive]) => directive.locations.some(location => RUNTIME_DIRECTIVE_LOCATIONS.has(location))),
  )
  if (Object.keys(runtimeDirectives).length === 0) { return }

  const targetRecord = target
  if (!targetRecord.components) {
    targetRecord.components = {}
  }
  targetRecord.components.directives = {
    ...(targetRecord.components.directives),
    ...runtimeDirectives,
  }
}

/**
 * Creates a GraphQL spec containing only the specified operations with resolved component references.
 *
 * @param sourceDocument The original GraphQL document (used as source for operation data and component values).
 * @param normalizedDocument A normalized/refs-only document (used to detect inline refs that must be copied).
 * @param operationsId Array of operation IDs (as produced by calculateGraphqlOperationId) to include.
 * @throws Error when no operations are provided or when any requested operation is missing in the document.
 */
export const createOperationSpec = (
  sourceDocument: GraphApiSchema,
  normalizedDocument: GraphApiSchema,
  operationsId: string[],
): GraphApiSchema => {
  if (operationsId.length === 0) {
    throw new Error(
      'No operations provided. Pass a non-empty array of GraphQL operation IDs.',
    )
  }

  const pickOperationsByIds = (
    document: GraphApiSchema,
    operationsIdSet: Set<string>,
    matchedIds?: Set<string>,
    shallowCopy = false,
  ): Partial<Pick<GraphApiSchema, typeof GRAPHQL_TYPE_KEYS[number]>> => {
    const result: Partial<Pick<GraphApiSchema, typeof GRAPHQL_TYPE_KEYS[number]>> = {}
    for (const type of GRAPHQL_TYPE_KEYS) {
      const operationsByType = document[type]
      if (!operationsByType) { continue }
      for (const method of Object.keys(operationsByType)) {
        const operationId = calculateGraphqlOperationId(GRAPHQL_TYPE[type], method)
        if (!operationsIdSet.has(operationId)) { continue }
        matchedIds?.add(operationId)
        if (!result[type]) {
          result[type] = {}
        }
        result[type]![method] = shallowCopy
          ? { ...operationsByType[method] }
          : operationsByType[method]
      }
    }
    return result
  }

  const operationsIdSet = new Set(operationsId)
  const matchedIds = new Set<string>()
  const resultOperations = pickOperationsByIds(
    sourceDocument,
    operationsIdSet,
    matchedIds,
    true,
  )

  const missingIds = operationsId.filter(id => !matchedIds.has(id))
  if (missingIds.length > 0) {
    throw new Error(
      `Operations not found in document: ${missingIds.join(', ')}`,
    )
  }

  const result: GraphApiSchema = {
    graphapi: sourceDocument.graphapi,
    ...takeIfDefined({ description: sourceDocument.description }),
    ...takeIfDefined({ directives: sourceDocument.directives }),
    ...resultOperations,
    ...takeIfDefined(resultOperations.queries ? { queryTypeName: sourceDocument.queryTypeName } : {}),
    ...takeIfDefined(resultOperations.mutations ? { mutationTypeName: sourceDocument.mutationTypeName } : {}),
    ...takeIfDefined(resultOperations.subscriptions ? { subscriptionTypeName: sourceDocument.subscriptionTypeName } : {}),
  }

  const normalizedOperationSpec = pickOperationsByIds(normalizedDocument, operationsIdSet)

  // Resolve component references from normalizedDocument into result
  calculateSpecRefs(sourceDocument, normalizedOperationSpec, result)

  copyRuntimeDirectives(sourceDocument, result)

  return result
}
