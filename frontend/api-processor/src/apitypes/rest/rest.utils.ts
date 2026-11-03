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
import {
  WithAggregatedDiffs,
  WithDiffMetaRecord,
} from '../../types'
import {
  aggregateDiffsWithRollup,
  apiDiff,
  type CompareOptions,
  Diff,
  DIFF_META_KEY,
  DIFFS_AGGREGATED_META_KEY,
  extractOperationBasePath,
} from '@netcracker/qubership-apihub-api-diff'
import { isEmpty, isObject, isPathParamRenameDiff, isValidHttpMethod } from '../../utils'
import {
  AFTER_VALUE_NORMALIZED_PROPERTY,
  ApihubApiCompatibilityKind,
  BEFORE_VALUE_NORMALIZED_PROPERTY,
  NORMALIZE_OPTIONS,
  ORIGINS_SYMBOL,
} from '../../consts'
import { createRestApiKindValueAt } from '../../components/compare/rest.api-kind'
import { apiKindReclassificationRule, CUSTOM_SCOPE_ELEMENT_API_KIND } from '../../components/compare/custom-scope'

import { dump, getCustomTags, resolveApiAudience } from '../../utils/apihubSpecificationExtensions'

// Re-export shared utilities for backward compatibility
export { dump, getCustomTags, resolveApiAudience } //TODO: just use new utilities for REST

/**
 * The base path an operation is served under. Servers can be declared on the operation, on its path item
 * or on the document, and the nearest declaration wins.
 */
export const resolveOperationBasePath = (
  operation: OpenAPIV3.OperationObject | undefined,
  pathItem: OpenAPIV3.PathItemObject | undefined,
  document?: OpenAPIV3.Document,
): string => {
  return extractOperationBasePath(operation?.servers || pathItem?.servers || document?.servers || [])
}

export const extractOpenapiVersionDiff = (doc: OpenAPIV3.Document): Diff[] => {
  const diff = (doc as WithDiffMetaRecord<OpenAPIV3.Document>)[DIFF_META_KEY]?.openapi
  return diff ? [diff] : []
}

export const extractPathParamRenameDiff = (doc: OpenAPIV3.Document, path: string): Diff[] => {
  const diff = (doc.paths as WithDiffMetaRecord<OpenAPIV3.PathsObject>)[DIFF_META_KEY]?.[path]
  return diff && isPathParamRenameDiff(diff) ? [diff] : []
}

/**
 * Collect an operation's path diffs, out of the roll-up's reach: the path item's record of the method and
 * `paths`'s record of the path. Both are returned, since both can be filled at once. A rename of the path is also
 * returned by `extractPathParamRenameDiff`, so callers deduplicate.
 */
const extractPathDiffs = (
  doc: OpenAPIV3.Document,
  path: string,
  method: OpenAPIV3.HttpMethods,
): Diff[] => {
  const pathItemDiff = (doc.paths[path] as WithDiffMetaRecord<OpenAPIV3.PathItemObject>)[DIFF_META_KEY]?.[method]
  const pathsDiff = (doc.paths as WithDiffMetaRecord<OpenAPIV3.PathsObject>)[DIFF_META_KEY]?.[path]
  return [
    ...pathItemDiff ? [pathItemDiff] : [],
    ...pathsDiff ? [pathsDiff] : [],
  ]
}

export const extractRootServersDiffs = (doc: OpenAPIV3.Document): Diff[] => {
  const addOrRemoveServersDiff = (doc as WithDiffMetaRecord<OpenAPIV3.Document>)[DIFF_META_KEY]?.servers
  const serversInternalDiffs = (doc.servers as WithAggregatedDiffs<OpenAPIV3.ServerObject[]> | undefined)?.[DIFFS_AGGREGATED_META_KEY] ?? []
  return [
    ...(addOrRemoveServersDiff ? [addOrRemoveServersDiff] : []),
    ...serversInternalDiffs,
  ]
}

const extractSecurityDiffs = (source: WithDiffMetaRecord<{ security?: OpenAPIV3.SecurityRequirementObject[] }>): Diff[] => {
  const addOrRemoveSecurityDiff = source[DIFF_META_KEY]?.security
  const securityInternalDiffs = (source.security as WithAggregatedDiffs<OpenAPIV3.SecurityRequirementObject[]> | undefined)?.[DIFFS_AGGREGATED_META_KEY] ?? []
  return [
    ...(addOrRemoveSecurityDiff ? [addOrRemoveSecurityDiff] : []),
    ...securityInternalDiffs,
  ]
}

export const extractRootSecurityDiffs = (doc: OpenAPIV3.Document): Diff[] => {
  return extractSecurityDiffs(doc as WithDiffMetaRecord<OpenAPIV3.Document>)
}

