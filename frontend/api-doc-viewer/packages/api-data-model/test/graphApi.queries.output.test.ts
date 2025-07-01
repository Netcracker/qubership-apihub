import { buildGraphApi, createGraphApiTreeForTests } from "./helpers/graphql"

describe('graphapi tree. queries output', () => {
  const jestConsole = console
  beforeEach(() => {
    global.console = require('console')
  })
  afterEach(() => {
    global.console = jestConsole
  })

  it('no args, scalar output', () => {
    const graphql = `
      type Query {
        test: ID!
      }
    `
    const graphApi = buildGraphApi(graphql)
    const tree = createGraphApiTreeForTests(graphApi)
    const root = tree.root

    expect(root).not.toBeNull()
    const queries = root?.children()?.filter(child => child.kind === 'query')
    expect(queries?.length).toBe(1)
    const queryTest = queries![0]
    expect(queryTest.id).toBe('#/queries/test')
    const queryTestChildren = queryTest.children()
    expect(queryTestChildren.length).toBe(1)
    const queryTestOutput = queryTestChildren[0]
    expect(queryTestOutput.id).toBe('#/queries/test/output')
    expect(queryTestOutput.value()).toMatchObject({ type: 'ID' })
  })

  it('no args, union output', () => {
    const graphql = `
      type Query {
        test: CustomID!
      }
      union CustomID = String | Int
    `
    const graphApi = buildGraphApi(graphql)
    const tree = createGraphApiTreeForTests(graphApi)
    const root = tree.root

    expect(root).not.toBeNull()
    const queries = root?.children()?.filter(child => child.kind === 'query')
    expect(queries?.length).toBe(1)
    const queryTest = queries![0]
    const pathQuery = '#/queries/test'
    expect(queryTest.id).toBe(pathQuery)
    const queryTestChildren = queryTest.children()
    expect(queryTestChildren.length).toBe(1)
    const queryTestOutput = queryTestChildren[0]
    const pathOutput = `${pathQuery}/output`
    expect(queryTestOutput.id).toBe(pathOutput)
    const pathOneOfItem = `${pathOutput}/typeDef/type/oneOf`
    expect(queryTestOutput.value(`${pathOneOfItem}/0`)).toMatchObject({ type: 'string' })
    expect(queryTestOutput.value(`${pathOneOfItem}/1`)).toMatchObject({ type: 'integer' })
    const unionItems = queryTestOutput.nested
    expect(unionItems.length).toBe(2)
    expect(unionItems[0].id).toBe(`${pathOneOfItem}/0`)
    expect(unionItems[0].value()).toMatchObject({ type: 'string' })
    expect(unionItems[1].id).toBe(`${pathOneOfItem}/1`)
    expect(unionItems[1].value()).toMatchObject({ type: 'integer' })
  })

  it('no args, enum output with deprecated directive (default reason)', () => {
    const graphql = `
      type Query {
        fruit: Fruit!
      }
      enum Fruit {
        Apple
        "Orange round sour-sweet fruit"
        Orange
        Banana @deprecated
      }
    `
    const graphApi = buildGraphApi(graphql)
    const tree = createGraphApiTreeForTests(graphApi)
    const root = tree.root

    expect(root).not.toBeNull()
    const queries = root?.children()?.filter(child => child.kind === 'query')
    expect(queries?.length).toBe(1)
    const queryFruit = queries![0]
    const queryFruitPath = '#/queries/fruit'
    expect(queryFruit.id).toBe(queryFruitPath)
    const queryFruitChildren = queryFruit.children()
    expect(queryFruitChildren.length).toBe(1)
    const queryFruitOutput = queryFruitChildren[0]
    expect(queryFruitOutput.id).toBe(`${queryFruitPath}/output`)
    expect(queryFruitOutput.value()).toMatchObject({
      type: 'enum',
      values: {
        Apple: {},
        Orange: {
          description: 'Orange round sour-sweet fruit',
        },
        Banana: {
          deprecationReason: 'No longer supported',
        }
      }
    })
  })

  it('no args, enum output with deprecated directive (custom reason)', () => {
    const graphql = `
      type Query {
        fruit: Fruit!
      }

      enum Fruit {
        Apple
        "Orange round sour-sweet fruit"
        Orange
        Banana @deprecated(reason: "Because why")
      }
    `
    const graphApi = buildGraphApi(graphql)
    const tree = createGraphApiTreeForTests(graphApi)
    const root = tree.root

    expect(root).not.toBeNull()
    const queries = root?.children()?.filter(child => child.kind === 'query')
    expect(queries?.length).toBe(1)
    const queryFruit = queries![0]
    const queryFruitPath = '#/queries/fruit'
    expect(queryFruit.id).toBe(queryFruitPath)
    const queryFruitChildren = queryFruit.children()
    expect(queryFruitChildren.length).toBe(1)
    const queryFruitOutput = queryFruitChildren[0]
    expect(queryFruitOutput.id).toBe(`${queryFruitPath}/output`)
    expect(queryFruitOutput.value()).toMatchObject({
      type: 'enum',
      values: {
        Apple: {},
        Orange: {
          description: 'Orange round sour-sweet fruit',
        },
        Banana: {
          deprecationReason: 'Because why',
        }
      }
    })
  })

  it('no args, enum output with deprecated directive (custom reason) and custom directive with provided value', () => {
    const graphql = `
      "Provide true in argument value when it is an exotic fruit. By default value = false"
      directive @exotic(value: Boolean = false) on ENUM_VALUE

      type Query {
        fruit: Fruit!
      }

      enum Fruit {
        Apple
        "Orange round sour-sweet fruit"
        Orange
        Banana @deprecated(reason: "Because why") @exotic(value: true)
      }
    `
    const graphApi = buildGraphApi(graphql)
    const tree = createGraphApiTreeForTests(graphApi)
    const root = tree.root

    expect(root).not.toBeNull()
    const queries = root?.children()?.filter(child => child.kind === 'query')
    expect(queries?.length).toBe(1)
    const queryFruit = queries![0]
    const queryFruitPath = '#/queries/fruit'
    expect(queryFruit.id).toBe(queryFruitPath)
    const queryFruitChildren = queryFruit.children()
    expect(queryFruitChildren.length).toBe(1)
    const queryFruitOutput = queryFruitChildren[0]
    expect(queryFruitOutput.id).toBe(`${queryFruitPath}/output`)
    expect(queryFruitOutput.value()).toMatchObject({
      type: 'enum',
      values: {
        Apple: {},
        Orange: {
          description: 'Orange round sour-sweet fruit',
        },
        Banana: {
          deprecationReason: 'Because why',
          directives: {
            exotic: {
              definition: {
                title: 'exotic',
                locations: ['ENUM_VALUE'],
                description: 'Provide true in argument value when it is an exotic fruit. By default value = false',
              },
              meta: {
                value: true
              }
            }
          }
        }
      }
    })
  })

  it('no args, object output', () => {
    const graphql = `
      type Query {
        test: Object!
      }

      type Object {
        id: ID!
        name: String
      }
    `
    const graphApi = buildGraphApi(graphql)
    const tree = createGraphApiTreeForTests(graphApi)
    const root = tree.root

    expect(root).not.toBeNull()
    const queries = root?.children()?.filter(child => child.kind === 'query')
    expect(queries?.length).toBe(1)
    const queryTest = queries![0]
    const pathQuery = '#/queries/test'
    expect(queryTest.id).toBe('#/queries/test')
    const queryTestChildren = queryTest.children()
    expect(queryTestChildren.length).toBe(1)
    const queryTestOutput = queryTestChildren[0]
    const pathOutput = `${pathQuery}/output`
    expect(queryTestOutput.id).toBe(pathOutput)
    expect(queryTestOutput.value()).toMatchObject({ type: 'object', nullable: false })
    const outputTypeChildren = queryTestOutput.children()
    expect(outputTypeChildren.length).toBe(2)
    const pathMethods = `${pathOutput}/typeDef/type/methods`
    expect(outputTypeChildren[0].id).toBe(`${pathMethods}/id`)
    expect(outputTypeChildren[0].children()[0]?.id).toBe(`${pathMethods}/id/output`)
    expect(outputTypeChildren[0].children()[0]?.value()).toMatchObject({ type: 'ID', nullable: false })
    expect(outputTypeChildren[1].id).toBe(`${pathMethods}/name`)
    expect(outputTypeChildren[1].children()[0]?.id).toBe(`${pathMethods}/name/output`)
    expect(outputTypeChildren[1].children()[0]?.value()).toMatchObject({ type: 'string' })
  })

  it('no args, array of scalars in output', () => {
    const graphql = `
      type Query {
        test: [String]!
      }
    `
    const graphApi = buildGraphApi(graphql)
    const tree = createGraphApiTreeForTests(graphApi)
    const queryOutput = tree.root!
      .children().find(child => child.kind === 'query')
      ?.children().find(child => child.kind === 'output')
    expect(queryOutput?.value()).toMatchObject({ type: 'list', nullable: false })
    const outputItems = queryOutput?.children().find(node => node.kind === 'items')
    expect(outputItems?.value()).toMatchObject({ type: 'string' })
  })

  it('no args, array of scalars in output', () => {
    const graphql = `
      type Query {
        fruit: [Fruit!]!
      }

      type Fruit {
        title: String!
        flavour: String
        shape: String
      }
    `
    const graphApi = buildGraphApi(graphql)
    const tree = createGraphApiTreeForTests(graphApi)
    const queryOutput = tree.root!
      .children().find(child => child.kind === 'query')
      ?.children().find(child => child.kind === 'output')
    expect(queryOutput?.value()).toMatchObject({ type: 'list' })
    const outputItems = queryOutput?.children().find(node => node.kind === 'items')
    expect(outputItems?.value()).toMatchObject({ type: 'object', nullable: false })
    const props = outputItems?.children()
    expect(props?.length).toBe(3)
    expect(props?.[0]?.key).toBe('title')
    expect(props?.[0]?.children()[0]?.value()).toMatchObject({ type: 'string', nullable: false })
    expect(props?.[1]?.key).toBe('flavour')
    expect(props?.[1]?.children()[0]?.value()).toMatchObject({ type: 'string' })
    expect(props?.[2]?.key).toBe('shape')
    expect(props?.[2]?.children()[0]?.value()).toMatchObject({ type: 'string' })
  })

  it('1 arg, scalar output', () => {
    const graphql = `
      type Query {
        test(seed: Float = 0): ID!
      }
    `
    const graphApi = buildGraphApi(graphql)
    const tree = createGraphApiTreeForTests(graphApi)
    const root = tree.root

    expect(root).not.toBeNull()
    const queries = root?.children()?.filter(child => child.kind === 'query')
    expect(queries?.length).toBe(1)
    const queryTest = queries![0]
    const pathQuery = '#/queries/test'
    expect(queryTest.id).toBe(pathQuery)
    const queryTestChildren = queryTest.children()
    expect(queryTestChildren.length).toBe(2)
    const queryTestArgs = queryTestChildren[0]
    const pathArgs = `${pathQuery}/args`
    expect(queryTestArgs.id).toBe(pathArgs)
    expect(queryTestArgs.children().length).toBe(1)
    expect(queryTestArgs.children()[0]?.id).toBe(`${pathArgs}/seed`)
    expect(queryTestArgs.children()[0]?.value()).toMatchObject({ type: 'float', default: 0 })
    const queryTestOutput = queryTestChildren[1]
    expect(queryTestOutput.id).toBe(`${pathQuery}/output`)
    expect(queryTestOutput.value()).toMatchObject({ type: 'ID', nullable: false })
  })

  it('1 arg, object output', () => {
    const graphql = `
      type Query {
        test(id: ID!): Object!
      }

      type Object {
        id: ID!
        name: String
      }
    `
    const graphApi = buildGraphApi(graphql)
    const tree = createGraphApiTreeForTests(graphApi)
    const root = tree.root

    expect(root).not.toBeNull()
    const queries = root?.children()?.filter(child => child.kind === 'query')
    expect(queries?.length).toBe(1)
    const queryTest = queries![0]
    const pathQuery = '#/queries/test'
    expect(queryTest.id).toBe(pathQuery)
    const queryTestChildren = queryTest.children()
    expect(queryTestChildren.length).toBe(2)
    const queryTestArgs = queryTestChildren[0]
    const pathArgs = `${pathQuery}/args`
    expect(queryTestArgs.id).toBe(pathArgs)
    expect(queryTestArgs.children().length).toBe(1)
    expect(queryTestArgs.children()[0]?.id).toBe(`${pathArgs}/id`)
    expect(queryTestArgs.children()[0]?.value()).toMatchObject({ type: 'ID' })
    const queryTestOutput = queryTestChildren[1]
    const pathOutput = `${pathQuery}/output`
    expect(queryTestOutput.id).toBe(pathOutput)
    expect(queryTestOutput.value()).toMatchObject({ type: 'object' })
    const outputTypeChildren = queryTestOutput.children()
    expect(outputTypeChildren.length).toBe(2)
    const pathOutputMethods = `${pathOutput}/typeDef/type/methods`
    expect(outputTypeChildren[0].id).toBe(`${pathOutputMethods}/id`)
    expect(outputTypeChildren[0].children()[0]?.id).toBe(`${pathOutputMethods}/id/output`)
    expect(outputTypeChildren[0].children()[0]?.value()).toMatchObject({ type: 'ID', nullable: false })
    expect(outputTypeChildren[1].id).toBe(`${pathOutputMethods}/name`)
    expect(outputTypeChildren[1].children()[0]?.id).toBe(`${pathOutputMethods}/name/output`)
    expect(outputTypeChildren[1].children()[0]?.value()).toMatchObject({ type: 'string' })
  })

  it('1 arg, object output with deprecated directive (default reason)', () => {
    const graphql = `
      type Query {
        test(id: ID!): Object!
      }

      type Object {
        id: ID!
        name: String
        hash: Int! @deprecated
      }
    `
    const graphApi = buildGraphApi(graphql)
    const tree = createGraphApiTreeForTests(graphApi)
    const root = tree.root

    expect(root).not.toBeNull()
    const queries = root?.children()?.filter(child => child.kind === 'query')
    expect(queries?.length).toBe(1)
    const queryTest = queries![0]
    const pathQuery = '#/queries/test'
    expect(queryTest.id).toBe(pathQuery)
    const queryTestChildren = queryTest.children()
    expect(queryTestChildren.length).toBe(2)
    const queryTestArgs = queryTestChildren.find(child => child.kind === 'args')!
    const pathArgs = `${pathQuery}/args`
    expect(queryTestArgs.id).toBe(pathArgs)
    expect(queryTestArgs.children().length).toBe(1)
    expect(queryTestArgs.children()[0]?.id).toBe(`${pathArgs}/id`)
    expect(queryTestArgs.children()[0]?.value()).toMatchObject({ type: 'ID', nullable: false })
    const queryTestOutput = queryTestChildren[1]
    const pathOutput = `${pathQuery}/output`
    expect(queryTestOutput.id).toBe(pathOutput)
    expect(queryTestOutput.value()).toMatchObject({ type: 'object' })
    const outputTypeChildren = queryTestOutput.children()
    expect(outputTypeChildren.length).toBe(3)
    const pathOutputMethods = `${pathOutput}/typeDef/type/methods`
    expect(outputTypeChildren[0].id).toBe(`${pathOutputMethods}/id`)
    expect(outputTypeChildren[0].children().find(child => child.kind === 'output')?.id)
      .toBe(`${pathOutputMethods}/id/output`)
    expect(outputTypeChildren[0].children().find(child => child.kind === 'output')?.value())
      .toMatchObject({ type: 'ID', nullable: false })
    expect(outputTypeChildren[1].id).toBe(`${pathOutputMethods}/name`)
    expect(outputTypeChildren[1].children().find(child => child.kind === 'output')?.id)
      .toBe(`${pathOutputMethods}/name/output`)
    expect(outputTypeChildren[1].children().find(child => child.kind === 'output')?.value())
      .toMatchObject({ type: 'string' })
    expect(outputTypeChildren[2].id).toBe(`${pathOutputMethods}/hash`)
    expect(outputTypeChildren[2].meta).toMatchObject({ deprecationReason: 'No longer supported' })
    expect(outputTypeChildren[2].meta?.directives).toEqual({})
    expect(outputTypeChildren[2].children().find(child => child.kind === 'output')?.id)
      .toBe(`${pathOutputMethods}/hash/output`)
    expect(outputTypeChildren[2].children().find(child => child.kind === 'output')?.value())
      .toMatchObject({ type: 'integer', nullable: false })
  })

  it('1 arg, object output with deprecated directive (custom reason)', () => {
    const graphql = `
      type Query {
        test(id: ID!): Object!
      }

      type Object {
        id: ID!
        name: String
        hash: Int! @deprecated(reason: "Because why")
      }
    `
    const graphApi = buildGraphApi(graphql)
    const tree = createGraphApiTreeForTests(graphApi)
    const root = tree.root

    expect(root).not.toBeNull()
    const queries = root?.children()?.filter(child => child.kind === 'query')
    expect(queries?.length).toBe(1)
    const queryTest = queries![0]
    const pathQuery = '#/queries/test'
    expect(queryTest.id).toBe(pathQuery)
    const queryTestChildren = queryTest.children()
    expect(queryTestChildren.length).toBe(2)
    const queryTestArgs = queryTestChildren[0]
    const pathArgs = `${pathQuery}/args`
    expect(queryTestArgs.id).toBe(pathArgs)
    expect(queryTestArgs.children().length).toBe(1)
    expect(queryTestArgs.children()[0]?.id).toBe(`${pathArgs}/id`)
    expect(queryTestArgs.children()[0]?.value()).toMatchObject({ type: 'ID', nullable: false })
    const queryTestOutput = queryTestChildren[1]
    const pathOutput = `${pathQuery}/output`
    expect(queryTestOutput.id).toBe(pathOutput)
    expect(queryTestOutput.value()).toMatchObject({ type: 'object', nullable: false })
    const outputTypeChildren = queryTestOutput.children()
    expect(outputTypeChildren.length).toBe(3)
    const pathOutputMethods = `${pathOutput}/typeDef/type/methods`
    expect(outputTypeChildren[0].id).toBe(`${pathOutputMethods}/id`)
    expect(outputTypeChildren[0].children().find(child => child.kind === 'output')?.id)
      .toBe(`${pathOutputMethods}/id/output`)
    expect(outputTypeChildren[0].children().find(child => child.kind === 'output')?.value())
      .toMatchObject({ type: 'ID', nullable: false })
    expect(outputTypeChildren[1].id).toBe(`${pathOutputMethods}/name`)
    expect(outputTypeChildren[1].children().find(child => child.kind === 'output')?.id)
      .toBe(`${pathOutputMethods}/name/output`)
    expect(outputTypeChildren[1].children().find(child => child.kind === 'output')?.value())
      .toMatchObject({ type: 'string' })
    expect(outputTypeChildren[2].id).toBe(`${pathOutputMethods}/hash`)
    expect(outputTypeChildren[2].meta).toMatchObject({ deprecationReason: 'Because why' })
    expect(outputTypeChildren[2].meta?.directives).toEqual({})
    expect(outputTypeChildren[2].children().find(child => child.kind === 'output')?.id)
      .toBe(`${pathOutputMethods}/hash/output`)
    expect(outputTypeChildren[2].children().find(child => child.kind === 'output')?.value())
      .toMatchObject({ type: 'integer', nullable: false })
  })

  it('1 arg, object output with deprecated directive (custom reason) and custom directive with provided value', () => {
    const graphql = `
      directive @algorithm(name: String!) on FIELD_DEFINITION

      type Query {
        test(id: ID!): Object!
      }

      type Object {
        id: ID!
        name: String
        hash: Int! @deprecated(reason: "Because why") @algorithm(name: "MD5")
      }
    `
    const graphApi = buildGraphApi(graphql)
    const tree = createGraphApiTreeForTests(graphApi)
    const root = tree.root

    expect(root).not.toBeNull()
    const queries = root?.children()?.filter(child => child.kind === 'query')
    expect(queries?.length).toBe(1)
    const queryTest = queries![0]
    const pathQuery = '#/queries/test'
    expect(queryTest.id).toBe(pathQuery)
    const queryTestChildren = queryTest.children()
    expect(queryTestChildren.length).toBe(2)
    const queryTestArgs = queryTestChildren[0]
    const pathArgs = `${pathQuery}/args`
    const pathOutput = `${pathQuery}/output`
    const pathOutputMethods = `${pathOutput}/typeDef/type/methods`
    expect(queryTestArgs.id).toBe(pathArgs)
    expect(queryTestArgs.children().length).toBe(1)
    expect(queryTestArgs.children()[0]?.id).toBe(`${pathArgs}/id`)
    expect(queryTestArgs.children()[0]?.value()).toMatchObject({ type: 'ID', nullable: false })
    const queryTestOutput = queryTestChildren[1]
    expect(queryTestOutput.id).toBe(pathOutput)
    expect(queryTestOutput.value()).toMatchObject({ type: 'object', nullable: false })
    const outputTypeChildren = queryTestOutput.children()
    expect(outputTypeChildren.length).toBe(3)
    expect(outputTypeChildren[0].id).toBe(`${pathOutputMethods}/id`)
    expect(outputTypeChildren[0].children()[0]?.id).toBe(`${pathOutputMethods}/id/output`)
    expect(outputTypeChildren[0].children()[0]?.value()).toMatchObject({ type: 'ID', nullable: false })
    expect(outputTypeChildren[1].id).toBe(`${pathOutputMethods}/name`)
    expect(outputTypeChildren[1].children()[0]?.id).toBe(`${pathOutputMethods}/name/output`)
    expect(outputTypeChildren[1].children()[0]?.value()).toMatchObject({ type: 'string' })
    expect(outputTypeChildren[2].id).toBe(`${pathOutputMethods}/hash`)
    expect(outputTypeChildren[2].meta).toMatchObject({
      deprecationReason: 'Because why',
      directives: {
        algorithm: {
          definition: {
            title: 'algorithm',
            locations: ['FIELD_DEFINITION'],
            args: {
              name: {
                typeDef: { type: { kind: 'string' } },
                nullable: false
              }
            }
          },
          meta: {
            name: 'MD5'
          }
        }
      }
    })
    expect(outputTypeChildren[2].meta?.directives?.deprecated).toBeUndefined()
    expect(outputTypeChildren[2].children().find(child => child.kind === 'output')?.id).toBe(`${pathOutputMethods}/hash/output`)
    expect(outputTypeChildren[2].children().find(child => child.kind === 'output')?.value()).toMatchObject({ type: 'integer', nullable: false })
  })
})