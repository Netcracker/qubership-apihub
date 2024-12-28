import type { SyncCrawlHook } from './types'
import { syncCrawl } from './crawl'
import { isArray } from './utils'

interface EqualState {
  value: any
}

export const equal = (val1: unknown, val2: unknown): boolean => {
  if (val1 === val2) { return true }

  let result = true

  const equalHook: SyncCrawlHook<EqualState> = ({ value, key, state }) => {
    const _value = key === undefined ? state.value : state.value[key]
    const _result = { state: { value: _value } }

    if (value === _value) {
      return _result
    }

    result = false
    if (typeof value !== typeof _value) { return { done: true } }

    if (isArray(value) && value.length !== _value.length) {
      return { terminate: true }
    } else if (typeof value === 'object' && value !== null) {
      const keys1 = Object.keys(value)
      const keys2 = Object.keys(_value)
      if (keys1.length !== keys2.length || !keys1.every((key) => keys2.includes(key))) {
        return { terminate: true }
      }
    } else if (value !== _value) {
      return { terminate: true }
    }

    result = true
    return _result
  }

  syncCrawl<EqualState>(val1, equalHook, { state: { value: val2 } })

  return result
}
