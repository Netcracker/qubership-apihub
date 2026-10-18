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

import { BuilderContext, DeprecateItem, NotificationMessage, OperationsApiType, ResolvedOperation } from '../types'
import { DEFAULT_BATCH_SIZE, HASH_FLAG, MESSAGE_CATEGORY, MESSAGE_SEVERITY } from '../consts'
import { executeInBatches, isDeprecatedOperationItem, isString, keyBy } from '../utils'
import { JsonPath } from '@netcracker/qubership-apihub-json-crawl'
import { areDeclarationPathsEqual } from '../utils/path'
import {
  DeferredHash,
  grepValue,
  Jso,
  matchPaths,
  OPEN_API_PROPERTY_COMPONENTS,
  PREDICATE_UNCLOSED_END,
} from '@netcracker/qubership-apihub-api-unifier'

export const calculateHistoryForDeprecatedItems = async (
  apiType: OperationsApiType,
  operations: ResolvedOperation[],
  version: string,
  packageId: string,
  ctx: BuilderContext,
): Promise<void> => {
  const { versionDeprecatedResolver } = ctx

  // the version's list holds every api type, and an operationId is unique only within one: keying the whole
  // list by the bare id would let an operation of another type take the entry the resolver answers for
  const deprecatedOperations = keyBy(
    operations.filter(operation => operation.apiType === apiType)
      .filter(({ deprecated, deprecatedItems }) => deprecated || deprecatedItems?.length),
    ({ operationId }) => operationId,
  )

  await executeInBatches(Object.keys(deprecatedOperations), async (operationIds) => {
    const { operations: resolvedDeprecatedOperations } = await versionDeprecatedResolver(
      apiType,
      version,
      packageId,
      operationIds,
    ) ?? { operations: [] }

    for (const resolvedOperation of resolvedDeprecatedOperations) {
      const currentOperation = deprecatedOperations[resolvedOperation.operationId]
      if (!currentOperation?.deprecatedItems?.length) {
        continue
      }

      try {
        mergeDeprecatedHistory(currentOperation, resolvedOperation)
      } catch (error) {
        // one operation loses its history; every other operation of the version keeps theirs
        ctx.notifications.push({
          category: MESSAGE_CATEGORY.DeprecatedComponentPath,
          severity: MESSAGE_SEVERITY.Error,
          message: error instanceof Error
            ? error.message
            : `Cannot calculate deprecated history for operation '${resolvedOperation.operationId}'`,
          documentId: currentOperation.documentId,
        })
      }
    }
  }, DEFAULT_BATCH_SIZE)
}

/**
 * Carry the previous version's deprecation history onto the operation's matching deprecated items.
 *
 * Schemas and parameters match on the tolerant hash. Anything the unifier stamps no hash on — a deprecated
 * operation, an AsyncAPI channel — matches on the declaration path instead.
 */
function mergeDeprecatedHistory(
  currentOperation: ResolvedOperation,
  resolvedOperation: { deprecatedItems?: DeprecateItem[] },
): void {
  for (const deprecatedItem of currentOperation.deprecatedItems ?? []) {
    const resolvedDeprecatedItem = resolvedOperation.deprecatedItems?.find(
      item => (
        item.tolerantHash && deprecatedItem.tolerantHash
          ? areSameDeprecatedItems(item, deprecatedItem)
          : areDeclarationPathsEqual(item.declarationJsonPaths, deprecatedItem.declarationJsonPaths)
      ),
    )
    if (!resolvedDeprecatedItem) {
      continue
    }

    if (Array.isArray(resolvedDeprecatedItem.deprecatedInPreviousVersions)) {
      deprecatedItem.deprecatedInPreviousVersions.unshift(...resolvedDeprecatedItem.deprecatedInPreviousVersions)
    }
    if (isDeprecatedOperationItem(deprecatedItem)) {
      currentOperation.deprecatedInPreviousVersions = [...new Set(deprecatedItem.deprecatedInPreviousVersions)]
    }
  }
}

function areSameDeprecatedItems(firstItem: DeprecateItem, secondItem: DeprecateItem): boolean {
  if (firstItem.tolerantHash === secondItem.tolerantHash) {
    const firstItemDeclarationPaths = firstItem.declarationJsonPaths
    const secondItemDeclarationPaths = secondItem.declarationJsonPaths

    if (areDeclarationPathsEqual(firstItemDeclarationPaths, secondItemDeclarationPaths)) {
      return true
    } else if (isRefactoringCase(firstItemDeclarationPaths, secondItemDeclarationPaths)) {
      return true // refactoring happens
    }
  }

  return false
}

function isRefactoringCase(firstItemDeclarationPaths: JsonPath[], secondItemDeclarationPaths: JsonPath[]): boolean {
  const hasComponentsInPaths = (paths: JsonPath[]): Set<string> | undefined => paths.reduce((acc, currentValue) => {
    if (acc === undefined) {
      return undefined
    }
    const result = matchSharedComponent(currentValue)
    if (!result) {
      return undefined
    }
    return acc.add(`${result.componentType}.${result.componentName}`)
  }, new Set<string>() as Set<string> | undefined)

  const firstResult = hasComponentsInPaths(firstItemDeclarationPaths)
  const secondResult = hasComponentsInPaths(secondItemDeclarationPaths)

  return !!firstResult && !secondResult ||
    !firstResult && !!secondResult
}

interface MatchResult {
  componentType: string
  componentName: string
}

export const matchSharedComponent = (jsonPath: JsonPath): MatchResult | undefined => {
  const result = matchPaths([jsonPath], [[OPEN_API_PROPERTY_COMPONENTS, grepValue('componentType'), grepValue('componentName'), PREDICATE_UNCLOSED_END]])
  if (!result) {
    return undefined
  }
  const { componentType, componentName } = result.grepValues
  if (!isString(componentType) || !isString(componentName)) {
    throw new Error(`Component type and name can only be a string. JSON path: ${jsonPath}`)
  }
  return { componentType, componentName }
}

/**
 * Run the deferred hash the unifier stamped on a value, or report why there is none and return `undefined`.
 *
 * Both failures are internal builder problems rather than defects in the published contract, so they are
 * `Warning` and never block a release. `documentId` is required so the compiler enforces attribution at any
 * future call site.
 */
export function calculateTolerantHash(
  value: Jso,
  notifications: NotificationMessage[],
  documentId: string,
): string | undefined {
  try {
    const tolerantHash = Object.keys(value).length > 0
      ? HASH_FLAG in value ? value[HASH_FLAG] as DeferredHash | undefined : undefined
      : undefined

    if (!tolerantHash) {
      notifications.push({
        category: MESSAGE_CATEGORY.TolerantHashMissing,
        severity: MESSAGE_SEVERITY.Warning,
        message: '[Deprecated items] Tolerant hash is not defined',
        documentId: documentId,
      })
      return undefined
    }
    return tolerantHash()
  } catch (error) {
    notifications.push({
      category: MESSAGE_CATEGORY.TolerantHashFailed,
      severity: MESSAGE_SEVERITY.Warning,
      message: '[Deprecated items] Something wrong with tolerant hash',
      documentId: documentId,
    })
    return undefined
  }
}
