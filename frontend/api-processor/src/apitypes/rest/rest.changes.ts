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

import { RestOperationData } from './rest.types'
import {
  areDeprecatedOriginsNotEmpty,
  IGNORE_PATH_PARAM_UNIFIED_PLACEHOLDER,
  isEmpty,
  isOperationRemove,
  isValidHttpMethod,
  normalizePath,
  removeFirstSlash,
  slugify,
  trimSlashes,
} from '../../utils'
import {
  aggregateDiffsWithRollup,
  apiDiff,
  breaking,
  extractOperationBasePath,
  Diff,
  DIFF_META_KEY,
  DiffAction,
  DIFFS_AGGREGATED_META_KEY,
  risky,
} from '@netcracker/qubership-apihub-api-diff'
import { MESSAGE_SEVERITY, NORMALIZE_OPTIONS, ORIGINS_SYMBOL } from '../../consts'
import {
  BREAKING_CHANGE_TYPE,
  CompareOperationsPairContext,
  OperationChanges,
  ResolvedVersionDocument,
  RISKY_CHANGE_TYPE,
  WithAggregatedDiffs,
  WithDiffMetaRecord,
} from '../../types'
import { isObject } from '@netcracker/qubership-apihub-json-crawl'
import { areDeclarationPathsEqual } from '../../utils/path'
import {
  JSON_SCHEMA_PROPERTY_DEPRECATED,
  pathItemToFullPath,
  resolveOrigins,
} from '@netcracker/qubership-apihub-api-unifier'
import { findRequiredRemovedProperties } from './rest.required'
import { calculateObjectHash } from '../../utils/hashes'
import { REST_API_TYPE } from './rest.consts'
import { OpenAPIV3 } from 'openapi-types'
import {
  extractOpenapiVersionDiff,
  extractPathParamRenameDiff,
  extractRootSecurityDiffs,
  extractRootServersDiffs,
  validateGroupPrefix,
} from './rest.utils'
import { createOperationChange, getOperationTags, OperationsMap } from '../../components'

/**
 * Calculates a normalized operation ID for an operation.
 *
 * @param basePath - The base path from servers configuration
 * @param path - The operation path
 * @param method - The HTTP method
 * @returns The normalized operation ID
 */
function calculateNormalizedOperationId(basePath: string, path: string, method: string): string {
  return slugify(`${normalizePath(basePath + path)}-${method}`, [], IGNORE_PATH_PARAM_UNIFIED_PLACEHOLDER)
}

