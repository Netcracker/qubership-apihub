import { Diff, DiffAction, DiffAdd, DiffMetaRecord, DiffRemove, isDiffAdd, isDiffRemove, isDiffRename, isDiffReplace } from '@netcracker/qubership-apihub-api-diff'
import { GraphApiEnumDefinition, isGraphApiAnyUsage, isGraphApiRef } from '@netcracker/qubership-apihub-graphapi'
import { JsonPath } from '@netcracker/qubership-apihub-json-crawl'
import { DiffNodeMeta, DiffNodeValue, DiffRecord, NodeChangesSummary } from './abstract/diff'
import { IModelTreeNode, ModelTreeNodeType } from './abstract/model/types'

export const isKey = <T extends object>(x: T, k: PropertyKey): k is keyof T => {
  return k in x
}

export function escapeSlash(value: string): string {
  return value.replace(/\//g, '~1')
}

export function isObject(maybeObj: unknown): maybeObj is Record<number | string | symbol, unknown> {
  return maybeObj !== undefined && maybeObj !== null && typeof maybeObj === 'object'
}

export function isString(maybeStr: unknown): maybeStr is string {
  return typeof maybeStr === 'string'
}

export function isAllOfNode(value: any): value is { allOf: any[] } {
  return value && value.allOf && Array.isArray(value.allOf)
}

export function isOneOfNode(value: any): value is { oneOf: any[] } {
  return value && value.oneOf && Array.isArray(value.oneOf)
}

export function isAnyOfNode(value: any): value is { anyOf: any[] } {
  return value && value.anyOf && Array.isArray(value.anyOf)
}

export function isUnionNode(value: unknown): boolean {
  return (
    isGraphApiAnyUsage(value) &&
    !isGraphApiRef(value.typeDef) &&
    value.typeDef.type.kind === 'union'
  )
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number'
}

export function getNodeComplexityType(value: any): ModelTreeNodeType {
  if (isAllOfNode(value)) {
    return 'allOf'
  }
  if (isOneOfNode(value) || isUnionNode(value)) {
    return 'oneOf'
  }
  if (isAnyOfNode(value)) {
    return 'anyOf'
  }
  return 'simple'
}

export const objectKeys = <T extends object>(value: T): (keyof T)[] => {
  return Object.keys(value) as (keyof T)[]
}

export function pick<T extends object>(target: unknown, keys: readonly (keyof T)[]): Partial<T> {
  if (!isObject(target)) {
    return {}
  }

  const source: any = {}

  for (const key of keys) {
    if (!(key in target)) {
      continue
    }

    const value = target[key]
    if (Array.isArray(value)) {
      source[key] = [...value] as any
    } else if (typeof value === 'object') {
      source[key] = { ...value }
    } else {
      source[key] = value
    }
  }

  return source
}

export function pickByPredicate(
  target: unknown,
  predicate: (key?: string | number | symbol) => boolean,
): object {
  if (!isObject(target)) {
    return {}
  }

  const result: Record<string | number | symbol, unknown> = {}

  Object.entries(target).forEach(([key, value]) => {
    if (predicate(key)) {
      result[key] = value
    }
  })

  return result
}

export const calcChanges = (summary: NodeChangesSummary, changes?: DiffRecord) => {
  if (!changes) {
    return summary
  }
  Object.values(changes as DiffRecord).forEach(change => {
    if (isDiff(change)) {
      summary.add(change.type)
    } else if (isDiffRecord(change)) {
      calcChanges(summary, change)
    }
  })
}

export function isEqualSets<T>(firstSet: Set<T>, secondSet: Set<T>): boolean {
  if (firstSet.size !== secondSet.size) {
    return false
  }
  for (const item of firstSet) {
    if (!secondSet.has(item)) {
      return false
    }
  }
  return true
}

export function mergeSets<T>(firstSet: Set<T>, secondSet: Set<T>): Set<T> {
  return new Set([...firstSet.values(), ...secondSet.values()])
}

export function isCombinerNode(node: IModelTreeNode<DiffNodeValue | null, string, DiffNodeMeta>): boolean {
  return matchNodeKind(node, 'oneOf') || matchNodeKind(node, 'anyOf') || matchNodeKind(node, 'allOf')
}

export function matchNodeKind(node: IModelTreeNode<DiffNodeValue | null, string, DiffNodeMeta>, kind: string): boolean {
  return node.kind === kind
}

export const setValueByPath = (obj: unknown, value: unknown, ...path: JsonPath): void => {
  if (path.length === 0) {
    return
  }
  const [propertyKey, ...tailR] = path.reverse()
  const parentPath = tailR.reverse()

  let cur = obj
  for (const key of parentPath) {
    if (!isObject(cur)) {
      return
    }
    if (Array.isArray(cur) && typeof key === 'number' && cur.length < key) {
      const nv = cur = cur[key]
      if (nv === undefined || nv === null) {
        cur = (nv[key] = {})
      } else {
        cur = nv
      }
    } else {
      if (key in cur && cur[key] !== undefined && cur[key] !== null) {
        cur = cur[key]
      } else {
        cur = cur[key] = {}
      }
    }
  }
  (cur as Record<PropertyKey, unknown>)[propertyKey] = value
}

export function isDiff(maybeDiff?: unknown): maybeDiff is Diff {
  if (!maybeDiff) {
    return false
  }
  return isDiffAdd(maybeDiff as Diff) || isDiffRemove(maybeDiff as Diff) ||
    isDiffReplace(maybeDiff as Diff) || isDiffRename(maybeDiff as Diff)
}

export function inverDiffAction(diff?: Diff): Diff | undefined {
  if (!diff) {
    return undefined
  }
  if (isDiffAdd(diff)) {
    const newDiff: DiffRemove = {
      type: diff.type,
      scope: diff.scope,
      description: diff.description,
      // inverted part
      action: DiffAction.remove,
      beforeValue: diff.afterValue,
      beforeDeclarationPaths: diff.afterDeclarationPaths,
    }
    return newDiff
  }
  if (isDiffRemove(diff)) {
    const newDiff: DiffAdd = {
      type: diff.type,
      scope: diff.scope,
      description: diff.description,
      // inverted part
      action: DiffAction.add,
      afterValue: diff.beforeValue,
      afterDeclarationPaths: diff.beforeDeclarationPaths,
    }
    return newDiff
  }
  return diff
}

export class PathUtils {
  constructor(private _originalPath: JsonPath) { }

  endsWith(subPath: JsonPath): boolean {
    const originalLength = this._originalPath.length
    if (originalLength < subPath.length) {
      return false
    }
    for (let i = subPath.length - 1, j = 0; i >= 0; i--, j++) {
      if (subPath[i] === '*') {
        continue
      }
      if (this._originalPath[originalLength - 1 - j] !== subPath[i]) {
        return false
      }
    }
    return true
  }
}

// diffs for array items
export function isDiffMetaRecord(value: unknown): value is DiffMetaRecord {
  if (!isObject(value)) {
    return false
  }
  const values = Object.values(value)
  return values.length > 0 && values.every(isDiff)
}

// nested diffs (e.g. changed field inside field inside field inside ...)
export function isDiffRecord(value: unknown): value is DiffRecord {
  if (!isObject(value)) {
    return false
  }
  const values = Object.values(value)
  return values.length > 0 && values.every(value => isDiff(value) || isDiffRecord(value))
}

export function wasGraphApiEnumDefinition(
  value: unknown
): value is {
  type: {
    beforeValue: GraphApiEnumDefinition['type']
  }
} {
  if (!isObject(value) || !isDiffRecord(value) || !('type' in value)) {
    return false
  }
  const diffForType = value.type
  if (!isDiff(diffForType) || !isDiffRemove(diffForType) && !isDiffReplace(diffForType)) {
    return false
  }
  return isObject(diffForType.beforeValue) && diffForType.beforeValue.kind === 'enum'
}
