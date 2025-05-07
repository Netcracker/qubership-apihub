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
import { areDeprecatedOriginsNotEmpty, isOperationRemove, removeComponents } from '../../utils'
import {
  apiDiff,
  breaking,
  COMPARE_MODE_OPERATION,
  Diff,
  DiffAction,
  risky,
} from '@netcracker/qubership-apihub-api-diff'
import { MESSAGE_SEVERITY, NORMALIZE_OPTIONS, ORIGINS_SYMBOL } from '../../consts'
import {
  BREAKING_CHANGE_TYPE,
  CompareOperationsPairContext,
  RISKY_CHANGE_TYPE,
} from '../../types'
import { isObject } from '@netcracker/qubership-apihub-json-crawl'
import { areDeclarationPathsEqual } from '../../utils/path'
import { JSON_SCHEMA_PROPERTY_DEPRECATED, pathItemToFullPath, resolveOrigins } from '@netcracker/qubership-apihub-api-unifier'
import { findRequiredRemovedProperties } from './rest.required'
import { calculateObjectHash } from '../../utils/hashes'
import { REST_API_TYPE } from './rest.consts'

export const compareRestOperationsData = async (current: VersionRestOperation | undefined, previous: VersionRestOperation | undefined, ctx: CompareOperationsPairContext): Promise<Diff[]> => {

  let previousOperation = removeComponents(previous?.data)
  let currentOperation = removeComponents(current?.data)
  if (!previousOperation && currentOperation) {
    previousOperation = getCopyWithEmptyPath(currentOperation as RestOperationData)
  }

  if (previousOperation && !currentOperation) {
    currentOperation = getCopyWithEmptyPath(previousOperation as RestOperationData)
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
  previosVersionDeprecations.operations[0]

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

function getCopyWithEmptyPath(template: RestOperationData): RestOperationData {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { paths, ...rest } = template
  return {
    paths: {},
    ...rest,
  }
}
