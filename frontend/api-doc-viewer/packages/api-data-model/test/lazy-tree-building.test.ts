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

  it('expand single-level output with a list', () => {
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
    const methodArr = queryOutput.children().find(node => node.kind === graphSchemaNodeKind.method)!
    expect(methodArr.children().length).toBe(0)
    methodArr.expand()
    expect(methodArr.children().length).toBe(1)
    methodArr.collapse()
    expect(methodArr.children().length).toBe(0)
  })

  it('expand single-level output with an object', () => {
    const graphql = `
      type Query {
        test: Out!
      }
      type Out {
        obj: Obj!
      }
      type Obj {
        int: Int
      }
    `
    const graphApi = buildGraphApi(graphql)
    const tree = createGraphApiTreeForTests(graphApi)
    expect(tree).toBeDefined()

    const root = tree.root!
    const query = root.children().find(node => node.kind === graphApiNodeKind.query)!
    const queryOutput = query.children().find(node => node.kind === graphSchemaNodeKind.output)!
    const methodObj = queryOutput.children().find(node => node.kind === graphSchemaNodeKind.method)!
    expect(methodObj.children().length).toBe(0)
    methodObj.expand()
    expect(methodObj.children().length).toBe(1)
    expect(methodObj.children()[0].children().length).toBe(0)
    methodObj.collapse()
    expect(methodObj.children().length).toBe(0)
  })

  it('expand multi-level output with an object', () => {
    const graphql = `
      type Query {
        test: Out!
      }
      type Out {
        obj: Obj!
      }
      type Obj {
        int: Int
      }
    `
    const graphApi = buildGraphApi(graphql)
    const tree = createGraphApiTreeForTests(graphApi)
    expect(tree).toBeDefined()

    const root = tree.root!
    const query = root.children().find(node => node.kind === graphApiNodeKind.query)!
    const queryOutput = query.children().find(node => node.kind === graphSchemaNodeKind.output)!
    const methodObj = queryOutput.children().find(node => node.kind === graphSchemaNodeKind.method)!
    // Expand method "obj"
    expect(methodObj.children().length).toBe(0)
    methodObj.expand()
    expect(methodObj.children().length).toBe(1)
    expect(methodObj.children()[0].children().length).toBe(0)
    // Expand output of method "obj"
    const methodObjOutput = methodObj.children().find(node => node.kind === graphSchemaNodeKind.output)!
    expect(methodObjOutput.children().length).toBe(0)
    methodObjOutput.expand()
    expect(methodObjOutput.children().length).toBe(1)
    expect(methodObjOutput.children()[0].children().length).toBe(0)
    // Expand method "int"
    const methodInt = methodObjOutput.children().find(node => node.kind === graphSchemaNodeKind.method)!
    expect(methodInt.children().length).toBe(0)
    methodInt.expand()
    expect(methodInt.children().length).toBe(1)
    expect(methodInt.children()[0].children().length).toBe(0)
    // Collapse all descendants
    methodObj.collapse()
    expect(methodObj.children().length).toBe(0)
  })
})