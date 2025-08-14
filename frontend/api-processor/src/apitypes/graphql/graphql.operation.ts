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

import type { BuildConfig, DeprecateItem, NotificationMessage } from '../../types'
import { API_AUDIENCE_EXTERNAL } from '../../types'
import {
  getKeyValue,
  getSplittedVersionKey,
  isOperationDeprecated,
  rawToApiKind,
  removeComponents,
  setValueByPath,
  takeIf,
  takeIfDefined,
} from '../../utils'
import { API_KIND, INLINE_REFS_FLAG, ORIGINS_SYMBOL, VERSION_STATUS } from '../../consts'
import { GraphQLSchemaType, VersionGraphQLDocument, VersionGraphQLOperation } from './graphql.types'
import { GRAPHQL_API_TYPE, GRAPHQL_TYPE } from './graphql.consts'
import { GraphApiSchema } from '@netcracker/qubership-apihub-graphapi'
import { toTitleCase } from '../../utils/strings'
import { calculateObjectHash } from '../../utils/hashes'
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
  debugCtx?: DebugPerformanceContext,
): VersionGraphQLOperation => {
  const singleOperationSpec: GraphApiSchema = cropToSingleOperation(document.data, type, method)
  const singleOperationEffectiveSpec: GraphApiSchema = cropToSingleOperation(effectiveDocument, type, method)
  const singleOperationRefsOnlySpec: GraphApiSchema = cropToSingleOperation(refsOnlyDocument, type, method)

  const deprecatedItems: DeprecateItem[] = syncDebugPerformance('[DeprecatedItems]', () => {
    const foundedDeprecatedItems = calculateDeprecatedItems(singleOperationEffectiveSpec, ORIGINS_SYMBOL)
    const result: DeprecateItem[] = []
    for (const item of foundedDeprecatedItems) {
      const { description, value, deprecatedReason } = item
      const declarationJsonPaths = resolveOrigins(value, JSON_SCHEMA_PROPERTY_DEPRECATED, ORIGINS_SYMBOL)?.map(pathItemToFullPath) ?? []

      const isOperation = isOperationPaths(declarationJsonPaths)
      const [version] = getSplittedVersionKey(config.version)

      const hash = isOperation ? undefined : calculateObjectHash(value)
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

  const apiKind = document.apiKind || API_KIND.BWC

  syncDebugPerformance('[ModelsAndOperationHashing]', () => {
    calculateSpecRefs(document.data, singleOperationRefsOnlySpec, singleOperationSpec)
  }, debugCtx)

  return {
    operationId,
    documentId: document.slug,
    dataHash: 'dataHash is to be removed',
    apiType: GRAPHQL_API_TYPE,
    apiKind: rawToApiKind(apiKind),
    deprecated: !!singleOperationEffectiveSpec[type]?.[method]?.directives?.deprecated,
    title: toTitleCase(method),
    metadata: {
      type: GRAPHQL_TYPE[type],
      method: method,
    },
    tags: [type],
    data: singleOperationSpec,
    searchScopes: {},
    deprecatedItems,
    models: {},
    apiAudience: API_AUDIENCE_EXTERNAL,
  }
}

const isOperationPaths = (paths: JsonPath[]): boolean => {
  return !!matchPaths(
    paths,
    [[OPEN_API_PROPERTY_PATHS, PREDICATE_ANY_VALUE, PREDICATE_ANY_VALUE]],
  )
}

// todo output of this method disrupts document normalization.
//  origin symbols are not being transferred to the resulting spec.
//  DO NOT pass output of this method to apiDiff
const cropToSingleOperation = (
  specification: GraphApiSchema,
  type: GraphQLSchemaType,
  method: string,
): GraphApiSchema => {
  const onlyOperationsSpec = removeComponents(specification) as GraphApiSchema
  const operationBody = onlyOperationsSpec[type]?.[method]
  return {
    graphapi: onlyOperationsSpec.graphapi,
    ...takeIfDefined({ components: onlyOperationsSpec.components }),
    [type]: {
      [method]: operationBody,
    },
  }
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
