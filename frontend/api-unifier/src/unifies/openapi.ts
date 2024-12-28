import { UnifyFunction } from '../types'
import { isObject } from '@netcracker/qubership-apihub-json-crawl'
import { OpenAPIV3 } from 'openapi-types'
import { OPEN_API_HTTP_METHODS } from '../rules/openapi.const'
import { cleanSeveralOrigins, concatenateArraysInProperty, copyProperty } from '../origins'
import PathItemObject = OpenAPIV3.PathItemObject

const EXTENSION_PREFIX = 'x-'

export const pathItemsUnification: UnifyFunction = (value, { options }) => {
  if (!isObject(value)) { return value}
  const pathItem: PathItemObject = value
  const {
    parameters: pathParameters,
    servers: pathServers,
    summary: pathSummary,
    description: pathDescription,
    ...restItems
  } = pathItem

  if (!pathParameters && !pathServers && !pathSummary && !pathDescription) {
    return value
  }

  const { symbols, extensionKeys } = Reflect.ownKeys(restItems).reduce((result, key) => {
    if (typeof key === 'symbol') {
      result.symbols[key] = value[key]
    }
    if (typeof key === 'string' && key.startsWith(EXTENSION_PREFIX)) {
      result.extensionKeys.add(key)
    }
    return result
  }, { symbols: {}, extensionKeys: new Set<string>() } as {
    symbols: Record<symbol, unknown>,
    extensionKeys: Set<string>
  })
  const newPathItem = OPEN_API_HTTP_METHODS.reduce((result, method) => {
    const operation = pathItem[method]
    if (!operation) {
      return result
    }
    result[method] = operation //origin copy already.
    // Deep copy not allowed!!! So only mutations :(
    concatenateArraysInProperty(pathItem, operation, 'parameters', options.originsFlag)
    concatenateArraysInProperty(pathItem, operation, 'servers', options.originsFlag)
    if (operation.summary === undefined && pathSummary !== undefined) {
      copyProperty(pathItem, operation, 'summary', options.originsFlag)
    }
    if (operation.description === undefined && pathDescription !== undefined) {
      copyProperty(pathItem, operation, 'description', options.originsFlag)
    }
    extensionKeys.forEach(extensionKey => {
      if (!(extensionKey in operation)) {
        copyProperty(pathItem, operation, extensionKey, options.originsFlag)
      }
    })
    return result
  }, { ...symbols } as PathItemObject)

  cleanSeveralOrigins(newPathItem, ['parameters', 'servers', 'summary', 'description', ...extensionKeys], options.originsFlag)
  if (Object.keys(newPathItem).length === 0) {
    return value
  }
  return newPathItem
}
