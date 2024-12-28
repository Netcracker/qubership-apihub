import {
  BEFORE_SECOND_DATA_LEVEL as SECOND_DATA_LEVELS,
  CURRENT_DATA_LEVEL,
  HashOptions,
  InternalHashOptions,
  NormalizationRule,
} from './types'
import { resolveSpec, SPEC_TYPE_GRAPH_API } from './spec-type'
import { CrawlRules, isObject, syncClone, SyncCloneHook, syncCrawl, SyncCrawlHook } from '@netcracker/qubership-apihub-json-crawl'
import { RULES } from './rules'
import objectHash, { NotUndefined } from 'object-hash'

const calculateHash: (object: NotUndefined) => string = (object) => {
  const res = objectHash(object, {
    unorderedArrays: true,
    unorderedObjects: true,
    algorithm: 'md5',
  })
  return res
}

const createHashObject: (object: NotUndefined, rules: CrawlRules<NormalizationRule>) => NotUndefined = (object, rules) => {
  const creatorHook = createHashObjectCreatorHook()
  return syncClone(object, creatorHook, { state: { dataLevel: 0 }, rules }) as NotUndefined
}

const createHashObjectCreatorHook: () => HashObjectCreatorCrawlHook = () => {
  const cycleGuard: Set<unknown> = new Set()
  const creatorHook: HashObjectCreatorCrawlHook = ({ key, value, rules, state }) => {
    if (typeof key === 'symbol') {
      return { done: true }
    }
    if (!rules) {
      return { done: true }
    }
    let ignoreKey = true
    switch (rules.hashStrategy) {
      case CURRENT_DATA_LEVEL: {
        ignoreKey = state.dataLevel > 0
        break
      }
      case SECOND_DATA_LEVELS: {
        ignoreKey = state.dataLevel > 1
        break
      }
    }
    if (!isObject(value)) {
      return { done: ignoreKey, value }
    }
    if (cycleGuard.has(value)) {
      return {
        done: ignoreKey,
        value: rules.newDataLayer ? value : undefined,
        state: {
          ...state,
          dataLevel: key !== undefined && rules.newDataLayer ? state.dataLevel + 1 : state.dataLevel,
        },
      }
    }
    cycleGuard.add(value)
    return {
      done: ignoreKey,
      value,
      state: {
        ...state,
        dataLevel: key !== undefined && rules.newDataLayer ? state.dataLevel + 1 : state.dataLevel,
      },
    }
  }
  return creatorHook
}

const createHashScannerHook: (options: HashOptions) => HashScannerCrawlHook = (options) => {
  const flag = options.hashFlag ?? Symbol('should-never-happen')
  const cycleGuard: Set<unknown> = new Set()
  const hashHook: HashScannerCrawlHook = ({ key, value, rules }) => {
    if (typeof key === 'symbol') {
      return { done: true }
    }

    if (!isObject(value)) {
      return { done: true }
    }

    if (cycleGuard.has(value)) {
      return { done: true }
    }
    cycleGuard.add(value)
    return {
      value, exitHook: rules?.hashOwner ? () => {
        let hash: string | undefined = undefined
        value[flag] = () => {
          if (!hash) {
            hash = calculateHash(createHashObject(value, rules))
          }
          return hash
        }
      } : undefined,
    }
  }

  return hashHook
}

type HashScannerCrawlHook = SyncCrawlHook<HashScannerCrawlState, NormalizationRule>

export interface HashScannerCrawlState {}

type HashObjectCreatorCrawlHook = SyncCloneHook<HashObjectCreatorState, NormalizationRule>

export interface HashObjectCreatorState {
  dataLevel: number
}


export const hash = (value: unknown, options?: HashOptions) => {
  const internalOptions = {
    ...options,
  } satisfies InternalHashOptions
  const flag = options?.hashFlag
  if (!flag) {
    return value
  }
  const spec = resolveSpec(value)
  if (spec.type === SPEC_TYPE_GRAPH_API){
    return value //cause not implemented
  }
  syncCrawl<HashScannerCrawlState, NormalizationRule>(
    value,
    [createHashScannerHook(internalOptions)],
    { rules: RULES[spec.type] },
  )

  return value
}

export const deHash = (value: unknown, options?: HashOptions) => {
  const flag = options?.hashFlag
  if (!flag) {
    return value
  }
  const cycleGuard: Set<unknown> = new Set()
  syncCrawl(value, ({ value }) => {
    if (!isObject(value)) {
      return { done: true }
    }
    if (cycleGuard.has(value)) {
      return { done: true }
    }
    cycleGuard.add(value)
    flag in value && delete value[flag]
    return { value }
  })
  return value
}