export const extractOperationSecurityDiffs = (operation: OpenAPIV3.OperationObject): Diff[] => {
  return extractSecurityDiffs(operation as WithDiffMetaRecord<OpenAPIV3.OperationObject>)
}

export const extractSecuritySchemesNames = (security: OpenAPIV3.SecurityRequirementObject[]): Set<string> => {
  return new Set(security.flatMap(securityRequirement => Object.keys(securityRequirement)))
}

export const extractSecuritySchemesDiffs = (components: OpenAPIV3.ComponentsObject | undefined, securitySchemesNames: Set<string>): Diff[] => {
  if (!components || !components.securitySchemes) {
    return []
  }
  const result: Diff[] = []

  const addRemoveSecuritySchemesDiffs = (components.securitySchemes as WithDiffMetaRecord<Record<string, OpenAPIV3.SecuritySchemeObject>>)?.[DIFF_META_KEY]
  if (addRemoveSecuritySchemesDiffs) {
    for (const schemeName of securitySchemesNames) {
      const diff = addRemoveSecuritySchemesDiffs[schemeName]
      if (diff) {
        result.push(diff)
      }
    }
  }

  for (const schemeName of securitySchemesNames) {
    const securityScheme = components.securitySchemes[schemeName]
    if (securityScheme) {
      const aggregatedDiffs = (securityScheme as WithAggregatedDiffs<OpenAPIV3.SecuritySchemeObject>)?.[DIFFS_AGGREGATED_META_KEY] ?? []
      result.push(...aggregatedDiffs)
    }
  }


  return result
}

export function validateGroupPrefix(group: unknown, paramName: string): void {
  if (group === undefined) {
    return
  }

  if (typeof group !== 'string') {
    throw new Error(`${paramName} must be a string, received: ${typeof group}`)
  }

  if (group.length < 3 || !group.startsWith('/') || !group.endsWith('/')) {
    throw new Error(`${paramName} must begin and end with a "/" character and contain at least one meaningful character, received: "${group}"`)
  }
}

/** The apiDiff options for two REST documents, shared by the changelog and the duplicate check. */
const REST_DIFF_OPTIONS = {
  ...NORMALIZE_OPTIONS,
  metaKey: DIFF_META_KEY,
  originsFlag: ORIGINS_SYMBOL,
  // the changelog stores the merged document in the shape of its sources; `true` would skip that extra pass
  normalizedResult: false,
  afterValueNormalizedProperty: AFTER_VALUE_NORMALIZED_PROPERTY,
  beforeValueNormalizedProperty: BEFORE_VALUE_NORMALIZED_PROPERTY,
  openApiPathItemPerOperationDiffs: true,
} as const

/** Classification rules a caller adds on top of the api kind ones. */
export type RestDiffClassification = Pick<CompareOptions, 'customScopeElementProviders' | 'reclassificationRules'>

/** One operation of a merged document, with the base path each compared side resolves for it. */
export interface MergedOperation {
  path: string
  method: OpenAPIV3.HttpMethods
  operation: OpenAPIV3.OperationObject
  previousBasePath: string
  currentBasePath: string
}

/** Two REST documents diffed, and the operations of their merged document. */
export interface RestDocumentsDiff {
  merged: OpenAPIV3.Document
  operations: MergedOperation[]
}

/**
 * Diff two REST documents and list the operations to walk, with the roll-up already stamped on them. Two
 * identical documents have nothing to walk.
 *
 * Every comparison classifies by api kind; `classification` adds rules only some callers need, such as the
 * changelog's deprecated-removal rules.
 */
export function diffRestDocuments(
  previous: OpenAPIV3.Document,
  current: OpenAPIV3.Document,
  previousApiKind: ApihubApiCompatibilityKind | undefined,
  currentApiKind: ApihubApiCompatibilityKind | undefined,
  classification: RestDiffClassification = {},
): RestDocumentsDiff {
  const { merged, diffs } = apiDiff(previous, current, {
    ...REST_DIFF_OPTIONS,
    customScopeElementProviders: [
      { name: CUSTOM_SCOPE_ELEMENT_API_KIND, valueAt: createRestApiKindValueAt(previousApiKind, currentApiKind) },
      ...classification.customScopeElementProviders ?? [],
    ],
    reclassificationRules: [apiKindReclassificationRule, ...classification.reclassificationRules ?? []],
  }) as { merged: OpenAPIV3.Document; diffs: Diff[] }

  if (isEmpty(diffs)) { return { merged, operations: [] } }

  aggregateDiffsWithRollup(merged, DIFF_META_KEY, DIFFS_AGGREGATED_META_KEY)
  return { merged, operations: mergedOperations(merged, previous, current) }
}

