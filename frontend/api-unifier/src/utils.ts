import { isArray, isObject, JSON_ROOT_KEY, SyncCloneHook, SyncCrawlHook, type JsonPath } from '@netcracker/qubership-apihub-json-crawl'

import {
  ChainItem,
  DEFAULT_TYPE_FLAG_PURE,
  DEFAULT_TYPE_FLAG_SYNTHETIC,
  DefaultMetaRecord,
  Jso,
  PureRefNode,
  type RawJsonSchema,
  RefNode,
  RichReference,
} from './types'
import { JSON_SCHEMA_PROPERTY_REF } from './rules/jsonschema.const'

export class MapArray<K, V> extends Map<K, Array<V>> {
  public add(key: K, value: V): this {
    const arr = this.get(key)
    if (arr) {
      arr.push(value)
    } else {
      this.set(key, [value])
    }
    return this
  }
}

export function isPossibleRawJsonSchema(value: unknown): value is RawJsonSchema {
  const type = typeof value
  return type === 'boolean' || type === 'object'
}

export function isRefNode(value: any): value is PureRefNode {
  return value
    && typeof value === 'object'
    && JSON_SCHEMA_PROPERTY_REF in value
    && value.$ref
    && typeof value.$ref === 'string'
}

export function isPureRefNode(value: any): value is RefNode {
  return isRefNode(value) && Object.keys(value).length === 1
}

export function parseRef($ref: string, basePath = ''): RichReference {
  const [filePath = basePath, ref] = $ref.split('#')

  const pointer = !ref || ref === '/' ? '' : ref
  const normalized = createRef(filePath, pointer)
  const jsonPath = parsePointer(pointer)

  return { filePath, pointer, normalized, jsonPath }
}

export function createRef(basePath?: string, pointer?: string): string {
  if (!basePath) {
    return !pointer ? '#' : `#${pointer}`
  } else {
    return `${basePath}${!pointer ? '' : '#' + pointer}`
  }
}

export const resolveValueByPath = (obj: unknown, path: JsonPath): unknown | undefined => {
  let value: unknown = obj
  for (const key of path) {
    if (isObject(value) && key in value) {
      value = value[key]
    } else {
      return
    }
    if (value === undefined) { return }
  }
  return value
}

export const pathMask = {
  slash: /\//g,
  tilde: /~/g,
  escapedSlash: /~1/g,
  escapedTilde: /~0/g,
}

export function parsePointer(pointer: string): string[] {
  return pointer.split('/').map((i) => decodeURIComponent(i.replace(pathMask.escapedSlash, '/').replace(pathMask.escapedTilde, '~'))).slice(1)
}

export const buildPointer = (path: JsonPath): string => {
  if (!path.length) { return '' }
  return '/' + path.map((i) => encodeURIComponent((String(i).replace(pathMask.tilde, '~0').replace(pathMask.slash, '~1')))).join('/')
}
export const findMultiplierForInteger = (number: number): number => {
  let multiplier = 1

  while (number * multiplier % 1 !== 0) {
    multiplier *= 10
  }

  return multiplier
}

export function calculateLCM(args: number[]): number {
  const x = args.reduce((r, v) => Math.max(r, findMultiplierForInteger(v)), 0)
  return args.reduce((a, b) => Math.round((a * x * b * x) / calculateGCD(a * x, b * x)) / x)
}

export function calculateGCD(a: number, b: number): number {
  return b === 0 ? a : calculateGCD(b, a % b)
}

export function uniqueItems<T>(arr: T[]): T[] {
  const added: Set<T> = new Set()
  return arr.filter(value => !added.has(value) && added.add(value))
}

export interface StringifyOptions {
  filter?: (jso: Jso, key: PropertyKey) => boolean
  pairExtraInfo?: (jso: Jso, key: PropertyKey) => string
  jsoExtraInfo?: (jso: Jso) => string
}

export function stringifyCyclicJso(jso: unknown, options: StringifyOptions = {}): string {
  const instances = new Map<unknown, number>()
  return stringifyKeyValuePair('', jso, instances, options)
}

