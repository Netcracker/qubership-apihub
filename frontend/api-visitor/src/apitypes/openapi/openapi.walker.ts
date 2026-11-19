import { DEFAULT_OPTION_ORIGINS_META_KEY, InternalVisitorOptions, OpenApiPathVisitor, VisitorOptions, VisitorCrawlState, VisitorCrawlRule, VisitorCrawlHook } from './openapi.types'
import { createSelfMetaCrawlHook, denormalize, normalize, NormalizeOptions, OriginLeafs } from '@netcracker/qubership-apihub-api-unifier'
import { isObject, syncCrawl } from '@netcracker/qubership-apihub-json-crawl'
import { openApiRules } from './openapi.rules'

export class OpenApiWalker {
  private hook: VisitorCrawlHook = ({ key, value, state, rules }) => {
    if (typeof key === 'symbol') {
      return { done: true }
    }
    if (!isObject(value)) {
      return { done: true }
    }
    const alreadyVisited = state.visitedObjects.has(value)
    state.visitedObjects.add(value)
    if (!rules) {
      return { done: true }
    }
    if (rules.passthrough) {
      return { value }
    }
    if (!rules.createContext || !rules.visitorMethodBase) {
      return { done: alreadyVisited, value }
    }
    const ctx = rules.createContext(key, value, state.selfOriginsResolver(key) ?? [], alreadyVisited)
    const visitor = state.visitor as Record<string, ((context: typeof ctx) => boolean) | ((context: typeof ctx) => void)>
    const startFn = (visitor[`${rules.visitorMethodBase}Start`] ?? (() => !alreadyVisited))
    const endFn = (visitor[`${rules.visitorMethodBase}End`] ?? (() => { }))
    const goDeeper = startFn(ctx)
    return {
      done: !goDeeper,
      value,
      exitHook: () => endFn(ctx),
    }
  }

  walkPaths(source: unknown, visitor: OpenApiPathVisitor, options?: VisitorOptions & Omit<NormalizeOptions, 'originsFlag'>): void {
    const normalizeOptions: InternalVisitorOptions & NormalizeOptions = {
      originsFlag: DEFAULT_OPTION_ORIGINS_META_KEY,
      validate: true,
      ...options,
      resolveRef: true,
    }
    const cycledJsoSpec = denormalize(normalize(source, normalizeOptions), normalizeOptions)
    this.walkPathsOnNormalizedSource(cycledJsoSpec, visitor, normalizeOptions)
  }

  walkPathsOnNormalizedSource(normalizedSource: unknown, visitor: OpenApiPathVisitor, options?: VisitorOptions): void {
    const internalOptions: InternalVisitorOptions = {
      originsFlag: DEFAULT_OPTION_ORIGINS_META_KEY,
      ...options,
    }
    this.walkOnNormalizedInternal(normalizedSource, visitor, internalOptions)
  }

  private walkOnNormalizedInternal(normalizedSource: unknown, visitor: OpenApiPathVisitor, internalOptions: InternalVisitorOptions): void {
    const visitedObjects: Set<unknown> = new Set()
    syncCrawl<VisitorCrawlState, VisitorCrawlRule>(normalizedSource,
      [
        this.hook,
        createSelfMetaCrawlHook<OriginLeafs, 'selfOriginsResolver', VisitorCrawlState, VisitorCrawlRule>('selfOriginsResolver', internalOptions.originsFlag, []),
      ],
      {
        state: {
          visitor,
          internalOptions,
          visitedObjects,
          selfOriginsResolver: () => [],
        },
        rules: openApiRules,
      },
    )
  }
}