/**
 * List every operation a merged document holds, in document order.
 *
 * The base path is resolved per operation and per side: an operation can declare `servers` of its own, and the
 * two documents may place one base path differently. apiDiff's path mapping ignores operation-level `servers`,
 * so two documents that differ only there reach this function as two unrelated paths.
 */
function mergedOperations(
  merged: OpenAPIV3.Document,
  previous: OpenAPIV3.Document,
  current: OpenAPIV3.Document,
): MergedOperation[] {
  const operations: MergedOperation[] = []

  for (const path of Object.keys(merged.paths)) {
    const pathItem = merged.paths[path]
    if (!isObject(pathItem)) { continue }

    for (const key of Object.keys(pathItem)) {
      if (!isValidHttpMethod(key)) { continue }
      const operation = pathItem[key] as OpenAPIV3.OperationObject

      operations.push({
        path,
        method: key,
        operation,
        previousBasePath: resolveOperationBasePath(operation, pathItem, previous),
        currentBasePath: resolveOperationBasePath(operation, pathItem, current),
      })
    }
  }

  return operations
}

/**
 * Collect every diff an operation both compared documents have; `aggregateDiffsWithRollup` must have run.
 *
 * Besides the operation's own subtree, that covers what it depends on at the document level: the root `security`
 * when it declares none, the schemes its requirements name, a renamed path parameter, and the root `servers`.
 */
const collectOperationDiffs = (
  merged: OpenAPIV3.Document,
  path: string,
  operation: OpenAPIV3.OperationObject,
): Diff[] => {
  const operationSecurityDiffs = extractOperationSecurityDiffs(operation)
  const shouldTakeRootSecurityDiffs = isEmpty(operationSecurityDiffs) && !operation.security
  const relevantSecuritySchemesNames = shouldTakeRootSecurityDiffs
    ? extractSecuritySchemesNames(merged.security ?? [])
    : extractSecuritySchemesNames(operation.security ?? [])

  return [
    // apiDiff moves path item parameters, servers, summary, description and extensions onto the method, so the
    // roll-up already holds them, along with the operation's own security diffs
    ...(operation as WithAggregatedDiffs<OpenAPIV3.OperationObject>)[DIFFS_AGGREGATED_META_KEY] ?? [],
    ...extractRootServersDiffs(merged),
    ...shouldTakeRootSecurityDiffs ? extractRootSecurityDiffs(merged) : [],
    ...extractSecuritySchemesDiffs(merged.components, relevantSecuritySchemesNames),
    ...extractPathParamRenameDiff(merged, path),
  ]
}

/**
 * Collect the diffs a changelog reports for an operation both versions have: its own diffs, the document's OpenAPI
 * version, and its path diffs when the pair holds the operation's own documents.
 *
 * In any other pair the path diffs describe a move between documents. In the operation's own pair they describe a
 * path respelled to one that derives the same operationId, such as `/res/data` becoming `/res-data`.
 */
export const changelogOperationDiffs = (
  merged: OpenAPIV3.Document,
  path: string,
  method: OpenAPIV3.HttpMethods,
  operation: OpenAPIV3.OperationObject,
  operationBelongsToPair: boolean,
): Diff[] => [...new Set([
  ...collectOperationDiffs(merged, path, operation),
  ...operationBelongsToPair ? extractPathDiffs(merged, path, method) : [],
  ...extractOpenapiVersionDiff(merged),
])]

/**
 * Collect the diff a changelog reports for an operation only one version has. The nearer record only: `paths` can
 * also hold a rename of the path, which belongs to the methods it keeps.
 */
export const addedOrRemovedOperationDiffs = (
  merged: OpenAPIV3.Document,
  path: string,
  method: OpenAPIV3.HttpMethods,
): Diff[] => {
  const diff = (merged.paths[path] as WithDiffMetaRecord<OpenAPIV3.PathItemObject>)[DIFF_META_KEY]?.[method] ??
    (merged.paths as WithDiffMetaRecord<OpenAPIV3.PathsObject>)[DIFF_META_KEY]?.[path]
  return diff ? [diff] : []
}

/**
 * Collect the diffs a duplicate check reads for an operation: its own diffs and its path diffs. The OpenAPI version
 * is left out, because two documents of one version may use different dialects.
 */
export const contestedOperationDiffs = (
  merged: OpenAPIV3.Document,
  path: string,
  method: OpenAPIV3.HttpMethods,
  operation: OpenAPIV3.OperationObject,
): Diff[] => [...new Set([
  ...collectOperationDiffs(merged, path, operation),
  ...extractPathDiffs(merged, path, method),
])]
