import type { CloneHook, CloneState, CrawlParams } from './types'
import { JSON_ROOT_KEY } from './types'
import { isArray, isObject } from './utils'
import { crawl } from './crawl'

export const transform = async <T extends {}, R extends {} = {}>(data: any, hooks: CloneHook<T, R> | CloneHook<T, R>[] = [], params: CrawlParams<T, R> = {}) => {
  hooks = isArray(hooks) ? hooks : [hooks]
  const root = { '#': data }

  const transformHook: CloneHook<T, R> = async ({ value, path, key, state }) => {
    key = path.length ? key : JSON_ROOT_KEY
    if (value === undefined) {
      if (isArray(state.node) && typeof key === 'number') {
        state.node.splice(key, 1)
      } else if (isObject(state.node) && key in state.node) {
        delete state.node[key]
      }
    } else if (isObject(state.node)) {
      state.node[key] = value
    }
    return { value, state }
  }

  const _params: CrawlParams<CloneState<T>, R> = {
    state: { ...params.state ?? {} as T, root, node: root },
    ...params.rules ? { rules: params.rules } : {},
  }

  await crawl(data, [...hooks, transformHook], _params)

  return root[JSON_ROOT_KEY]
}
