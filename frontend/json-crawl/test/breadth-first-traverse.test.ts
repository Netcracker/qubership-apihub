import { CrawlContext } from "../src/types"
import { breadthFirstTraverse } from "../src/breadth-first-traverse"

describe('Breadth-first traverse test', () => {
  const jestConsole = console
  beforeEach(() => {
    global.console = require('console')
  })
  afterEach(() => {
    global.console = jestConsole
  })
  
  it('example', () => {
    const example = {
      a: 1234,
      b: 'test',
      c: [1, 2, 3],
      d: {
        e: 4567,
        f: 'test2',
      },
      g: null,
      h: Symbol('test'),
      i: true,
    }

    function createHook1() {
      return (ctx: CrawlContext<any, any>) => {
        // console.log(ctx.value)
      }
    }

    function createHook2() {
      return ({ key, value, path }: CrawlContext<any, any>) => {
        console.log(path)
      }
    }

    const hooks = [
      createHook1(),
      createHook2(),
    ]

    breadthFirstTraverse(example, hooks)
  })
})
