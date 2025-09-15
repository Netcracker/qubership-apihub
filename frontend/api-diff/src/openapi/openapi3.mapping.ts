import { MapKeysResult, MappingResolver, NodeContext } from '../types'
import { difference, getStringValue, intersection, objectKeys, onlyExistedArrayIndexes } from '../utils'
import { mapPathParams } from './openapi3.utils'
import { OpenAPIV3 } from 'openapi-types'

export const singleOperationPathMappingResolver: MappingResolver<string> = (before, after) => {

  const result: MapKeysResult<string> = { added: [], removed: [], mapped: {} }

  const beforeKeys = objectKeys(before)
  const afterKeys = objectKeys(after)
  const keysMaxLength = Math.max(beforeKeys.length, afterKeys.length)

  for (let i = 0; i < keysMaxLength; i++) {
    if (!beforeKeys[i]) {
      result.added.push(afterKeys[i])
    } else if (!afterKeys[i]) {
      result.removed.push(beforeKeys[i])
    } else {
      result.mapped[beforeKeys[i]] = afterKeys[i]
    }
  }

  return result
}

export const pathMappingResolver: MappingResolver<string> = (before, after, ctx) => {

  const result: MapKeysResult<string> = { added: [], removed: [], mapped: {} }

  const unifyBeforePath = createPathUnifier(ctx.before)
  const unifyAfterPath = createPathUnifier(ctx.after)

  const unifiedBeforeKeyToKey = Object.fromEntries(objectKeys(before).map(key => [unifyBeforePath(key), key]))
  const unifiedAfterKeyToKey = Object.fromEntries(objectKeys(after).map(key => [unifyAfterPath(key), key]))

  const unifiedBeforeKeys = Object.keys(unifiedBeforeKeyToKey)
  const unifiedAfterKeys = Object.keys(unifiedAfterKeyToKey)

  result.added = difference(unifiedAfterKeys, unifiedBeforeKeys).map(key => unifiedAfterKeyToKey[key])
  result.removed = difference(unifiedBeforeKeys, unifiedAfterKeys).map(key => unifiedBeforeKeyToKey[key])
  result.mapped = Object.fromEntries(
    intersection(unifiedBeforeKeys, unifiedAfterKeys).map(key => [unifiedBeforeKeyToKey[key], unifiedAfterKeyToKey[key]]),
  )

  return result
}

export const methodMappingResolver: MappingResolver<string> = (before, after) => {

  const result: MapKeysResult<string> = { added: [], removed: [], mapped: {} }

  const beforeKeys = objectKeys(before)
  const afterKeys = objectKeys(after)

  result.added = difference(afterKeys, beforeKeys)
  result.removed = difference(beforeKeys, afterKeys)

  const mapped = intersection(beforeKeys, afterKeys)
  mapped.forEach(key => result.mapped[key] = key)

  return result
}

export const paramMappingResolver: (pathLevel: number) => MappingResolver<number> = (pathLevel) => {
  return (before, after, ctx) => {
    const result: MapKeysResult<number> = { added: [], removed: [], mapped: {} }

    const pathParamMapping = mapPathParams(ctx, pathLevel)
    const afterKeys = onlyExistedArrayIndexes(after)
    const beforeKeys = onlyExistedArrayIndexes(before)
    const mappedIndex = new Set<number>(afterKeys)
    beforeKeys.forEach(i => {
      const beforeIn = getStringValue(before[i], 'in')
      const beforeName = getStringValue(before[i], 'name') ?? ''

      const _afterIndex = after.findIndex((a) => {
        const afterIn = getStringValue(a, 'in')
        const afterName = getStringValue(a, 'name') ?? ''

        // use extra mapping logic for path parameters
        return beforeIn === afterIn && (beforeName === afterName || (beforeIn === 'path' && pathParamMapping[beforeName] === afterName))
      })

      if (_afterIndex < 0) {
        // removed item
        result.removed.push(i)
      } else {
        // mapped items
        result.mapped[i] = _afterIndex
        mappedIndex.delete(_afterIndex)
      }
    })
    // added items
    mappedIndex.forEach((i) => result.added.push(i))
    return result
  }
}