export const compareDocuments = async (
  operationsMap: OperationsMap,
  prevDoc: ResolvedVersionDocument | undefined,
  currDoc: ResolvedVersionDocument | undefined,
  ctx: CompareOperationsPairContext,
): Promise<{
  operationChanges: OperationChanges[]
  tags: Set<string>
}> => {
  const {
    apiType,
    rawDocumentResolver,
    previousVersion,
    currentVersion,
    previousPackageId,
    currentPackageId,
    currentGroup,
    previousGroup,
  } = ctx
  const prevFile = prevDoc && await rawDocumentResolver(previousVersion, previousPackageId, prevDoc.slug)
  const currFile = currDoc && await rawDocumentResolver(currentVersion, currentPackageId, currDoc.slug)
  let prevDocData = prevFile && JSON.parse(await prevFile.text())
  let currDocData = currFile && JSON.parse(await currFile.text())

  // create a copy of the document with only the operations belonging to the prefix group if there are prefix groups
  if (prevDocData && previousGroup) {
    prevDocData = createCopyWithPrefixGroupOperationsOnly(prevDocData, previousGroup)
  }
  if (currDocData && currentGroup) {
    currDocData = createCopyWithPrefixGroupOperationsOnly(currDocData, currentGroup)
  }

  // create an empty counterpart of the document for the case when one of the documents is empty
  if (!prevDocData && currDocData) {
    prevDocData = createCopyWithEmptyPathItems(currDocData)
  }
  if (prevDocData && !currDocData) {
    currDocData = createCopyWithEmptyPathItems(prevDocData)
  }

  const { merged, diffs } = apiDiff(
    prevDocData,
    currDocData,
    {
      ...NORMALIZE_OPTIONS,
      metaKey: DIFF_META_KEY,
      originsFlag: ORIGINS_SYMBOL,
      normalizedResult: true,
    },
  ) as { merged: OpenAPIV3.Document; diffs: Diff[] }

  if (isEmpty(diffs)) {
    return { operationChanges: [], tags: new Set() }
  }

  aggregateDiffsWithRollup(merged, DIFF_META_KEY, DIFFS_AGGREGATED_META_KEY)

  const tags = new Set<string>()
  const operationChanges: OperationChanges[] = []

  for (const path of Object.keys(merged.paths)) {
    const pathData = merged.paths[path]
    if (typeof pathData !== 'object' || !pathData) { continue }

    for (const key of Object.keys(pathData)) {
      const inferredMethod = key as OpenAPIV3.HttpMethods

      if (!isValidHttpMethod(inferredMethod)) {
        continue
      }

      const methodData = pathData[inferredMethod]
      // todo if there were actually servers here, we wouldn't have handle it, add a test
      const previousBasePath = extractOperationBasePath(methodData?.servers || pathData?.servers || prevDocData.servers || [])
      const currentBasePath = extractOperationBasePath(methodData?.servers || pathData?.servers || currDocData.servers || [])
      const prevNormalizedOperationId = calculateNormalizedOperationId(previousBasePath, path, inferredMethod)
      const currNormalizedOperationId = calculateNormalizedOperationId(currentBasePath, path, inferredMethod)

      const { current, previous } = operationsMap[prevNormalizedOperationId] ?? operationsMap[currNormalizedOperationId] ?? {}
      if (!current && !previous) {
        const missingOperations = prevNormalizedOperationId === currNormalizedOperationId ? `the ${prevNormalizedOperationId} operation` : `the ${prevNormalizedOperationId} and ${currNormalizedOperationId} operations`
        throw new Error(`Can't find ${missingOperations} from documents pair ${prevDoc?.fileId} and ${currDoc?.fileId}`)
      }
      const operationPotentiallyChanged = Boolean(current && previous)
      const operationAddedOrRemoved = !operationPotentiallyChanged

      let operationDiffs: Diff[] = []
      if (operationPotentiallyChanged) {
        operationDiffs = [
          ...(methodData as WithAggregatedDiffs<OpenAPIV3.OperationObject>)[DIFFS_AGGREGATED_META_KEY] ?? [],
          ...extractOpenapiVersionDiff(merged),
          ...extractRootServersDiffs(merged),
          ...extractRootSecurityDiffs(merged),
          ...extractPathParamRenameDiff(merged, path),
          // parameters, servers, summary, description and extensionKeys are moved from path to method in pathItemsUnification during normalization in apiDiff, so no need to aggregate them here
        ]
      }
      if (operationAddedOrRemoved) {
        const operationAddedOrRemovedDiffFromSpecificPath = (merged.paths[path] as WithDiffMetaRecord<OpenAPIV3.PathsObject>)[DIFF_META_KEY]?.[inferredMethod]
        const operationAddedOrRemovedDiffFromPaths = (merged.paths as WithDiffMetaRecord<OpenAPIV3.PathsObject>)[DIFF_META_KEY]?.[path]
        const operationAddedOrRemovedDiff = operationAddedOrRemovedDiffFromSpecificPath ?? operationAddedOrRemovedDiffFromPaths
        operationDiffs = operationAddedOrRemovedDiff ? [operationAddedOrRemovedDiff] : []
      }

      if (isEmpty(operationDiffs)) {
        continue
      }

      await reclassifyBreakingChanges(previous?.operationId, merged, operationDiffs, ctx)

      operationChanges.push(createOperationChange(apiType, operationDiffs, previous, current, currentGroup, previousGroup))
      getOperationTags(current ?? previous).forEach(tag => tags.add(tag))
    }
  }

  return { operationChanges, tags }
}

