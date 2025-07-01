import { buildGraphApi, createGraphApiTreeForTests } from "./helpers/graphql"

describe('graphapi tree. queries args', () => {
  const jestConsole = console
  beforeEach(() => {
    global.console = require('console')
  })
  afterEach(() => {
    global.console = jestConsole
  })
  
  it('arg with type = ID', () => {
    const graphApi = buildGraphApi(`
      type Query {
        getData(id: ID!): String!
      }
    `)
    const tree = createGraphApiTreeForTests(graphApi)
    const arg = tree.root!
      .children()[0] // query
      ?.children().find(node => node.kind === 'args')
      ?.children()[0] // arg = "id"
    expect(arg?.value()).toMatchObject({ type: 'ID' })
  })

  it('arg with type = String', () => {
    const graphApi = buildGraphApi(`
      type Query {
        getData(id: String!): String!
      }
    `)
    const tree = createGraphApiTreeForTests(graphApi)
    const arg = tree.root!
      .children()[0] // query
      ?.children().find(node => node.kind === 'args')
      ?.children()[0] // arg = "id"
    expect(arg?.value()).toMatchObject({ type: 'string' })
  })

  it('arg with type = Int', () => {
    const graphApi = buildGraphApi(`
      type Query {
        getData(id: Int!): String!
      }
    `)
    const tree = createGraphApiTreeForTests(graphApi)
    const arg = tree.root!
      .children()[0] // query
      ?.children().find(node => node.kind === 'args')
      ?.children()[0] // arg = "id"
    expect(arg?.value()).toMatchObject({ type: 'integer' })
  })

  it('arg with type = Float', () => {
    const graphApi = buildGraphApi(`
      type Query {
        getRandomData(seed: Float!): String!
      }
    `)
    const tree = createGraphApiTreeForTests(graphApi)
    const arg = tree.root!
      .children()[0] // query
      ?.children().find(node => node.kind === 'args')
      ?.children()[0] // arg = "seed"
    expect(arg?.value()).toMatchObject({ type: 'float' })
  })

  it('arg with type = Boolean', () => {
    const graphApi = buildGraphApi(`
      type Query {
        getData(flag: Boolean!): String!
      }
    `)
    const tree = createGraphApiTreeForTests(graphApi)
    const arg = tree.root!
      .children()[0] // query
      ?.children().find(node => node.kind === 'args')
      ?.children()[0] // arg = "flag"
    expect(arg?.value()).toMatchObject({ type: 'boolean' })
  })

  it('arg with type = CustomScalar', () => {
    const graphApi = buildGraphApi(`
      type Query {
        getData(arg: CustomScalar!): String!
      }

      "Description of CustomScalar"
      scalar CustomScalar
    `)
    const tree = createGraphApiTreeForTests(graphApi)
    const arg = tree.root!
      .children()[0] // query
      ?.children().find(node => node.kind === 'args')
      ?.children()[0] // arg = "arg"
    expect(arg?.value()).toMatchObject({
      title: 'CustomScalar',
      type: 'scalar',
      description: 'Description of CustomScalar'
    })
  })

  it('arg with type = MyEnum', () => {
    const graphApi = buildGraphApi(`
      type Query {
        getData(search: MyEnum!): String!
      }

      enum MyEnum {
        "First enum constant"
        First
        Middle @deprecated
        "Last enum constant"
        Last @deprecated(reason: "my reason")
      }
    `)
    const tree = createGraphApiTreeForTests(graphApi)
    const arg = tree.root!
      .children()[0] // query
      ?.children().find(node => node.kind === 'args')
      ?.children()[0] // arg = "search"
    expect(arg?.value()).toMatchObject({
      title: 'MyEnum',
      type: 'enum',
      values: {
        First: {
          description: 'First enum constant',
        },
        Middle: {
          deprecationReason: 'No longer supported',
        },
        Last: {
          description: 'Last enum constant',
          deprecationReason: 'my reason',
        }
      },
    })
  })

  it('arg with type = MyObjectType', () => {
    const graphApi = buildGraphApi(`
      type Query {
        getData(arg: MyObjectType!): String!
      }

      "Test objective type"
      type MyObjectType {
        id: ID!
        data: String
        hash: Int! @deprecated
      }
    `)
    const tree = createGraphApiTreeForTests(graphApi)
    const arg = tree.root!
      .children()[0] // query
      ?.children().find(node => node.kind === 'args')
      ?.children()[0] // arg = "arg"
    expect(arg?.value()).toMatchObject({
      title: 'MyObjectType',
      type: 'object',
      description: 'Test objective type',
    })
    expect(arg?.children().length).toBe(3)
    expect(arg?.children()[0]?.children().find(child => child.kind === 'output')?.value()).toMatchObject({ type: 'ID' })
    expect(arg?.children()[1]?.children().find(child => child.kind === 'output')?.value()).toMatchObject({ type: 'string' })
    expect(arg?.children()[2]?.children().find(child => child.kind === 'output')?.value()).toMatchObject({ type: 'integer' })
    expect(arg?.children()[2]?.meta).toMatchObject({ deprecationReason: 'No longer supported' })
  })

  it('arg with type = MyInputType', () => {
    const graphApi = buildGraphApi(`
      type Query {
        getData(arg: MyInputType!): String!
      }

      "Test input type"
      type MyInputType {
        id: ID!
        data: String
        hash: Int! @deprecated
      }
    `)
    const tree = createGraphApiTreeForTests(graphApi)
    const arg = tree.root!
      .children()[0] // query
      ?.children().find(node => node.kind === 'args')
      ?.children()[0] // arg = "arg"
    expect(arg?.value()).toMatchObject({
      title: 'MyInputType',
      type: 'object',
      description: 'Test input type',
    })
    expect(arg?.children().length).toBe(3)
    expect(arg?.children()[0]?.children().find(child => child.kind === 'output')?.value()).toMatchObject({ type: 'ID' })
    expect(arg?.children()[1]?.children().find(child => child.kind === 'output')?.value()).toMatchObject({ type: 'string' })
    expect(arg?.children()[2]?.children().find(child => child.kind === 'output')?.value()).toMatchObject({ type: 'integer' })
    expect(arg?.children()[2]?.meta).toMatchObject({ deprecationReason: 'No longer supported' })
  })

  it('arg with union of scalars', () => {
    const graphApi = buildGraphApi(`
      type Query {
        getData(arg: MyPrimitiveUnion!): String!
      }

      "Description for my primitive union"
      union MyPrimitiveUnion = ID | String | Int | Float | Boolean
    `)
    const tree = createGraphApiTreeForTests(graphApi)
    const arg = tree.root!
      .children()[0] // query
      ?.children().find(node => node.kind === 'args')
      ?.children()[0] // arg = "arg"
    expect(arg?.nested.length).toBe(5)
    expect(arg?.nested[0]?.value()).toMatchObject({ type: 'ID' })
    expect(arg?.nested[1]?.value()).toMatchObject({ type: 'string' })
    expect(arg?.nested[2]?.value()).toMatchObject({ type: 'integer' })
    expect(arg?.nested[3]?.value()).toMatchObject({ type: 'float' })
    expect(arg?.nested[4]?.value()).toMatchObject({ type: 'boolean' })
  })

  it('arg with union of objects', () => {
    const graphApi = buildGraphApi(`
      type Query {
        getData(arg: MyObjectiveUnion!): String!
      }

      "Description for my objective union"
      union MyObjectiveUnion = MyType1 | MyType2

      type MyType1 {
        key: ID!
        value: String!
      }

      type MyType2 {
        id: ID!
        data: String!
      }
    `)
    const tree = createGraphApiTreeForTests(graphApi)
    const arg = tree.root!
      .children()[0] // query
      ?.children().find(node => node.kind === 'args')
      ?.children()[0] // arg = "arg"
    expect(arg?.nested.length).toBe(2)
    // TODO 21.11.24 // To have this behavior reconsider API of method "value()" for combiners
    // expect(arg?.value()).toMatchObject({ title: 'MyObjectiveUnion', type: 'union', nullable: false })
    expect(arg?.nested[0]?.value()).toMatchObject({ title: 'MyType1', type: 'object' })
    expect(arg?.nested[0]?.children()[0]?.key).toBe('key')
    expect(arg?.nested[0]?.children()[0]?.children()[0]?.value()).toMatchObject({ type: 'ID', nullable: false })
    expect(arg?.nested[0]?.children()[1]?.key).toBe('value')
    expect(arg?.nested[0]?.children()[1]?.children()[0]?.value()).toMatchObject({ type: 'string', nullable: false })
    expect(arg?.nested[1]?.value()).toMatchObject({ title: 'MyType2', type: 'object' })
    expect(arg?.nested[1]?.children()[0]?.key).toBe('id')
    expect(arg?.nested[1]?.children()[0]?.children()[0]?.value()).toMatchObject({ type: 'ID', nullable: false })
    expect(arg?.nested[1]?.children()[1]?.key).toBe('data')
    expect(arg?.nested[1]?.children()[1]?.children()[0]?.value()).toMatchObject({ type: 'string', nullable: false })
  })
})