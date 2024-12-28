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

import { isDefined } from './checkers'
import {
  GREATER_THAN_OR_EQUAL_SIGN,
  GREATER_THAN_SIGN,
  LESS_THAN_OR_EQUAL_SIGN,
  LESS_THAN_SIGN
} from '../../consts/validations'
import { IModelTreeNode, isObject } from '@netcracker/qubership-apihub-api-data-model'

export function stringifyItem(item: unknown | undefined): string | undefined {
  if (!isDefined(item)) {
    return ''
  }
  if (!isObject(item)) {
    return `${item}`
  }
  return JSON.stringify(item, null, 2)
}

// TODO 15.11.23 // Think of implementing all logic in view model
export function handleSeriesItem(key: string, item: unknown | undefined): string | undefined {
  if (!isDefined(item)) {
    return undefined
  }

  switch (key) {
    case 'minimum':
    case 'minLength':
    case 'minItems':
    case 'minProperties':
      return `${GREATER_THAN_OR_EQUAL_SIGN} ${item}`
    case 'exclusiveMinimum':
      return `${GREATER_THAN_SIGN} ${item}`
    case 'maximum':
    case 'maxLength':
    case 'maxItems':
    case 'maxProperties':
      return `${LESS_THAN_OR_EQUAL_SIGN} ${item}`
    case 'exclusiveMaximum':
      return `${LESS_THAN_SIGN} ${item}`
  }

  return stringifyItem(item)
}

export function isSeriesItemEmpty(item: unknown, replacedItem: unknown): boolean {
  return item === '' || replacedItem === ''
}

export function listContainsNodeKind(
  node: IModelTreeNode<unknown, string, unknown> | null | undefined,
  ...kinds: string[]
): boolean {
  if (!node) {
    return false
  }
  return kinds.some(kind => kind === node.kind)
}

export function listContainsNodeParentKind(
  node: IModelTreeNode<unknown, string, unknown> | null | undefined,
  ...kinds: string[]
): boolean {
  if (!node || !node.parent) {
    return false
  }
  return kinds.some(kind => kind === node.parent!.kind)
}