async function reclassifyBreakingChanges(
  previousOperationId: string | undefined,
  mergedJso: unknown,
  diffs: Diff[],
  ctx: CompareOperationsPairContext,
): Promise<void> {
  if (!previousOperationId || !ctx.previousVersion || !ctx.previousPackageId) {
    return
  }

  const onlyBreaking = diffs.filter((diff) => diff.type === breaking)
  if (isEmpty(onlyBreaking)) {
    return
  }

  const previousVersionDeprecations = await ctx.versionDeprecatedResolver(REST_API_TYPE, ctx.previousVersion, ctx.previousPackageId, [previousOperationId])
  if (!previousVersionDeprecations) {
    return
  }

  const [previousOperation] = previousVersionDeprecations.operations

  if (!previousOperation?.deprecatedItems) { return }

  for (const diff of onlyBreaking) {
    const deprecatedInVersionsCount = previousOperation?.deprecatedInPreviousVersions?.length ?? 0
    if (isOperationRemove(diff) && deprecatedInVersionsCount > 1) {
      diff.type = risky
      continue
    }

    if (diff.action !== DiffAction.remove) {
      continue
    }

    if (!isObject(diff.beforeNormalizedValue)) {
      ctx.notifications.push({
        severity: MESSAGE_SEVERITY.Error,
        message: '[Risky validation] Something wrong with beforeNormalizedValue from diff',
      })
      continue
    }
    if (!diff.beforeNormalizedValue[JSON_SCHEMA_PROPERTY_DEPRECATED]) { continue }

    if (!areDeprecatedOriginsNotEmpty(diff.beforeNormalizedValue)) {
      ctx.notifications.push({
        severity: MESSAGE_SEVERITY.Error,
        message: '[Risky validation] Something wrong with origins',
      })
      continue
    }

    const beforeHash = calculateObjectHash(diff.beforeNormalizedValue)

    const deprecatedItems = previousOperation?.deprecatedItems ?? []
    let deprecatedItem

    for (let i = 0; i < deprecatedItems.length; i++) {
      const item = deprecatedItems[i]
      if (beforeHash !== item.hash) { continue }
      if (areDeclarationPathsEqual(
        item.declarationJsonPaths,
        resolveOrigins(diff.beforeNormalizedValue, JSON_SCHEMA_PROPERTY_DEPRECATED, ORIGINS_SYMBOL)?.map(pathItemToFullPath) ?? [],
      )) {
        deprecatedItem = item
        break
      }
    }

    if (deprecatedItem && deprecatedItem?.deprecatedInPreviousVersions?.length > 1) {
      diff.type = risky
    }
  }
  // mark removed required status of the property as risky
  const requiredProperties = findRequiredRemovedProperties(mergedJso, onlyBreaking)

  requiredProperties?.forEach(prop => {
    if (prop.propDiff.type === RISKY_CHANGE_TYPE && prop.requiredDiff?.type === BREAKING_CHANGE_TYPE) {
      prop.requiredDiff.type = risky
    }
  })
}

export function createCopyWithEmptyPathItems(template: RestOperationData): RestOperationData {
  const { paths, ...rest } = template

  return {
    paths: {
      ...Object.fromEntries(
        Object.keys(paths).map(key => [key, {}]),
      ),
    },
    ...rest,
  }
}

/**
 * Creates a copy of the given RestOperationData, but only includes path items belonging to the specified prefix group.
 * All returned paths are adjusted to include any relevant basePath prefixes.
 * All servers objects are removed from the resulting structure, as prefix group comparisons do not consider them.
 *
 * @param {RestOperationData} source - The source RestOperationData object to copy from.
 * @param {string} groupPrefix - The base path prefix (group) used to select which operations to include.
 *   This should be a slash-bounded OpenAPI path group, e.g. "/api/v1/".
 * @returns {RestOperationData} A copy of the template including only paths belonging to the specified group,
 *   with their paths remapped (prefix removed) and with all servers removed from path items and the root.
 */
export function createCopyWithPrefixGroupOperationsOnly(source: RestOperationData, groupPrefix: string): RestOperationData {
  validateGroupPrefix(groupPrefix, 'groupPrefix')

  const groupWithoutEdgeSlashes = trimSlashes(groupPrefix)

  // Since we are anyway composing synthetic specs for prefix groups comparison, we can incorporate
  // base paths from root servers and path item servers into the paths.
  // We also remove servers objects, since changes in servers for prefix groups are not relevant.
  // Note that servers in operation objects are not taken into account
  // (it is impossible to support them in api-diff mapping
  // and they are considered bad practice on OpenAPI specifications anyway)
  const result: RestOperationData = {
    ...source,
    paths: {
      ...Object.fromEntries(
        Object.entries(source.paths)
          .map(([pathKey, pathItem]) => {
            // Path item servers take precedence over root servers
            const pathItemServers = (pathItem as OpenAPIV3.PathItemObject)?.servers
            const basePath = extractOperationBasePath(pathItemServers || source.servers || [])

            // Prepend base path to the path
            const fullPath = basePath ? `/${trimSlashes(basePath)}/${trimSlashes(pathKey)}`.replace(/\/+/g, '/') : pathKey

            // Remove servers from path item copy using delete to preserve property order
            const pathItemCopy = { ...(pathItem as OpenAPIV3.PathItemObject) }
            delete pathItemCopy.servers

            return [fullPath, pathItemCopy] as const
          })
          .filter(([key]) => removeFirstSlash(key as string).startsWith(`${groupWithoutEdgeSlashes}/`)) // note that 'api/v10' is a substring of 'api/v1000'
          // remove group prefix for correct path mapping in apiDiff
          .map(([key, value]) => [removeFirstSlash(key as string).substring(groupWithoutEdgeSlashes.length), value]),
      ),
    },
  }

  // Remove servers from root level using delete to preserve property order
  delete result.servers

  return result
}
