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
  convertToSlug,
  IGNORE_PATH_PARAM_UNIFIED_PLACEHOLDER,
  isEmpty,
  isOperationRemove,
  normalizePath,
  removeFirstSlash,
  slugify,
  trimSlashes,
} from '../../utils'
import {
  apiDiff,
  breaking,
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
  extractPathParamRenameDiff,
  extractRootSecurityDiffs,
  extractRootServersDiffs,
  extractOperationBasePath,
} from './rest.utils'
import { createOperationChange, getOperationTags, OperationsMap } from '../../components'

export const compareDocuments = async (
  operationsMap: OperationsMap,
  prevDoc: ResolvedVersionDocument | undefined,
  currDoc: ResolvedVersionDocument | undefined,
  ctx: CompareOperationsPairContext,
): Promise<{
  operationChanges: OperationChanges[]
  tags: string[]
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

  const collectOnlyChangedOperations = Boolean(prevDoc && currDoc)

  if (prevDocData && previousGroup) {
    prevDocData = createCopyWithCurrentGroupOperationsOnly(prevDocData, previousGroup)
  }

  if (currDocData && currentGroup) {
    currDocData = createCopyWithCurrentGroupOperationsOnly(currDocData, currentGroup)
  }

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
      diffsAggregatedFlag: DIFFS_AGGREGATED_META_KEY,
      normalizedResult: true,
    },
  ) as { merged: OpenAPIV3.Document; diffs: Diff[] }

  if (isEmpty(diffs)) {
    return { operationChanges: [], tags: [] }
  }

  const currGroupSlug = convertToSlug(currentGroup || '')
  const prevGroupSlug = convertToSlug(previousGroup || '')

  const tags = new Set<string>()
  const changedOperations: OperationChanges[] = []

  for (const path of Object.keys(merged.paths)) {
    const pathData = merged.paths[path]
    if (typeof pathData !== 'object' || !pathData) { continue }

    for (const key of Object.keys(pathData)) {
      const inferredMethod = key as OpenAPIV3.HttpMethods

      // check if field is a valid openapi http method defined in OpenAPIV3.HttpMethods
      if (!Object.values(OpenAPIV3.HttpMethods).includes(inferredMethod)) {
        continue
      }

      const methodData = pathData[inferredMethod]
      // todo if there were actually servers here, we wouldn't have handle it, add a test
      const previousBasePath = extractOperationBasePath(methodData?.servers || pathData?.servers || prevDocData.servers || [])
      const currentBasePath = extractOperationBasePath(methodData?.servers || pathData?.servers || currDocData.servers || [])
      const prevNormalizedOperationId = slugify(`${normalizePath(previousBasePath + path)}-${inferredMethod}`, [], IGNORE_PATH_PARAM_UNIFIED_PLACEHOLDER)
      const currNormalizedOperationId = slugify(`${normalizePath(currentBasePath + path)}-${inferredMethod}`, [], IGNORE_PATH_PARAM_UNIFIED_PLACEHOLDER)

      const { current, previous } = operationsMap[prevNormalizedOperationId] ?? operationsMap[currNormalizedOperationId] /*?? operationsMap[operationId]*/ ?? {}
      if (!current && !previous) {
        const missingOperations = prevNormalizedOperationId === currNormalizedOperationId ? `the ${prevNormalizedOperationId} operation` : `the ${prevNormalizedOperationId} and ${currNormalizedOperationId} operations`
        throw new Error(`Can't find ${missingOperations} from documents pair ${prevDoc?.fileId} and ${currDoc?.fileId}`)
      }
      const operationChanged = Boolean(current && previous)
      const operationAddedOrRemoved = !operationChanged

      let operationDiffs: Diff[] = []
      if (operationChanged && collectOnlyChangedOperations) {
        operationDiffs = [
          ...(methodData as WithAggregatedDiffs<OpenAPIV3.OperationObject>)[DIFFS_AGGREGATED_META_KEY],
          ...extractRootServersDiffs(merged),
          ...extractRootSecurityDiffs(merged),
          ...extractPathParamRenameDiff(merged, path),
          // parameters, servers, summary, description and extensionKeys are moved from path to method in pathItemsUnification during normalization in apiDiff, so no need to aggregate them here
        ]
      }
      if (operationAddedOrRemoved && !collectOnlyChangedOperations) {
        const operationAddedOrRemovedDiff = (merged.paths[path] as WithDiffMetaRecord<OpenAPIV3.PathsObject>)[DIFF_META_KEY]?.[inferredMethod]
        operationDiffs = operationAddedOrRemovedDiff ? [operationAddedOrRemovedDiff] : []
      }

      if (isEmpty(operationDiffs)) {
        continue
      }

      await reclassifyBreakingChanges(previous?.operationId, merged, operationDiffs, ctx)

      changedOperations.push(createOperationChange(apiType, operationDiffs, previous, current, currentGroup, previousGroup))
      getOperationTags(current ?? previous).forEach(tag => tags.add(tag))
    }
  }

  return { operationChanges: changedOperations, tags: Array.from(tags) }
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
      ...Object.fromEntries(Object.keys(paths).map(key => [key, {}])),
    },
    ...rest,
  }
}

export function createCopyWithCurrentGroupOperationsOnly(template: RestOperationData, group: string): RestOperationData {
  const { paths, ...rest } = template
  const groupWithoutEdgeSlashes = trimSlashes(group)

  return {
    paths: {
      ...Object.fromEntries(
        Object.entries(paths)
          .filter(([key]) => removeFirstSlash(key).startsWith(`${groupWithoutEdgeSlashes}/`)) // note that 'api/v10' is a substring of 'api/v1000'
          // remove prefix group for correct path mapping in apiDiff
          // todo support the most common case when a group is in servers instead of hardcoded in path, add a test
          .map(([key, value]) => [removeFirstSlash(key).substring(groupWithoutEdgeSlashes.length), value]),
      ),
    },
    ...rest,
  }
}
