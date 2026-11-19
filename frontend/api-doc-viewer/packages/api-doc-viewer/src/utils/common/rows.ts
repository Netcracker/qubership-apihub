import { isDefined } from './checkers'
import {
  GREATER_THAN_OR_EQUAL_SIGN,
  GREATER_THAN_SIGN,
  LESS_THAN_OR_EQUAL_SIGN,
  LESS_THAN_SIGN
} from '../../consts/validations'
import { IModelTreeNode, isObject } from '@netcracker/qubership-apihub-api-data-model'

export type StringifyItemOptions = {
  /** Show string values as-is (e.g. JSON Schema regex patterns). */
  literal?: boolean
}

const LITERAL_STRING_ITEM_KEYS = new Set(['pattern', 'additionalPropertyNamePattern'])

export function isLiteralDisplayItemKey(key: string | number): boolean {
  return LITERAL_STRING_ITEM_KEYS.has(String(key))
}

export function stringifyItem(
  item: unknown | undefined,
  options?: StringifyItemOptions,
): string | undefined {
  if (!isDefined(item)) {
    return ''
  }
  if (!isObject(item)) {
    if (typeof item === 'string') {
      if (options?.literal) {
        return item
      }
      // this is a fix for special characters in string values, e.g. \r, \n, \t, etc.
      const stringified = JSON.stringify(item)
      return stringified.slice(1, -1)
    }
    return `${item}`
  }
  return JSON.stringify(item, null, 2)
}

// TODO 15.11.23 // Think of implementing all logic in view model
export function handleSeriesItem(key: string, item: unknown | undefined): unknown {
  if (!isDefined(item)) {
    return undefined
  }

  // Object/array values (e.g. a complex `default`) must reach `stringifyItem` untouched so
  // its own JSON.stringify(item, null, 2) branch can pretty-print them — the comparison-operator
  // prefixing below only makes sense for scalar bound values, and the blind `${item}` coercion
  // at the end would otherwise collapse them to "[object Object]" / a comma-joined array string.
  if (isObject(item)) {
    return item
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

  return `${item}`
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
