import type { CrawlContext, CrawlHook, CrawlParams, CrawlRules, JsonPath, Runnable, SyncCrawlHook } from './types'
import { getNodeRules, mergeRules } from './rules'
import { anyArrayKeys, isArray, isObject } from './utils'

interface CrawlNode<T extends {}, R extends {}> {
  // node path
  path: JsonPath
  // node data
  data: Record<PropertyKey, any>

  // node keys
  keys: Array<PropertyKey>
  // current key
  keyIndex: number

  // node rules
  rules?: CrawlRules<R>

  // node state
  state: T
  // node onExit hooks 
  hooks?: Runnable[]
}

export const crawl = async <T extends {}, R extends {} = {}>(data: any, hooks: CrawlHook<T, R> | CrawlHook<T, R>[] | SyncCrawlHook<T, R> | SyncCrawlHook<T, R>[], params: CrawlParams<T, R> = {}): Promise<void> => {
  hooks = isArray(hooks) ? hooks : [hooks]
  const _rules = isArray(params.rules) ? mergeRules(params.rules) : params.rules

  const nodes: CrawlNode<T, R>[] = [{ data, state: params.state!, path: [], keys: [], keyIndex: -1, rules: _rules! }]
  while (nodes.length > 0) {
    const node = nodes[nodes.length - 1]

    if (node.keyIndex >= node.keys.length) {
      // execute exitHooks
      while (node.hooks?.length) { node.hooks.pop()!() }

      // move to parent node
      nodes.pop()
      continue
    }

    const key = node.keys[node.keyIndex++]

    const [value, path, rules] = nodes.length > 1
      ? [node.data[key], [...node.path, key], getNodeRules(node.rules, key, [...node.path, key], node.data[key])]
      : [node.data, node.path, _rules] // root node

    let context: CrawlContext<T, R> | null = { value, path, key, state: node.state, rules }
    const afterHooksHooks: Runnable[] = []
    const exitHooks: Runnable[] = []

    // execute hooks
    for (const hook of hooks) {
      if (!hook || typeof hook !== 'function') { continue }
      const {
        terminate,
        done,
        exitHook,
        afterHooksHook,
        ...rest
      } = await hook(context) ?? {}
      if (terminate) { return }
      exitHook && exitHooks.push(exitHook)
      afterHooksHook && afterHooksHooks.push(afterHooksHook)
      context = { ...context, ...rest }
      if (done) {
        context = null
        break
      }
    }
    while (afterHooksHooks.length) { afterHooksHooks.pop()!() }

    // crawl result value
    if (context && isObject(context.value)) {
      const keys = isArray(context.value) ? anyArrayKeys(context.value) : Reflect.ownKeys(context.value)
      nodes.push({
        hooks: exitHooks,
        state: context.state,
        data: context.value,
        path,
        keys,
        keyIndex: 0,
        rules: context.rules,
      })
    } else {
      // execute exitHooks
      while (exitHooks.length) { exitHooks.pop()!() }
    }
  }
}

export const syncCrawl = <T extends {}, R extends {} = {}>(data: any, hooks: SyncCrawlHook<T, R> | SyncCrawlHook<T, R>[], params: CrawlParams<T, R> = {}): void => {
  hooks = isArray(hooks) ? hooks : [hooks]
  const _rules = isArray(params.rules) ? mergeRules(params.rules) : params.rules

  const nodes: CrawlNode<T, R>[] = [{ data, state: params.state!, path: [], keys: [], keyIndex: -1, rules: _rules! }]
  while (nodes.length > 0) {
    const node = nodes[nodes.length - 1]

    if (node.keyIndex >= node.keys.length) {
      // execute exitHooks
      while (node.hooks?.length) { node.hooks.pop()!() }

      // move to parent node
      nodes.pop()
      continue
    }

    const key = node.keys[node.keyIndex++]

    const [value, path, rules] = nodes.length > 1
      ? [node.data[key], [...node.path, key], getNodeRules(node.rules, key, [...node.path, key], node.data[key])]
      : [node.data, node.path, _rules] // root node

    let context: CrawlContext<T, R> | null = { value, path, key, state: node.state, rules }
    const afterHooksHooks: Runnable[] = []
    const exitHooks: Runnable[] = []

    // execute hooks
    for (const hook of hooks) {
      if (!hook || typeof hook !== 'function') { continue }
      const {
        terminate,
        done,
        exitHook,
        afterHooksHook,
        ...rest
      } = hook(context) ?? {}
      if (terminate) { return }
      exitHook && exitHooks.push(exitHook)
      afterHooksHook && afterHooksHooks.push(afterHooksHook)
      context = { ...context, ...rest }
      if (done) {
        context = null
        break
      }
    }
    while (afterHooksHooks.length) { afterHooksHooks.pop()!() }

    // crawl result value
    if (context && isObject(context.value)) {
      const keys = isArray(context.value) ? anyArrayKeys(context.value) : Reflect.ownKeys(context.value)
      // move to child nodes
      nodes.push({
        hooks: exitHooks,
        state: context.state!,
        data: context.value,
        path,
        keys,
        keyIndex: 0,
        rules: context.rules,
      })
    } else {
      // execute exitHooks
      while (exitHooks.length) { exitHooks.pop()!() }
    }
  }
}
