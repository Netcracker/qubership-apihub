import YAML from 'js-yaml'
import { anyArrayKeys, isArray, isObject, JsonPath, syncCrawl } from '@netcracker/qubership-apihub-json-crawl'
import { ChainItem, Hash, JsonSchema, OriginLeafs, OriginsMetaRecord } from '../../src'
import { OpenAPIV3 } from 'openapi-types'
import 'jest-extended'
import { deepEqual } from 'fast-equals'
import { buildFromSchema, GraphApiSchema } from '@netcracker/qubership-apihub-graphapi'
import { buildSchema } from 'graphql/utilities'

export const yaml = (strings: TemplateStringsArray): object => {
  return YAML.load(strings[0]) as object
}

export const graphapi = (strings: TemplateStringsArray): GraphApiSchema => {
  return buildGraphApi(strings[0])
}

export function buildGraphApi(graphql: string): GraphApiSchema {
  return buildFromSchema(
    buildSchema(graphql, { noLocation: true })
  )
}

export const jsoValueByPath = (obj: unknown, path: JsonPath): unknown | undefined => {
  let value: unknown = obj
  for (const key of path) {
    if (!(typeof key === 'symbol') && Array.isArray(value) && typeof +key === 'number' && value.length < +key) {
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

export const TEST_SCHEMA_NAME = 'Single'
export const TEST_PARAMETER_NAME = 'parameter1'
export const TEST_HEADER_NAME = 'header1'
export const TEST_RESPONSE_NAME = 'response1'
export const TEST_REQUEST_NAME = 'request1'

export const createOas: (schema: JsonSchema, version?: string) => Record<PropertyKey,unknown> = (schema, version = '3.0.0') => {
  return {
    openapi: version,
    components: {
      schemas: {
        [TEST_SCHEMA_NAME]: schema,
      },
    },
  }
}

export const createOasWithParameters: (parameter: OpenAPIV3.ParameterObject) => Record<PropertyKey,unknown> = (parameter) => {
  return {
    openapi: '3.0.0',
    components: {
      parameters: {
        [TEST_PARAMETER_NAME]: parameter,
      },
    },
  }
}

export type OasDeprecatedMeta = { [key: string]: unknown }

interface BaseOasWithDeprecatedCandidates {
  version?: string,
  path: OpenAPIV3.PathsObject & OasDeprecatedMeta,
  schema?: JsonSchema & OasDeprecatedMeta,
  parameter?: OpenAPIV3.ParameterObject,
  header?: OpenAPIV3.HeaderObject,
  response?: OpenAPIV3.ResponseObject,
  requestBody?: OpenAPIV3.RequestBodyObject,
}

export const createOasWithDeprecatedCandidates: (
  data: BaseOasWithDeprecatedCandidates
) => OpenAPIV3.Document = ({ version = '3.0.0', schema, header, parameter, path, response, requestBody }) => {
  const components: OpenAPIV3.ComponentsObject = {}

  if (schema) {
    components.schemas = { [TEST_SCHEMA_NAME]: schema }
  }
  if (parameter) {
    components.parameters = { [TEST_PARAMETER_NAME]: parameter }
  }
  if (header) {
    components.headers = { [TEST_HEADER_NAME]: header }
  }
  if (response) {
    components.responses = { [TEST_RESPONSE_NAME]: response }
  }
  if (requestBody) {
    components.requestBodies = { [TEST_REQUEST_NAME]: requestBody }
  }

  return {
    openapi: version,
    info: {
      title: '',
      version: '',
    },
    paths: path,
    components,
  }
}

export interface OriginsCheckOptions {
  readonly originsFlag?: symbol
  readonly source?: unknown
  readonly ignoreOrigins?: OriginLeafs
}

interface OriginTreeItem {
  value: ChainItem
  children: Record<PropertyKey, OriginTreeItem>
}

export const commonOriginsCheck: (schema: unknown, options?: OriginsCheckOptions) => void = (schema, options = {}) => {
  const cycleGuard: Set<unknown> = new Set()
  const {
    originsFlag = TEST_ORIGINS_FLAG,
    ignoreOrigins = TEST_ORIGINS_FOR_DEFAULTS,
    source,
  } = options
  const originsTree: Record<PropertyKey, OriginTreeItem> = {}
  syncCrawl(schema, ({ key, value }) => {
    if (!isObject(value)) {
      return { done: true }
    }
    if (typeof key === 'symbol') {
      return { done: true }
    }
    if (cycleGuard.has(value)) {
      return { done: true }
    }
    cycleGuard.add(value)
    //resolveOrigins() DO NOT USE!!!! cause it can contains bugs

    const originsRecord = value[originsFlag] as OriginsMetaRecord ?? {}
    const keys = (isArray(value) ? anyArrayKeys(value) : Reflect.ownKeys(value)).filter(key => typeof key !== 'symbol').map(key => key.toString())
    if (keys.length > 0) {
      expect(value).toHaveProperty([originsFlag])
    }

    const used = new Set(Reflect.ownKeys(originsRecord).map(key => key.toString()))
    for (const key of keys) {
      expect(originsRecord).toHaveProperty([key], expect.toBeArray())
      const leafs = originsRecord[key]
      if (deepEqual(leafs, ignoreOrigins)) {
        used.delete(key)
        continue
      }
      expect(leafs).not.toBeEmpty()
      used.delete(key)
      const paths = leafs.map(leaf => {
        const paths: ChainItem[] = []
        let pathItem: ChainItem | undefined = leaf
        while (pathItem) {
          paths.push(pathItem)
          pathItem = pathItem.parent
        }
        return paths.reverse()
      })
      //check tree
      for (const path of paths) {
        let root = originsTree
        for (const chainItem of path) {
          let treeItem = root[chainItem.value]
          if (!treeItem) {
            treeItem = { value: chainItem, children: {} }
            root[chainItem.value] = treeItem
          }
          expect(treeItem.value).toBe(chainItem)
          root = treeItem.children
        }
      }

      if (source) {
        for (const path of paths) {
          expect(source).toHaveProperty(path.map(item => item.value))
        }
      }
    }
    const usedAsArray: string[] = []
    used.forEach(key => usedAsArray.push(key))
    expect(usedAsArray).toEqual([])
  })
}

export const TEST_INLINE_REFS_FLAG = Symbol('test-inline-refs')
export const TEST_SYNTHETIC_TITLE_FLAG = Symbol('test-synthetic-title')
export const TEST_SYNTHETIC_ALL_OF_FLAG = Symbol('test-synthetic-allOf')
export const TEST_ORIGINS_FLAG = Symbol('test-origin')
export const TEST_ORIGINS_FOR_DEFAULTS: OriginLeafs = [{ parent: undefined, value: 'test-origins-defaults' }]
export const TEST_DEFAULTS_FLAG = Symbol('test-defaults')
export const TEST_HASH_FLAG = Symbol('test-hash')

export const isSymbol = (value: unknown): value is symbol => {
  return typeof value === 'symbol'
}

export const resolveValueByPath = (obj: unknown, path: JsonPath): unknown | undefined => {
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

export function resolveHashesByPath(data1: unknown, data2: unknown, path1: JsonPath, path2: JsonPath = path1): [Hash, Hash] {
  const hash1 = resolveValueByPath(data1, [...path1, TEST_HASH_FLAG])
  const hash2 = resolveValueByPath(data2, [...path2, TEST_HASH_FLAG])
  if (!hash1 || !hash2 || typeof hash1 !== 'function' || typeof hash2 !== 'function') {
    throw new Error(`No hash found, path1: ${path1}, path2: ${path2}`)
  }
  return [hash1(), hash2()]
}

export function checkHashesEqualByPath(data1: unknown, data2: unknown, path1: JsonPath, path2: JsonPath = path1) {
  const [hash1, hash2] = resolveHashesByPath(data1, data2, path1, path2)
  expect(hash1).toEqual(hash2)
}

export function checkHashesNotEqualByPath(data1: unknown, data2: unknown, path1: JsonPath, path2: JsonPath = path1) {
  const [hash1, hash2] = resolveHashesByPath(data1, data2, path1, path2)
  expect(hash1).not.toEqual(hash2)
}

export function createSimpleOriginsMetaRecord(key: PropertyKey) {
  return {
    [key]: [{
      'parent': undefined,
      'value': key,
    }],
  } satisfies OriginsMetaRecord
}

export function countUniqueHashes(spec: unknown): number {
  const hashesSet: Set<string> = new Set()
  const hashesMap: Map<unknown, string> = new Map()

  const cycleGuard: Set<unknown> = new Set()
  syncCrawl(spec, ({ value }) => {
    if (!isObject(value)) {
      return { done: true }
    }
    if (TEST_HASH_FLAG in value && value.type === 'object') {
      const hash = value[TEST_HASH_FLAG]()
      hashesSet.add(hash)
      hashesMap.set(value, hash)
    }
    if (cycleGuard.has(value)) {
      return { done: true }
    }
    cycleGuard.add(value)

    return { value }
  })

  return hashesSet.size
}
