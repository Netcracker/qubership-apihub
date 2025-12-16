import { CrawlContext, syncCrawl } from '../src'

describe('crawl test', () => {
  const jestConsole = console
  beforeEach(() => {
    global.console = require('console')
  })
  afterEach(() => {
    global.console = jestConsole
  })

  it('should crawl all nodes', () => {
    const source = {
      name: 'John',
      age: 30,
      address: {
        street: '123 Main St',
        city: 'New York',
      },
    }

    let counter = 0
    syncCrawl(source, (value) => {
      counter++
    })

    expect(counter).toEqual(6)
  })

  it('should crawl all items in array', () => {
    const sym = Symbol('s')
    const source: unknown[] = []
    source[0] = 0
    source[2] = undefined
    source[4] = 4
    source[-4] = -4
    source[sym as any] = 100500

    const keys: any[] = []
    const values: any[] = []
    syncCrawl(source, (ctx) => {
      keys.push(ctx.key)
      values.push(ctx.value)
    })

    expect(keys).toEqual([undefined, 0, 2, 4, -4, sym])
    expect(values).toEqual([source, 0, undefined, 4, -4, 100500])
  })

  it('test skip root level mode', () => {
    function createHook1() {
      return (ctx: CrawlContext<any, any>) => {
        const { value } = ctx
        return { value }
      }
    }

    function createHook2() {
      return (ctx: CrawlContext<any, any>) => {
        const { key, value } = ctx
        visitedKeys.add(key)
        return { value }
      }
    }

    const source = { a: 1, b: 'test' }
    const visitedKeys: Set<unknown> = new Set()

    const hooks = [createHook1(), createHook2()]

    syncCrawl(source, hooks)
    expect(Array.from(visitedKeys)).toEqual([undefined, 'a', 'b'])

    visitedKeys.clear()

    syncCrawl(source, hooks, undefined, true)
    expect(Array.from(visitedKeys)).toEqual(['a', 'b'])
  })
})
