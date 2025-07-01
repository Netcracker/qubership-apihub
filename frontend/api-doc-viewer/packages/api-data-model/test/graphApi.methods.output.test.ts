import { buildGraphApi, createGraphApiTreeForTests } from "./helpers/graphql"

describe('graphapi tree. methods output', () => {
  const jestConsole = console
  beforeEach(() => {
    global.console = require('console')
  })
  afterEach(() => {
    global.console = jestConsole
  })
  
  it('scalar', () => {
    const graphApi = buildGraphApi(`
      type Query {
        getRootEntity: Root!
      }

      type Root {
        test: ID!
      }
    `)
    const tree = createGraphApiTreeForTests(graphApi)
    const propertyOutput = tree.root!
      .children()[0] // query
      ?.children()?.find(node => node.kind === 'output')
      ?.children()[0] // test
      ?.children()?.find(node => node.kind === 'output')
    expect(propertyOutput?.value()).toMatchObject({ type: 'ID' })
  })

  it('enum', () => {
    const graphApi = buildGraphApi(`
      type Query {
        getRootEntity: Root!
      }

      type Root {
        test: Enum!
      }

      enum Enum {
        "Description of 1st"
        First
        Second @deprecated
      }
    `)
    const tree = createGraphApiTreeForTests(graphApi)
    const propertyOutput = tree.root!
      .children()[0] // query
      ?.children()?.find(node => node.kind === 'output')
      ?.children()[0] // test
      ?.children()?.find(node => node.kind === 'output')
    expect(propertyOutput?.value())
      .toMatchObject({
        title: 'Enum',
        type: 'enum',
        values: {
          First: { description: 'Description of 1st' },
          Second: { deprecationReason: 'No longer supported' }
        }
      })
  })

  it('object', () => {
    const graphApi = buildGraphApi(`
      type Query {
        getRootEntity: Root!
      }

      type Root {
        test: Object!
      }

      type Object {
        id: ID!
        data: String!
      }
    `)
    const tree = createGraphApiTreeForTests(graphApi)
    const propertyOutput = tree.root!
      .children()[0] // query
      ?.children()?.find(node => node.kind === 'output')
      ?.children()[0] // test
      ?.children()?.find(node => node.kind === 'output')
    expect(propertyOutput?.value()).toMatchObject({ title: 'Object', type: 'object', nullable: false })
    expect(propertyOutput?.children()[0]?.children()[0]?.value()).toMatchObject({ type: 'ID', nullable: false })
    expect(propertyOutput?.children()[1]?.children()[0]?.value()).toMatchObject({ type: 'string', nullable: false })
  })

  it('union of scalars', () => {
    const graphApi = buildGraphApi(`
      type Query {
        getRootEntity: Root!
      }

      type Root {
        test: Primitive!
      }

      union Primitive = ID | String | Int | Float | Boolean
    `)
    const tree = createGraphApiTreeForTests(graphApi)
    const propertyOutput = tree.root!
      .children()[0] // query
      ?.children()?.find(node => node.kind === 'output')
      ?.children()[0] // test
      ?.children()?.find(node => node.kind === 'output')
    expect(propertyOutput?.nested[0]?.value()).toMatchObject({ type: 'ID' })
    expect(propertyOutput?.nested[1]?.value()).toMatchObject({ type: 'string' })
    expect(propertyOutput?.nested[2]?.value()).toMatchObject({ type: 'integer' })
    expect(propertyOutput?.nested[3]?.value()).toMatchObject({ type: 'float' })
    expect(propertyOutput?.nested[4]?.value()).toMatchObject({ type: 'boolean' })
  })

  it('union of objects', () => {
    const graphApi = buildGraphApi(`
      type Query {
        getRootEntity: Root!
      }

      type Root {
        test: Objective!
      }

      union Objective = Type1 | Type2

      type Type1 {
        key: ID!
        value: String!
      }

      type Type2 {
        id: ID!
        data: String!
      }
    `)
    const tree = createGraphApiTreeForTests(graphApi)
    const propertyOutput = tree.root!
      .children()[0] // query
      ?.children()?.find(node => node.kind === 'output')
      ?.children()[0] // test
      ?.children()?.find(node => node.kind === 'output')
    // TODO 21.11.24 // To have this behavior reconsider API of method "value()" for combiners
    // expect(propertyOutput?.value()).toMatchObject({ title: 'Objective', type: 'union', nullable: false })
    expect(propertyOutput?.nested[0]?.value()).toMatchObject({ title: 'Type1', type: 'object' })
    expect(propertyOutput?.nested[0]?.children()[0]?.children()[0]?.value()).toMatchObject({ type: 'ID', nullable: false })
    expect(propertyOutput?.nested[0]?.children()[1]?.children()[0]?.value()).toMatchObject({ type: 'string', nullable: false })
    expect(propertyOutput?.nested[1]?.value()).toMatchObject({ title: 'Type2', type: 'object' })
    expect(propertyOutput?.nested[1]?.children()[0]?.children()[0]?.value()).toMatchObject({ type: 'ID', nullable: false })
    expect(propertyOutput?.nested[1]?.children()[1]?.children()[0]?.value()).toMatchObject({ type: 'string', nullable: false })
  })
})