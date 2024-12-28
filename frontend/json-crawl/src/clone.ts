import type { CloneHook, CloneState, CrawlParams, SyncCloneHook } from './types'
import { JSON_ROOT_KEY } from './types'
import { crawl, syncCrawl } from './crawl'
import { isObject } from './utils'

const createCloneHook = <T extends {}, R extends {} = {}>(): SyncCloneHook<T, R> => {
  //do not inline cause need to separate hooks in debug
  const cloneHook: SyncCloneHook<T, R> = ({ value, path, key, state }) => {
    key = path.length ? key : JSON_ROOT_KEY
    state.node[key] = isObject(value) ? (Array.isArray(value) ? [] : {}) : value
    return { value, state: { ...state, node: state.node[key] } }
  }
  return cloneHook
}

export const clone = async <T extends {}, R extends {} = {}>(
  data: unknown,
  hooks: CloneHook<T, R> | CloneHook<T, R>[] | SyncCloneHook<T, R> | SyncCloneHook<T, R>[] = [],
  params: CrawlParams<T, R> = {},
): Promise<unknown> => {
  hooks = Array.isArray(hooks) ? hooks : [hooks]
  const root: any = {}

  const _params: CrawlParams<CloneState<T>, R> = {
    state: { ...params.state ?? {} as T, root, node: root },
    ...params.rules ? { rules: params.rules } : {},
  }

  await crawl<CloneState<T>, R>(data, [...hooks, createCloneHook<T, R>()], _params)

  return root[JSON_ROOT_KEY]
}

export const syncClone = <T extends {}, R extends {} = {}>(
  data: unknown,
  hooks: SyncCloneHook<T, R> | SyncCloneHook<T, R>[] = [],
  params: CrawlParams<T, R> = {},
): unknown => {
  hooks = Array.isArray(hooks) ? hooks : [hooks]
  const root = { [JSON_ROOT_KEY]: undefined }

  const _params: CrawlParams<CloneState<T>, R> = {
    state: { ...params.state ?? {} as T, root, node: root },
    ...params.rules ? { rules: params.rules } : {},
  }

  syncCrawl<CloneState<T>, R>(data, [...hooks, createCloneHook<T, R>()], _params)

  return root[JSON_ROOT_KEY]
}