export const contentMediaTypeMappingResolver: MappingResolver<string> = (before, after) => {
  const result: MapKeysResult<string> = { added: [], removed: [], mapped: {} }

  const beforeKeys = objectKeys(before)
  const afterKeys = objectKeys(after)

  const unmappedAfterIndices = new Set(afterKeys.keys())
  const unmappedBeforeIndices = new Set(beforeKeys.keys())

  function mapExactMatches(
    getComparisonKey: (key: string) => string
  ): void {
    
    for (const beforeIndex of unmappedBeforeIndices) {
      const beforeKey = getComparisonKey(beforeKeys[beforeIndex])
      
      // Find matching after index by iterating over the after indices set
      let matchingAfterIndex: number | undefined
      for (const afterIndex of unmappedAfterIndices) {
        const afterKey = getComparisonKey(afterKeys[afterIndex])
        if (afterKey === beforeKey) {
          matchingAfterIndex = afterIndex
          break
        }
      }

      if (matchingAfterIndex !== undefined) {
        // Match found - create mapping and remove from unmapped sets
        result.mapped[beforeKeys[beforeIndex]] = afterKeys[matchingAfterIndex]
        unmappedAfterIndices.delete(matchingAfterIndex)
        unmappedBeforeIndices.delete(beforeIndex)
      }
    }
  }

  // First, map exact matches for full media type
  mapExactMatches((key) => key)

  // After that, try to map media types by base type for remaining unmapped keys
  mapExactMatches(getMediaTypeBase)

  // If exactly one unmapped item in both before and after, try wildcard matching
  if (unmappedBeforeIndices.size === 1 && unmappedAfterIndices.size === 1) {
    const beforeIndex = Array.from(unmappedBeforeIndices)[0]
    const afterIndex = Array.from(unmappedAfterIndices)[0]
    const beforeKey = beforeKeys[beforeIndex]
    const afterKey = afterKeys[afterIndex]
    const beforeBaseType = getMediaTypeBase(beforeKey)
    const afterBaseType = getMediaTypeBase(afterKey)

    // Check if they are compatible using wildcard matching
    if (isWildcardCompatible(beforeBaseType, afterBaseType)) {
      // Map them together
      result.mapped[beforeKeys[beforeIndex]] = afterKeys[afterIndex]
      unmappedAfterIndices.delete(afterIndex)
      unmappedBeforeIndices.delete(beforeIndex)
    }
  }

  // Mark remaining unmapped items as removed/added
  unmappedBeforeIndices.forEach((index) => result.removed.push(beforeKeys[index]))
  unmappedAfterIndices.forEach((index) => result.added.push(afterKeys[index]))

  return result
}

function getMediaTypeBase(mediaType: string): string {
  return mediaType.split(';')[0] ?? ''
}

function isWildcardCompatible(beforeType: string, afterType: string): boolean {
  const [beforeMainType, beforeSubType] = beforeType.split('/')
  const [afterMainType, afterSubType] = afterType.split('/')

  // Check main type compatibility
  if (beforeMainType !== afterMainType && beforeMainType !== '*' && afterMainType !== '*') {
    return false
  }

  // Check sub type compatibility
  if (beforeSubType !== afterSubType && beforeSubType !== '*' && afterSubType !== '*') {
    return false
  }

  return true
}

// todo copy-paste from api-processor
export const extractOperationBasePath = (servers?: OpenAPIV3.ServerObject[]): string => {
  if (!Array.isArray(servers) || !servers.length) { return '' }

  try {
    const [firstServer] = servers
    let serverUrl = firstServer.url
    const { variables = {} } = firstServer

    for (const param of Object.keys(variables)) {
      serverUrl = serverUrl.replace(new RegExp(`{${param}}`, 'g'), variables[param].default)
    }

    const { pathname } = new URL(serverUrl, 'https://localhost')
    return pathname.slice(-1) === '/' ? pathname.slice(0, -1) : pathname
  } catch (error) {
    return ''
  }
}

export function createPathUnifier(nodeContext: NodeContext): (path: string) => string {
  const serverPrefix = extractOperationBasePath((nodeContext.root as OpenAPIV3.Document).servers) // /api/v2
  return (path) => (
    serverPrefix
      ? `${serverPrefix}${hidePathParamNames(path)}`
      : hidePathParamNames(path)
  )
}

export function hidePathParamNames(path: string): string {
  return path.replace(PATH_PARAMETER_REGEXP, PATH_PARAM_UNIFIED_PLACEHOLDER)
}

const PATH_PARAMETER_REGEXP = /\{.*?\}/g
const PATH_PARAM_UNIFIED_PLACEHOLDER = '*'