function stringifyKeyValuePair(valuePrefix: string, value: unknown, instances: Map<unknown, number>, options: StringifyOptions): string {
  if (value === null) {
    return `${valuePrefix.toString()}null`
  }
  const valueType = typeof value
  switch (valueType) {
    case 'string':
      return `${valuePrefix.toString()}'${value}'`
    case 'symbol':
    case 'boolean':
    case 'number':
    case 'bigint': {
      return `${valuePrefix.toString()}${value}`
    }
    case 'undefined': {
      return `${valuePrefix.toString()}undefined`
    }
    default: {
      let ref = instances.get(value)
      if (ref === undefined) {
        ref = instances.size
        instances.set(value, ref)
      } else {
        return `${valuePrefix.toString()}/*#${ref}*/`
      }
      if (valueType === 'function') {
        return `${valuePrefix.toString()}/*${ref}*/ function()`
      }
      const indent = valuePrefix.length - valuePrefix.trimStart().length
      const tab = ' '
      const stringIndent = tab.repeat(indent)
      if (isArray(value)) {
        const valueAsObject = value as unknown as Record<PropertyKey, unknown>
        const extraInfo = options.jsoExtraInfo?.(valueAsObject)
        const arrayExtraInfo = extraInfo ? `  //${extraInfo}` : ''
        const ownKeys = Reflect.ownKeys(valueAsObject)
          .filter(k => k !== 'length')
        const ending = ownKeys.length === 0 ? `]${arrayExtraInfo}` : `\n${stringIndent}]`
        const strValue = ownKeys
          .filter(propertyKey => !options.filter || options.filter(valueAsObject, propertyKey))
          .reduce<string>((result, propertyKey) => {
            const propertyValue = valueAsObject[propertyKey]
            const pairInfo = options.pairExtraInfo?.(valueAsObject, propertyKey) ?? ''
            return result + '\n'
              + stringifyKeyValuePair(/\d+/.test(propertyKey.toString()) ? `${stringIndent}${tab}` : `${stringIndent}${tab}/*${propertyKey.toString()}: */ `, propertyValue, instances, options)
              + ',' + '  //' + pairInfo
          }, `[` + (ownKeys.length !== 0 ? arrayExtraInfo : '')) + ending
        return `${valuePrefix.toString()}/*${ref}*/ ${strValue}`
      } else {
        const valueAsObject = value as unknown as Record<PropertyKey, unknown>
        const extraInfo = options.jsoExtraInfo?.(valueAsObject)
        const objectExtraInfo = extraInfo ? `  //${extraInfo}` : ''
        const ownKeys = Reflect.ownKeys(valueAsObject)
        const ending = ownKeys.length === 0 ? `}${objectExtraInfo}` : `\n${stringIndent}}`
        const strValue = ownKeys
          .filter(propertyKey => !options.filter || options.filter(valueAsObject, propertyKey))
          .reduce<string>((result, propertyKey) => {
            const propertyValue = valueAsObject[propertyKey]
            const pairInfo = options.pairExtraInfo?.(valueAsObject, propertyKey) ?? ''
            return result + '\n'
              + stringifyKeyValuePair(`${stringIndent}${tab}${propertyKey.toString()}: `, propertyValue, instances, options)
              + ',' + '  //' + pairInfo
          }, `{` + (ownKeys.length !== 0 ? objectExtraInfo : '')) + ending
        return `${valuePrefix.toString()}/*${ref}*/ ${strValue}`
      }
    }
  }
}

export function copyDescriptors<T extends Record<PropertyKey, unknown>, S extends Record<PropertyKey, unknown>>(target: T, ...sources: S[]): T & S {
  sources.forEach((source) => {
    const descriptors = Object.keys(source).reduce((descriptors, key) => {
      const descriptor = Object.getOwnPropertyDescriptor(source, key)
      if (descriptor?.enumerable) { descriptors[key] = descriptor }
      return descriptors
    }, {} as Record<PropertyKey, PropertyDescriptor>)

    Object.getOwnPropertySymbols(source).forEach((sym) => {
      const descriptor = Object.getOwnPropertyDescriptor(source, sym)
      if (descriptor?.enumerable) {
        descriptors[sym] = descriptor
      }
    })
    Object.defineProperties(target, descriptors)
  })
  return target as T & S
}

export function concatArrays<T>(...args: (T | T[] | undefined)[]): T[] {
  return args.flatMap(value => {
    if (value === undefined) {
      return []
    }
    if (isArray(value)) {
      return value
    } else { return [value] }
  })
}

const INSTRUCTION_AFTER = 'after'
const INSTRUCTION_BEFORE = 'before'
const INSTRUCTION_REPLACE = 'replace'

type Instruction<T> = AfterInstruction<T> | BeforeInstruction<T> | ReplaceInstruction<T>

interface BaseInstruction<T> {
  readonly reference: T
  readonly value: T
}

interface AfterInstruction<T> extends BaseInstruction<T> {
  readonly type: typeof INSTRUCTION_AFTER
}

interface BeforeInstruction<T> extends BaseInstruction<T> {
  readonly type: typeof INSTRUCTION_BEFORE
}

interface ReplaceInstruction<T> extends BaseInstruction<T> {
  readonly type: typeof INSTRUCTION_REPLACE
}

