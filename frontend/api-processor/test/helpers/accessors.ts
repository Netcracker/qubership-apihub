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

import {
  ApiOperation,
  BuildResult,
  DeprecateItem,
  MESSAGE_SEVERITY,
  MessageCategory,
  NotificationMessage,
  OperationChanges,
  OperationsApiType,
  OperationType,
  REST_API_TYPE,
  VersionDocument,
  VersionsComparison,
} from '../../src/processor'
import { operationKey } from '../../src/components/operations'

/**
 * The changes one operation carries in the first comparison of a build. Throws rather than returning
 * `undefined`, and names the operations that are there, because a lookup missing here usually means the
 * fixture produced different ids, not that the operation has no changes.
 */
export function operationChangesOf(result: BuildResult, operationId: string): OperationChanges {
  const data = result.comparisons[0]?.data ?? []
  const changes = data.find(item => item.operationId === operationId)
  if (!changes) {
    throw new Error(`Comparison has no changes for operation ${operationId}. Operations: ${listOf(data.map(item => item.operationId))}`)
  }
  return changes
}

/**
 * Every deprecated item the build's operations carry, in operation order. An operation without any adds
 * nothing, where a bare `flatMap(({ deprecatedItems }) => deprecatedItems)` adds an `undefined` and so changes
 * the count.
 */
export function deprecatedItemsOf(result: BuildResult): DeprecateItem[] {
  return Array.from(result.operations.values()).flatMap(({ deprecatedItems }) => deprecatedItems ?? [])
}

/**
 * One operation of a build result. Throws rather than returning `undefined`, and names the keys that are
 * there: a miss is usually a fixture producing different ids, and `result.operations.get(id)?.field` turns
 * that into a complaint about the field instead of about the id.
 *
 * Takes the bare `operationId` and builds the map key, so call sites stop spelling
 * `operationKey({ apiType: REST_API_TYPE, operationId })` by hand.
 */
export function operationOf(
  result: BuildResult,
  operationId: string,
  apiType: OperationsApiType = REST_API_TYPE,
): ApiOperation {
  const key = operationKey({ apiType, operationId })
  const operation = result.operations.get(key)
  if (!operation) {
    throw new Error(`Build result has no operation ${key}. Operations: ${keysOf(result.operations)}`)
  }
  return operation
}

/**
 * One document of a build result, by `fileId`. Not by slug: every writer of that map — `setDocument`,
 * `buildDocuments` and the document-group strategy — keys it by `fileId`.
 */
export function documentOf(result: BuildResult, fileId: string): VersionDocument {
  const document = result.documents.get(fileId)
  if (!document) {
    throw new Error(`Build result has no document ${fileId}. Documents: ${keysOf(result.documents)}`)
  }
  return document
}

// Nothing at all is the most confusing miss of them all, so the message says so instead of trailing
// off after the colon, which is what `operationChangesOf` printed as a bare `undefined`.
function listOf(names: readonly (string | undefined)[]): string {
  return names.length ? names.join(', ') : '(none)'
}

function keysOf(map: ReadonlyMap<string, unknown>): string {
  return listOf(Array.from(map.keys()))
}

/**
 * The operation types of one comparison, selected by api type.
 *
 * Throws on anything but exactly one comparison. A dashboard changelog produces one per reference pair,
 * so that case needs an index rather than a looser guard.
 */
export function operationTypeOf(result: BuildResult, apiType: OperationsApiType = REST_API_TYPE): OperationType {
  const comparison = soleComparisonOf(result)
  const operationType = comparison.operationTypes.find(type => type.apiType === apiType)
  if (!operationType) {
    const available = comparison.operationTypes.map(type => type.apiType)
    throw new Error(`Comparison carries no '${apiType}' operation type. API types: ${listOf(available)}`)
  }
  return operationType
}

function soleComparisonOf(result: BuildResult): VersionsComparison {
  const { comparisons } = result
  if (comparisons.length !== 1) {
    throw new Error(`Expected the build to carry one comparison, found ${comparisons.length}`)
  }
  return comparisons[0]
}

/**
 * Select notifications by severity or by category.
 *
 * Unlike the lookups above, these return a list instead of throwing: no errors is a real answer, and a
 * good many tests assert exactly that.
 *
 * They take the list, not the `BuildResult`, for two reasons. A build carries three separate sets —
 * `notifications`, `comparisonNotifications`, and one per entry of `comparisons` — so a helper that
 * picked `result.notifications` for you would quietly answer about the wrong one. And a third of the
 * call sites hold a bare array to begin with, out of a capability check or an archive, and could not
 * have called it at all.
 */
export function errorNotificationsOf(notifications: readonly NotificationMessage[]): NotificationMessage[] {
  return notifications.filter(({ severity }) => severity === MESSAGE_SEVERITY.Error)
}

export function warningNotificationsOf(notifications: readonly NotificationMessage[]): NotificationMessage[] {
  return notifications.filter(({ severity }) => severity === MESSAGE_SEVERITY.Warning)
}

export function notificationsInCategory(
  notifications: readonly NotificationMessage[],
  category: MessageCategory,
): NotificationMessage[] {
  return notifications.filter(({ category: actual }) => actual === category)
}

/**
 * The one notification of a category, for the tests that go on to assert its severity, message or document.
 *
 * Throws on none and on several. Every call site this replaced read `the` parse failure, `the` collision —
 * `find` answers about the first of them and says nothing about the rest, which is the silent pass the
 * lookups above exist to prevent.
 */
export function notificationOf(
  notifications: readonly NotificationMessage[],
  category: MessageCategory,
): NotificationMessage {
  const matching = notificationsInCategory(notifications, category)
  if (matching.length !== 1) {
    const available = notifications.map(({ category: actual }) => actual)
    throw new Error(
      `Expected one '${category}' notification, found ${matching.length}. Categories: ${listOf(available)}`,
    )
  }
  return matching[0]
}
