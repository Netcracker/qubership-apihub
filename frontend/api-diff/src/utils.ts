import { anyArrayKeys, JsonPath } from '@netcracker/qubership-apihub-json-crawl'
import { breaking, DiffAction, nonBreaking, PARENT_JUMP, strictResolveValueFromContext } from './core'
import {
  CompareContext,
  Diff,
  DiffAdd,
  DiffRemove,
  DiffRename,
  DiffReplace,
  DiffType,
  NodeContext,
  PrimitiveType,
} from './types'
import {
  JSON_SCHEMA_NODE_SYNTHETIC_TYPE_ANY,
  JSON_SCHEMA_NODE_SYNTHETIC_TYPE_NOTHING,
  JSON_SCHEMA_NODE_TYPE_ARRAY,
  JSON_SCHEMA_NODE_TYPE_BOOLEAN,
  JSON_SCHEMA_NODE_TYPE_INTEGER,
  JSON_SCHEMA_NODE_TYPE_NULL,
  JSON_SCHEMA_NODE_TYPE_NUMBER,
  JSON_SCHEMA_NODE_TYPE_OBJECT,
  JSON_SCHEMA_NODE_TYPE_STRING,
  JsonSchemaNodesNormalizedType,
} from '@netcracker/qubership-apihub-api-unifier'

export const isObject = (value: unknown): value is Record<string | symbol, unknown> => {
  return typeof value === 'object' && value !== null
}

export const isArray = (value: unknown): value is Array<unknown> => {
  return Array.isArray(value)
}

export const isNotEmptyArray = (value: unknown): boolean => {
  return !!(Array.isArray(value) && value.length)
}

export const isEmptyArray = (value: unknown): boolean => {
  return (Array.isArray(value) && !value.length)
}

export const isExist = (value: unknown): boolean => {
  return typeof value !== 'undefined'
}

export const isString = (value: unknown): value is string => {
  return typeof value === 'string'
}

export const isBoolean = (value: unknown): value is boolean => {
  return typeof value === 'boolean'
}

export const isSymbol = (value: unknown): value is symbol => {
  return typeof value === 'symbol'
}

export const isNumber = (value: unknown): value is number => {
  return typeof value === 'number' || isString(value) && !Number.isNaN(+value)
}

// eslint-disable-next-line @typescript-eslint/ban-types
export const isFunc = (value: unknown): value is Function => {
  return typeof value === 'function'
}

export const typeOf = (value: unknown): string => {
  if (Array.isArray(value)) {
    return 'array'
  }
  return value === null ? 'null' : typeof value
}

export const objectKeys = <T extends NonNullable<unknown>>(value: T): (keyof T)[] => {
  return Object.keys(value) as (keyof T)[]
}

export const getKeyValue = (obj: unknown, ...path: JsonPath): unknown | undefined => {
  let value: unknown = obj
  for (const key of path) {
    if (!isSymbol(key) && Array.isArray(value) && typeof +key === 'number' && value.length < +key) {
      value = value[+key]
    } else if (isObject(value) && key in value) {
      value = value[key]
    } else {
      return
    }
    if (value === undefined) { return }
  }
  return value
}

export const getStringValue = (obj: unknown, ...path: JsonPath): string | undefined => {
  const value = getKeyValue(obj, ...path)
  return typeof value === 'string' ? value : undefined
}

export const getObjectValue = (obj: unknown, ...path: JsonPath): Record<string | number, unknown> | undefined => {
  const value = getKeyValue(obj, ...path)
  return isObject(value) ? value : undefined
}

export const getArrayValue = (obj: unknown, ...path: JsonPath): Array<unknown> | undefined => {
  const value = getKeyValue(obj, ...path)
  return Array.isArray(value) ? value : undefined
}