export function beforeValue<T>(reference: T, value: T): BeforeInstruction<T> {
  return { type: INSTRUCTION_BEFORE, reference, value }
}

export function afterValue<T>(reference: T, value: T): AfterInstruction<T> {
  return { type: INSTRUCTION_AFTER, reference, value }
}

export function replaceValue<T>(reference: T, value: T): ReplaceInstruction<T> {
  return { type: INSTRUCTION_REPLACE, reference, value }
}

export function insertIntoArrayByInstruction<T>(arr: T[], ...instructions: Instruction<T>[]): T[] {
  return instructions.reduce((items, instruction) =>
    items.flatMap(item => {
      if (instruction.reference === item) {
        switch (instruction.type) {
          case INSTRUCTION_AFTER:
            return [item, instruction.value]
          case INSTRUCTION_BEFORE:
            return [instruction.value, item]
          case INSTRUCTION_REPLACE:
            return [instruction.value]
        }
      } else { return [item] }
    }),
    arr)
}

export function singleOrArrayToArray<T>(t: T | T[]): T[] {
  return isArray(t) ? t : [t]
}

export function arrayToSingleOrArray<T>(ts: T[]): T | T[] {
  return ts.length === 1 ? ts[0] : ts
}

export function pathItemToFullPath(item: ChainItem): JsonPath {
  const path: JsonPath = []
  let v: ChainItem | undefined = item
  while (v) {
    path.push(v.value)
    v = v.parent
  }
  const reverse = path.reverse()
  if (reverse.length && reverse[0] === JSON_ROOT_KEY) {
    reverse.shift()
  }
  return reverse
}

export function getJsoProperty<T>(ar: Jso<T>, key: PropertyKey): T {
  return (ar as Record<PropertyKey, T>)[key] //object and array have same access
}

export function setJsoProperty<T>(ar: Jso<T>, key: PropertyKey, value: T): void {
  (ar as Record<PropertyKey, T>)[key] = value //object and array have same access
}

export function isDefaultValue<T>(jso: Jso<T>, key: PropertyKey, defaultFlag: symbol | undefined): boolean {
  if (!defaultFlag) { return false }
  const defaults = getJsoProperty(jso, defaultFlag) as DefaultMetaRecord
  const defaultType = defaults?.[key]
  if (!defaultType) { return false }
  return defaultType === DEFAULT_TYPE_FLAG_PURE || defaultType === DEFAULT_TYPE_FLAG_SYNTHETIC
}

export const typeOf = (value: unknown): string => {
  if (Array.isArray(value)) {
    return 'array'
  }
  return value === null ? 'null' : typeof value
}

export type SelfMetaResolver<Meta> = (key: PropertyKey) => Meta | undefined
export type SelfMetaResolverFactory<Meta> = (jso: unknown) => SelfMetaResolver<Meta>
export type HasSelfMetaResolver<MetaProperty extends PropertyKey, Meta> = {
  [Property in MetaProperty]: SelfMetaResolver<Meta>
}

export function selfMetaResolverFactory<Meta>(metaFlag: symbol | undefined, defaultMeta: Meta = undefined as Meta): SelfMetaResolverFactory<Meta> {
  return metaFlag ? parent => {
    if (!isObject(parent)) {
      return () => defaultMeta
    }
    let origins: Record<PropertyKey, Meta> | undefined
    return key => {
      if (!origins) {
        origins = parent[metaFlag] ?? {}
      }
      return origins?.[key] as Meta
    }
  } : () => () => defaultMeta
}

export function createSelfMetaCloneHook<Meta, StateProperty extends PropertyKey, State extends HasSelfMetaResolver<StateProperty, Meta>, Rules extends {}>(stateProperty: PropertyKey, metaFlag: symbol | undefined, defaultMeta: Meta = undefined as Meta): SyncCloneHook<State, Rules> {
  const factory = selfMetaResolverFactory(metaFlag, defaultMeta)
  const selfOriginsHook: SyncCloneHook<State, Rules> = ({ value, state }) => {
    if (!isObject(value)) {
      return { value }
    }
    return { value, state: { ...state, [stateProperty]: factory(value) } }
  }
  return selfOriginsHook
}

export function createSelfMetaCrawlHook<Meta, StateProperty extends PropertyKey, State extends HasSelfMetaResolver<StateProperty, Meta>, Rules extends {}>(stateProperty: PropertyKey, metaFlag: symbol | undefined, defaultMeta: Meta = undefined as Meta): SyncCrawlHook<State, Rules> {
  return createSelfMetaCloneHook(stateProperty, metaFlag, defaultMeta) as SyncCrawlHook<State, Rules>
}