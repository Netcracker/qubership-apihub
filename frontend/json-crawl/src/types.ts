export type JsonPath = PropertyKey[]

export interface CrawlParams<T extends {}, R extends {} = {}> {
  state?: T
  rules?: CrawlRules<R> | CrawlRules<R>[]
}

export interface CrawlContext<T extends {}, R extends {} = {}> {
  readonly value: unknown         // current node value
  readonly path: JsonPath         // path to current node
  readonly key: PropertyKey   // current node key
  state: T                        // crawl state
  rules?: CrawlRules<R>           // current node rules
}

export type Runnable = () => void

export interface CrawlHookResponse<T extends {}, R extends {}> {
  value?: unknown,                        // updated value of current node for crawl
  state?: T                               // state for next crawl step
  rules?: CrawlRules<R>                   // rules for next crawl step
  afterHooksHook?: Runnable               // on execute all hooks for current node
  exitHook?: Runnable                     // on exit hook for current node
  terminate?: boolean                     // crawl should be terminated
  done?: boolean                          // crawl of current node should be terminated
}

export type CloneState<T extends {} = {}> = {
  root: { [JSON_ROOT_KEY]: any }
  node: Record<PropertyKey, unknown>
} & T

export type CloneHook<T extends {} = {}, R extends {} = {}> = CrawlHook<CloneState<T>, R>
export type CrawlHook<T extends {} = {}, R extends {} = {}> = (ctx: CrawlContext<T, R>) => Promise<CrawlHookResponse<T, R> | void> | CrawlHookResponse<T, R> | void

export type SyncCloneHook<T extends {} = {}, R extends {} = {}> = SyncCrawlHook<CloneState<T>, R>
export type SyncCrawlHook<T extends {} = {}, R extends {} = {}> = (ctx: CrawlContext<T, R>) => CrawlHookResponse<T, R> | void

export type CrawlRulesContext = {
  key: PropertyKey
  path: JsonPath
  value: unknown
}
export type CrawlRulesFunc<R extends {}> = (ctx: CrawlRulesContext) => CrawlRules<R> | undefined
export type CrawlRulesKey = `/${string}`
export type CrawlChildType<R extends {}> = CrawlRules<R> | CrawlRulesFunc<R>

export type CrawlRules<R extends {} = {}> = {
  [key: CrawlRulesKey | '/*']: CrawlChildType<R | {}>
} & R

export const JSON_ROOT_KEY = '#'
