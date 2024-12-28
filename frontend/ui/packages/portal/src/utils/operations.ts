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

import type { OperationChangesDto } from '@netcracker/qubership-apihub-api-processor'
import type { Operation, OperationsGroupedByTag } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import { DEFAULT_TAG, EMPTY_TAG } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import { isEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import { matchPaths, OPEN_API_PROPERTY_PATHS, PREDICATE_UNCLOSED_END } from '@netcracker/qubership-apihub-api-unifier'
import { DiffAction } from '@netcracker/qubership-apihub-api-diff'

export function groupOperationsByTags<T extends Operation>(operations: ReadonlyArray<T>): OperationsGroupedByTag<T> {
  const newOperationsGroupedByTag: OperationsGroupedByTag<T> = {}
  for (const operation of operations) {
    const operationTagsSet = handleOperationTags(operation.tags)

    operationTagsSet.forEach(tag => {
      if (!newOperationsGroupedByTag[tag]) {
        newOperationsGroupedByTag[tag] = []
      }
      newOperationsGroupedByTag[tag].push(operation)
    })
  }

  return newOperationsGroupedByTag
}

export const getActionForOperation = (change: OperationChangesDto, actionType: string): string => {
  return !isFullyAddedOrRemovedOperationChange(change)
    ? actionType
    : change?.changes?.[0]?.action ?? ''
}

export function handleOperationTags(tags: readonly string[] | undefined): Set<string> {
  const operationTagsSet = new Set<string>()
  const operationTags = isEmpty(tags) || tags?.includes(EMPTY_TAG)
    ? [DEFAULT_TAG]
    : tags!

  operationTags.forEach(tag => operationTagsSet.add(tag ?? DEFAULT_TAG))

  return operationTagsSet
}

export function isFullyAddedOrRemovedOperationChange(change: OperationChangesDto): boolean {
  if (change.changes && change.changes[0]) {
    if (change.changes[0].action === DiffAction.remove) {
      return isOperationChange(change.changes[0].previousDeclarationJsonPaths)
    }
    if (change.changes[0].action === DiffAction.add) {
      return isOperationChange(change.changes[0].currentDeclarationJsonPaths)
    }
  }
  return false
}

function isOperationChange(paths: JsonPath[]): boolean { //check
  return !!matchPaths(paths, [[OPEN_API_PROPERTY_PATHS, PREDICATE_UNCLOSED_END]])
}

// TODO: Remove JsonPath from shared or inline it with crawler
type JsonPath = PropertyKey[]
