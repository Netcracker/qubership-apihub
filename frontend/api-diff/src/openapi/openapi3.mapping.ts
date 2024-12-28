import type { MapKeysResult, MappingResolver } from '../types'
import { getStringValue, objectKeys, onlyExistedArrayIndexes } from '../utils'
import { mapPathParams } from './openapi3.utils'

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

export const pathMappingResolver: MappingResolver<string> = (before, after) => {

  const result: MapKeysResult<string> = { added: [], removed: [], mapped: {} }

  const originalBeforeKeys = objectKeys(before)
  const originalAfterKeys = objectKeys(after)
  const unifiedAfterKeys = originalAfterKeys.map(hidePathParamNames)

  const notMappedAfterIndices = new Set(originalAfterKeys.keys())

  originalBeforeKeys.forEach(beforeKey => {
    const unifiedBeforePath = hidePathParamNames(beforeKey)
    const index = unifiedAfterKeys.indexOf(unifiedBeforePath)

    if (index < 0) {
      // removed item
      result.removed.push(beforeKey)
    } else {
      // mapped items
      result.mapped[beforeKey] = originalAfterKeys[index]
      notMappedAfterIndices.delete(index)
    }
  })

  // added items
  notMappedAfterIndices.forEach((notMappedIndex) => result.added.push(originalAfterKeys[notMappedIndex]))

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
  const _beforeKeys = beforeKeys.map((key) => key.split(';')[0] ?? '')
  const afterKeys = objectKeys(after)
  const _afterKeys = afterKeys.map((key) => key.split(';')[0] ?? '')

  const mappedIndex = new Set(afterKeys.keys())

  for (let i = 0; i < beforeKeys.length; i++) {
    const _afterIndex = _afterKeys.findIndex((key) => {
      const [afterType, afterSubType] = key.split('/')
      const [beforeType, beforeSubType] = _beforeKeys[i].split('/')

      if (afterType !== beforeType && afterType !== '*' && beforeType !== '*') { return false }
      if (afterSubType !== beforeSubType && afterSubType !== '*' && beforeSubType !== '*') { return false }
      return true
    })

    if (_afterIndex < 0 || !mappedIndex.has(_afterIndex)) {
      // removed item
      result.removed.push(beforeKeys[i])
    } else {
      // mapped items
      result.mapped[beforeKeys[i]] = afterKeys[_afterIndex]
      mappedIndex.delete(_afterIndex)
    }
  }

  // added items
  mappedIndex.forEach((i) => result.added.push(afterKeys[i]))

  return result
}

function hidePathParamNames(path: string): string {
  return path.replace(PATH_PARAMETER_REGEXP, PATH_PARAM_UNIFIED_PLACEHOLDER)
}

const PATH_PARAMETER_REGEXP = /\{.*?\}/g
const PATH_PARAM_UNIFIED_PLACEHOLDER = '*'
