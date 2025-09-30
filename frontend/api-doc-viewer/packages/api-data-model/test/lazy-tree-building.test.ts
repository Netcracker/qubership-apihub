import { graphApiNodeKind, graphSchemaNodeKind } from "../src/graph-api/constants"
import { buildGraphApi, createGraphApiTreeForTests } from "./helpers/graphql"

describe('Lazy Tree Building', () => {
  const jestConsole = console
  beforeEach(() => {
    global.console = require('console')
  })
  afterEach(() => {
    global.console = jestConsole
  })

  it('expand method returning array', () => {
    const graphql = `
      type Query {
        test: Out!
      }
      type Out {
        arr: [Int]
      }
    `
    const graphApi = buildGraphApi(graphql)
    const tree = createGraphApiTreeForTests(graphApi)
    expect(tree).toBeDefined()

    const root = tree.root!
    const query = root.children().find(node => node.kind === graphApiNodeKind.query)!
    const queryOutput = query.children().find(node => node.kind === graphSchemaNodeKind.output)!
    const methodArr = queryOutput.children().find(node => (
      node.kind === graphSchemaNodeKind.method &&
      node.key === 'arr'
    ))!
    expect(methodArr.children().length).toBe(0)
    methodArr.expand()
    expect(methodArr.children().length).toBe(1)
    methodArr.collapse()
    expect(methodArr.children().length).toBe(0)
  })
})