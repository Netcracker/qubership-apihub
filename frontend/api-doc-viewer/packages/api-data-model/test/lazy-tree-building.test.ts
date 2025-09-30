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

  it('expand single-level output (output type) with a list', () => {
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

  it('expand single-level output (output type) with an object', () => {
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

  it('expand multi-level output (output type) with an object', () => {
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

  it('expand single-level output (input type) with a list', () => {
    const graphql = `
      type Query {
        test: In!
      }
      input In {
        arr: [Int]
      }
    `
    const graphApi = buildGraphApi(graphql)
    const tree = createGraphApiTreeForTests(graphApi)
    expect(tree).toBeDefined()

    const root = tree.root!
    const query = root.children().find(node => node.kind === graphApiNodeKind.query)!
    const queryOutput = query.children().find(node => node.kind === graphSchemaNodeKind.output)!
    const propArr = queryOutput.children().find(node => node.kind === graphSchemaNodeKind.property)!
    expect(propArr.children().length).toBe(0)
    propArr.expand()
    expect(propArr.children().length).toBe(1)
    propArr.collapse()
    expect(propArr.children().length).toBe(0)
  })

  it('expand single-level output (input type) with an object', () => {
    const graphql = `
      type Query {
        test: In!
      }
      input In {
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
    const propObj = queryOutput.children().find(node => node.kind === graphSchemaNodeKind.property)!
    expect(propObj.children().length).toBe(0)
    propObj.expand()
    expect(propObj.children().length).toBe(1)
    expect(propObj.children()[0].children().length).toBe(0)
    propObj.collapse()
    expect(propObj.children().length).toBe(0)
  })

  it('expand multi-level output (input type) with an object', () => {
    const graphql = `
      type Query {
        test: In!
      }
      input In {
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
    const propObj = queryOutput.children().find(node => node.kind === graphSchemaNodeKind.property)!
    // Expand property "obj"
    expect(propObj.children().length).toBe(0)
    propObj.expand()
    expect(propObj.children().length).toBe(1)
    expect(propObj.children()[0].children().length).toBe(0)
    // Expand method "int"
    const methodInt = propObj.children().find(node => node.kind === graphSchemaNodeKind.method)!
    expect(methodInt.children().length).toBe(0)
    methodInt.expand()
    expect(methodInt.children().length).toBe(1)
    expect(methodInt.children()[0].children().length).toBe(0)
    // Collapse all descendants
    propObj.collapse()
    expect(propObj.children().length).toBe(0)
  })

  it('expand single-level argument (input type) with a list', () => {
    const graphQl = `
      type Query {
        test(ids: [ID!]!): String!
      }
    `
    const graphApi = buildGraphApi(graphQl)
    const tree = createGraphApiTreeForTests(graphApi)
    const root = tree.root!
    // 1
    const query = root
      .children()
      .find(node => node.kind === graphApiNodeKind.query)!
    // 2
    const queryArgs = query
      .children()
      .find(node => node.kind === graphSchemaNodeKind.args)!
    // 3, initializing build stops here (by default)
    const queryArgIds = queryArgs
      .children()
      .find(node => node.kind === graphSchemaNodeKind.arg)!
    expect(queryArgIds.children().length).toBe(0)
    queryArgIds.expand()
    expect(queryArgIds.children().length).toBe(1)
    // 4
    const items = queryArgIds
      .children()
      .find(node => node.kind === graphSchemaNodeKind.items)!
    expect(items.children().length).toBe(0)
  })

  it('expand multi-level argument (input type) with a list of output types', () => {
    const graphQl = `
      type Query {
        test(ids: [Obj!]!): String!
      }
      
      type Obj {
        id: ID!
      }
    `
    const graphApi = buildGraphApi(graphQl)
    const tree = createGraphApiTreeForTests(graphApi)
    const root = tree.root!
    // 1
    const query = root
      .children()
      .find(node => node.kind === graphApiNodeKind.query)!
    // 2
    const queryArgs = query
      .children()
      .find(node => node.kind === graphSchemaNodeKind.args)!
    // 3, initializing build stops here (by default)
    const queryArgIds = queryArgs
      .children()
      .find(node => node.kind === graphSchemaNodeKind.arg)!
    expect(queryArgIds.children().length).toBe(0)
    queryArgIds.expand()
    expect(queryArgIds.children().length).toBe(1)
    // 4
    const items = queryArgIds
      .children()
      .find(node => node.kind === graphSchemaNodeKind.items)!
    expect(items.children().length).toBe(0)
    items.expand()
    expect(items.children().length).toBe(1)
    // 5
    const methodId = items
      .children()
      .find(node => node.kind === graphSchemaNodeKind.method)!
    expect(methodId.children().length).toBe(0)
    methodId.expand()
    expect(methodId.children().length).toBe(1)
    // 6
    const methodIdOutput = methodId
      .children()
      .find(node => node.kind === graphSchemaNodeKind.output)!
    expect(methodIdOutput.children().length).toBe(0)
  })
})