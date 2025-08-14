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

import { RestOperationData, VersionRestOperation } from './rest.types'
import {
  areDeprecatedOriginsNotEmpty,
  IGNORE_PATH_PARAM_UNIFIED_PLACEHOLDER,
  isEmpty,
  isOperationRemove,
  normalizePath,
  removeComponents,
  removeFirstSlash,
  slugify,
} from '../../utils'
import {
  apiDiff,
  breaking,
  COMPARE_MODE_OPERATION,
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
  NormalizedOperationId,
  OperationChanges,
  OperationsApiType,
  ResolvedOperation,
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
import { extractServersDiffs, getOperationBasePath } from './rest.utils'
import { createOperationChange, getOperationTags, takeSubstringIf } from '../../components'

export const compareDocuments = async (apiType: OperationsApiType, operationsMap: Record<NormalizedOperationId, {
  previous?: ResolvedOperation
  current?: ResolvedOperation
}>, prevDoc: ResolvedVersionDocument | undefined, currDoc: ResolvedVersionDocument | undefined, ctx: CompareOperationsPairContext): Promise<{
  operationChanges: OperationChanges[]
  tags: string[]
}> => {
  const { rawDocumentResolver, previousVersion, currentVersion, previousPackageId, currentPackageId } = ctx
  const prevFile = prevDoc && await rawDocumentResolver(previousVersion, previousPackageId, prevDoc.slug)
  const currFile = currDoc && await rawDocumentResolver(currentVersion, currentPackageId, currDoc.slug)
  let prevDocData = prevFile && JSON.parse(await prevFile.text())
  let currDocData = currFile && JSON.parse(await currFile.text())

  if (!prevDocData && currDocData) {
    prevDocData = createCopyWithEmptyPath(currDocData)
  }
  if (prevDocData && !currDocData) {
    currDocData = createCopyWithEmptyPath(prevDocData)
  }

  const { merged, diffs } = apiDiff(
    prevDocData,
    currDocData,
    {
      ...NORMALIZE_OPTIONS,
      metaKey: DIFF_META_KEY,
      originsFlag: ORIGINS_SYMBOL,
      diffsAggregatedFlag: DIFFS_AGGREGATED_META_KEY,
      // mode: COMPARE_MODE_OPERATION,
      normalizedResult: true,
    },
  ) as { merged: OpenAPIV3.Document; diffs: Diff[] }

  if (isEmpty(diffs)) {
    return { operationChanges: [], tags: [] }
  }

  // todo reclassify
  // const olnyBreaking = diffs.filter((diff) => diff.type === breaking)
  // if (olnyBreaking.length > 0 && previous?.operationId) {
  //   await reclassifyBreakingChanges(previous.operationId, diffResult.merged, olnyBreaking, ctx)
  // }

  const { currentGroup, previousGroup } = ctx.config
  const currGroupSlug = slugify(removeFirstSlash(currentGroup || ''))
  const prevGroupSlug = slugify(removeFirstSlash(previousGroup || ''))

  const tags = new Set<string>()
  const changedOperations: OperationChanges[] = []

  for (const path of Object.keys((merged as OpenAPIV3.Document).paths)) {
    const pathData = (merged as OpenAPIV3.Document).paths[path]
    if (typeof pathData !== 'object' || !pathData) { continue }

    for (const key of Object.keys(pathData)) {
      const inferredMethod = key as OpenAPIV3.HttpMethods

      // check if field is a valid openapi http method defined in OpenAPIV3.HttpMethods
      if (!Object.values(OpenAPIV3.HttpMethods).includes(inferredMethod)) {
        continue
      }

      const methodData = pathData[inferredMethod]
      const basePath = getOperationBasePath(methodData?.servers || pathData?.servers || merged.servers || [])
      const operationPath = basePath + path
      const operationId = slugify(`${removeFirstSlash(operationPath)}-${inferredMethod}`)
      const normalizedOperationId = slugify(`${normalizePath(basePath + path)}-${inferredMethod}`, [], IGNORE_PATH_PARAM_UNIFIED_PLACEHOLDER)
      // todo what's with prevslug? which tests affected? which slug to slice prev or curr?
      const qwe = takeSubstringIf(!!currGroupSlug, normalizedOperationId, currGroupSlug.length)

      const { current, previous } = operationsMap[qwe] ?? operationsMap[operationId] ?? {}

      let operationDiffs: Diff[] = []
      if (current && previous) {
        operationDiffs = [
          ...(methodData as WithAggregatedDiffs<OpenAPIV3.OperationObject>)[DIFFS_AGGREGATED_META_KEY],
          // todo what about security? add test
          ...extractServersDiffs(merged),
        ]

        const pathParamRenameDiff = (merged.paths as WithDiffMetaRecord<OpenAPIV3.PathsObject>)[DIFF_META_KEY]?.[path]
        pathParamRenameDiff && operationDiffs.push(pathParamRenameDiff)
      } else if (current || previous) {
        const operationDiff = (merged.paths[path] as WithDiffMetaRecord<OpenAPIV3.PathsObject>)[DIFF_META_KEY]?.[inferredMethod]
        if (!operationDiff) {
          // ignore removed and added operations, they'll be handled in a separate docs comparison
          continue
        }
        const deprecatedInVersionsCount = previousVersionDeprecations?.operations.find((operation) => operation.operationId === operationId)?.deprecatedInPreviousVersions?.length ?? 0
        if (isOperationRemove(operationDiff) && deprecatedInVersionsCount > 1) {
          operationDiff.type = risky
        }
        operationDiffs.push(operationDiff)
      }

      if (isEmpty(operationDiffs)) {
        continue
      }

      // todo operationDiffs can be [undefined] in 'type error must not appear during build'
      changedOperations.push(createOperationChange(apiType, operationDiffs, previous, current, currGroupSlug, prevGroupSlug, currentGroup, previousGroup))
      getOperationTags(current ?? previous).forEach(tag => tags.add(tag))
    }
  }

  return { operationChanges: changedOperations, tags: [...tags.values()] }
}

/** @deprecated */
export const compareRestOperationsData = async (current: VersionRestOperation | undefined, previous: VersionRestOperation | undefined, ctx: CompareOperationsPairContext): Promise<Diff[]> => {

  let previousOperation = removeComponents(previous?.data)
  let currentOperation = removeComponents(current?.data)
  if (!previousOperation && currentOperation) {
    previousOperation = createCopyWithEmptyPath(currentOperation as RestOperationData)
  }

  if (previousOperation && !currentOperation) {
    currentOperation = createCopyWithEmptyPath(previousOperation as RestOperationData)
  }

  const diffResult = apiDiff(
    previousOperation,
    currentOperation,
    {
      ...NORMALIZE_OPTIONS,
      originsFlag: ORIGINS_SYMBOL,
      mode: COMPARE_MODE_OPERATION,
      normalizedResult: true,
      beforeSource: previous?.data,
      afterSource: current?.data,
    },
  )
  const olnyBreaking = diffResult.diffs.filter((diff) => diff.type === breaking)
  if (olnyBreaking.length > 0 && previous?.operationId) {
    await reclassifyBreakingChanges(previous.operationId, diffResult.merged, olnyBreaking, ctx)
  }
  return diffResult.diffs
}

async function reclassifyBreakingChanges(
  operationId: string,
  mergedJso: unknown,
  diffs: Diff[],
  ctx: CompareOperationsPairContext,
): Promise<void> {
  if (!ctx.previousVersion || !ctx.previousPackageId) {
    return
  }
  const previosVersionDeprecations = await ctx.versionDeprecatedResolver(REST_API_TYPE, ctx.previousVersion, ctx.previousPackageId, [operationId])
  if (!previosVersionDeprecations) {
    return
  }

  const previousOperation = previosVersionDeprecations.operations[0]

  if (!previousOperation?.deprecatedItems) { return }

  for (const diff of diffs) {
    if (diff.type !== breaking) {
      continue
    }

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
  if (diffs.length) {
    const requiredProperties = findRequiredRemovedProperties(mergedJso, diffs)

    requiredProperties?.forEach(prop => {
      if (prop.propDiff.type === RISKY_CHANGE_TYPE && prop.requiredDiff?.type === BREAKING_CHANGE_TYPE) {
        prop.requiredDiff.type = risky
      }
    })
  }
}

export function createCopyWithEmptyPath(template: RestOperationData): RestOperationData {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { paths, ...rest } = template

  return {
    paths: {
      ...Object.fromEntries(Object.keys(template.paths).map(key => [key, {}])),
    },
    ...rest,
  }
}
