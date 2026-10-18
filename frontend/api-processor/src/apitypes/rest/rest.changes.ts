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
  calculateNormalizedRestOperationId,
  isEmpty,
  isValidHttpMethod,
  removeFirstSlash,
  trimSlashes,
} from '../../utils'
import {
  aggregateDiffsWithRollup,
  apiDiff,
  Diff,
  DIFF_META_KEY,
  DIFFS_AGGREGATED_META_KEY,
  extractOperationBasePath,
} from '@netcracker/qubership-apihub-api-diff'
import {
  AFTER_VALUE_NORMALIZED_PROPERTY,
  BEFORE_VALUE_NORMALIZED_PROPERTY,
  NORMALIZE_OPTIONS,
  ORIGINS_SYMBOL,
} from '../../consts'
import {
  CompareOperationsPairContext,
  ComparisonDocument,
  DocumentsCompare,
  DocumentsCompareData,
  OperationChanges,
  ResolvedVersionDocument,
  WithAggregatedDiffs,
  WithDiffMetaRecord,
} from '../../types'
import { OpenAPIV3 } from 'openapi-types'
import {
  extractOpenapiVersionDiff,
  extractOperationSecurityDiffs,
  extractPathParamRenameDiff,
  extractRootSecurityDiffs,
  extractRootServersDiffs,
  extractSecuritySchemesDiffs,
  extractSecuritySchemesNames,
  resolveOperationBasePath,
  validateGroupPrefix,
} from './rest.utils'
import {
  createComparisonDocument,
  createComparisonInternalDocumentId,
  createOperationChange,
  getOperationTags,
  OperationsMap,
} from '../../components'
import { createRestApiKindValueAt } from '../../components/compare/rest.api-kind'
import { apiKindReclassificationRule, CUSTOM_SCOPE_ELEMENT_API_KIND } from '../../components/compare/custom-scope'
import { createDeprecatedRemovalRules } from './rest.deprecated.classification'

export const compareDocuments: DocumentsCompare = async (
  operationsMap: OperationsMap,
  prevDoc: ResolvedVersionDocument | undefined,
  currDoc: ResolvedVersionDocument | undefined,
  ctx: CompareOperationsPairContext,
): Promise<DocumentsCompareData> => {
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
  const comparisonInternalDocumentId = createComparisonInternalDocumentId(previousVersion, previousPackageId, prevDoc?.slug, currentVersion, currentPackageId, currDoc?.slug)
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

  // Both documents carry the api kind their own build resolved from the specification, labels and `xApiKind`
  const currDocumentApiKind = currDoc?.apiKind
  const prevDocumentApiKind = prevDoc?.apiKind

  const deprecatedRemovalRules = await createDeprecatedRemovalRules(operationsMap, prevDoc, prevDocData, ctx)

  const { merged, diffs } = apiDiff(
    prevDocData,
    currDocData,
    {
      ...NORMALIZE_OPTIONS,
      metaKey: DIFF_META_KEY,
      originsFlag: ORIGINS_SYMBOL,
      // expected performance degradation, we need not normalized doc for comparisonDocument
      normalizedResult: false,
      afterValueNormalizedProperty: AFTER_VALUE_NORMALIZED_PROPERTY,
      beforeValueNormalizedProperty: BEFORE_VALUE_NORMALIZED_PROPERTY,
      customScopeElementProviders: [
        {
          name: CUSTOM_SCOPE_ELEMENT_API_KIND,
          valueAt: createRestApiKindValueAt(prevDocumentApiKind, currDocumentApiKind),
        },
        ...deprecatedRemovalRules.customScopeElementProviders,
      ],
      reclassificationRules: [apiKindReclassificationRule, ...deprecatedRemovalRules.reclassificationRules],
      openApiPathItemPerOperationDiffs: true,
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
      const previousBasePath = resolveOperationBasePath(methodData, pathData, prevDocData)
      const currentBasePath = resolveOperationBasePath(methodData, pathData, currDocData)
      const prevNormalizedOperationId = calculateNormalizedRestOperationId(previousBasePath, path, inferredMethod)
      const currNormalizedOperationId = calculateNormalizedRestOperationId(currentBasePath, path, inferredMethod)

      const {
        current,
        previous,
      } = operationsMap[prevNormalizedOperationId] ?? operationsMap[currNormalizedOperationId] ?? {}
      if (!current && !previous) {
        const missingOperations = prevNormalizedOperationId === currNormalizedOperationId ? `the ${prevNormalizedOperationId} operation` : `the ${prevNormalizedOperationId} and ${currNormalizedOperationId} operations`
        throw new Error(`Can't find ${missingOperations} from documents pair ${prevDoc?.fileId} and ${currDoc?.fileId}`)
      }
      const operationPotentiallyChanged = Boolean(current && previous)
      const operationAddedOrRemoved = !operationPotentiallyChanged

      let operationDiffs: Diff[] = []
      if (operationPotentiallyChanged) {
        const operationSecurityDiffs = extractOperationSecurityDiffs(methodData as OpenAPIV3.OperationObject)
        const shouldTakeRootSecurityDiffs = operationSecurityDiffs.length === 0 && !methodData?.security
        const relevantSecuritySchemesNames = shouldTakeRootSecurityDiffs ? extractSecuritySchemesNames(merged.security ?? []) : extractSecuritySchemesNames(methodData?.security ?? [])
        operationDiffs = [
          ...(methodData as WithAggregatedDiffs<OpenAPIV3.OperationObject>)[DIFFS_AGGREGATED_META_KEY] ?? [],
          ...extractOpenapiVersionDiff(merged),
          ...extractRootServersDiffs(merged),
          ...shouldTakeRootSecurityDiffs ? extractRootSecurityDiffs(merged) : [],
          ...extractSecuritySchemesDiffs(merged.components, relevantSecuritySchemesNames),
          ...extractPathParamRenameDiff(merged, path),
          // parameters, servers, summary, description and extensionKeys are moved from path to method in pathItemsUnification during normalization in apiDiff, so no need to aggregate them here
          // note that operation security diffs are not aggregated here, because they are in aggregated diffs for operation object
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

      operationChanges.push(createOperationChange(apiType, operationDiffs, comparisonInternalDocumentId, previous, current, currentGroup, previousGroup))
      getOperationTags(current ?? previous).forEach(tag => tags.add(tag))
    }
  }

  let comparisonDocument: ComparisonDocument | undefined
  if (operationChanges.length) {
    comparisonDocument = createComparisonDocument(comparisonInternalDocumentId, merged)
  }

  return {
    operationChanges,
    tags,
    ...(comparisonDocument) ? { comparisonDocument } : {},
  }
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