const JSON_SCHEMA_ASSIGN_TYPE_MAPPING: Record<JsonSchemaNodesNormalizedType, Set<JsonSchemaNodesNormalizedType>> = {
  [JSON_SCHEMA_NODE_TYPE_BOOLEAN]: new Set([JSON_SCHEMA_NODE_TYPE_BOOLEAN, JSON_SCHEMA_NODE_SYNTHETIC_TYPE_ANY]),
  [JSON_SCHEMA_NODE_TYPE_OBJECT]: new Set([JSON_SCHEMA_NODE_TYPE_OBJECT, JSON_SCHEMA_NODE_SYNTHETIC_TYPE_ANY]),
  [JSON_SCHEMA_NODE_TYPE_ARRAY]: new Set([JSON_SCHEMA_NODE_TYPE_ARRAY, JSON_SCHEMA_NODE_SYNTHETIC_TYPE_ANY]),
  [JSON_SCHEMA_NODE_TYPE_NUMBER]: new Set([JSON_SCHEMA_NODE_TYPE_NUMBER, JSON_SCHEMA_NODE_SYNTHETIC_TYPE_ANY]),
  [JSON_SCHEMA_NODE_TYPE_STRING]: new Set([JSON_SCHEMA_NODE_TYPE_STRING, JSON_SCHEMA_NODE_SYNTHETIC_TYPE_ANY]),
  [JSON_SCHEMA_NODE_TYPE_INTEGER]: new Set([JSON_SCHEMA_NODE_TYPE_INTEGER, JSON_SCHEMA_NODE_TYPE_NUMBER, JSON_SCHEMA_NODE_SYNTHETIC_TYPE_ANY]),
  [JSON_SCHEMA_NODE_TYPE_NULL]: new Set([JSON_SCHEMA_NODE_TYPE_NULL]),
  [JSON_SCHEMA_NODE_SYNTHETIC_TYPE_ANY]: new Set([JSON_SCHEMA_NODE_SYNTHETIC_TYPE_ANY]),
  [JSON_SCHEMA_NODE_SYNTHETIC_TYPE_NOTHING]: new Set([
      JSON_SCHEMA_NODE_SYNTHETIC_TYPE_NOTHING,
      JSON_SCHEMA_NODE_TYPE_BOOLEAN,
      JSON_SCHEMA_NODE_TYPE_OBJECT,
      JSON_SCHEMA_NODE_TYPE_ARRAY,
      JSON_SCHEMA_NODE_TYPE_NUMBER,
      JSON_SCHEMA_NODE_TYPE_STRING,
      JSON_SCHEMA_NODE_TYPE_INTEGER,
      JSON_SCHEMA_NODE_TYPE_NULL,
      JSON_SCHEMA_NODE_SYNTHETIC_TYPE_ANY,
    ],
  ),
}

export const isTypeAssignable = (
  fromType: unknown | JsonSchemaNodesNormalizedType,
  toType: unknown | JsonSchemaNodesNormalizedType,
  covariant: boolean,
): boolean => {
  if (toType === JSON_SCHEMA_NODE_SYNTHETIC_TYPE_NOTHING) {
    return false
  }
  if (fromType === JSON_SCHEMA_NODE_SYNTHETIC_TYPE_NOTHING) {
    return true
  }
  const from = (!covariant ? fromType : toType) as JsonSchemaNodesNormalizedType
  const to = (!covariant ? toType : fromType) as JsonSchemaNodesNormalizedType
  const allowedTypes = JSON_SCHEMA_ASSIGN_TYPE_MAPPING[from]
  if (!allowedTypes) {
    return false
  }
  return allowedTypes.has(to)
}

export const nonBreakingIf = (v: boolean): DiffType => (v ? nonBreaking : breaking)

export const isDiffAdd = (diff: Diff): diff is DiffAdd => diff.action === DiffAction.add
export const isDiffRemove = (diff: Diff): diff is DiffRemove => diff.action === DiffAction.remove
export const isDiffRename = (diff: Diff): diff is DiffRename => diff.action === DiffAction.rename
export const isDiffReplace = (diff: Diff): diff is DiffReplace => diff.action === DiffAction.replace

export const onlyExistedArrayIndexes = (array: unknown[]) => anyArrayKeys(array).flatMap(value => (typeof value === 'number' ? [value] : []))

const resolveNodeContextFromCompareContext = (diff: Diff, ctx: CompareContext): NodeContext => {
  return isDiffRemove(diff) ? ctx.before : ctx.after
}

export const resolveCurrentNode = (diff: Diff, ctx: CompareContext) => {
  const context = resolveNodeContextFromCompareContext(diff, ctx)
  const parent = strictResolveValueFromContext(context)
  if (!isObject(parent)) {
    return undefined
  }
  return parent
}

export const resolveParentNode = (diff: Diff, ctx: CompareContext) => {
  const context = resolveNodeContextFromCompareContext(diff, ctx)
  const parent = strictResolveValueFromContext(context, PARENT_JUMP)
  if (!isObject(parent)) {
    return undefined
  }
  return parent
}

export const resolveValueFromCompareContext = (diff: Diff, ctx: CompareContext, ...path: JsonPath) => {
  const context = resolveNodeContextFromCompareContext(diff, ctx)
  const parent = strictResolveValueFromContext(context, ...path)
  if (!isObject(parent)) {
    return undefined
  }
  return parent
}

export const resolveAllDeclarationPath = (diff: Diff): JsonPath[] => {
  let declarationPaths
  switch (diff.action) {
    case DiffAction.add:
      declarationPaths = [...diff.afterDeclarationPaths]
      break
    case DiffAction.remove:
      declarationPaths = [...diff.beforeDeclarationPaths]
      break
    case DiffAction.replace:
      declarationPaths = [...diff.beforeDeclarationPaths, ...diff.afterDeclarationPaths]
      break
    case DiffAction.rename:
      declarationPaths = [...diff.beforeDeclarationPaths, ...diff.afterDeclarationPaths]
      break
  }
  return declarationPaths
}

export const calculateParentJumpDeep = (deep: number): string[] => {
  return [...Array(deep)].fill(PARENT_JUMP)
}

export const checkPrimitiveType = (value: unknown): PrimitiveType | undefined => {
  if (isObject(value)) {
    return undefined
  }
  if (isString(value) || isBoolean(value) || isNumber(value)) {
    return value
  }
  return undefined
}
