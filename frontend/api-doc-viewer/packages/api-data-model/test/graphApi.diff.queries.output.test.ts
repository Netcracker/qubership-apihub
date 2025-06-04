import { annotation, breaking, deprecated, DiffAction, nonBreaking, unclassified } from "@netcracker/qubership-apihub-api-diff"
import { DiffNodeValue } from "../src/abstract/diff"
import { IGraphSchemaEnumType, isGraphSchemaNodeEnumValue } from "../src/graph-api"
import { createGraphApiDiffTreeForTests, graphapi, metaKey } from "./helpers/graphql"

function fail(message?: string): never {
  throw new Error(message)
}

describe('output', () => {
  it('type changed: scalar -> enum', () => {
    const before = graphapi`
      type Query {
        fruit: String!
      }
    `
    const after = graphapi`
      type Query {
        fruit: Fruit!
      }

      enum Fruit {
        Pineapple
        "Orange sour-sweet fruit"
        Orange
        Banana @deprecated(reason: "Because why")
      }
    `

    const tree = createGraphApiDiffTreeForTests(before, after, metaKey)
    const root = tree.root
    const output = root!
      .children().find(child => child.kind === 'query')!
      .children().find(child => child.kind === 'output')

    const outputValue = output!.value()

    expect(outputValue).toHaveProperty('type', 'enum')
    expect(outputValue).toHaveProperty('title', 'Fruit')
    expect(outputValue).toHaveProperty('nullable', false)
    expect(outputValue).toHaveProperty('values', expect.objectContaining({
      Pineapple: {},
      Orange: {
        description: 'Orange sour-sweet fruit',
      },
      Banana: {
        deprecationReason: 'Because why',
        directives: {},
      }
    }))

    expect(outputValue!.$changes).toHaveProperty(['type'], expect.objectContaining({
      type: breaking,
      action: DiffAction.replace,
      beforeValue: 'string',
      afterValue: 'enum',
    }))

    expect(outputValue!.$changes).toHaveProperty(['values'], {
      Pineapple: expect.objectContaining({
        type: breaking,
        action: DiffAction.add,
      }),
      Orange: expect.objectContaining({
        type: breaking,
        action: DiffAction.add,
      }),
      Banana: expect.objectContaining({
        type: breaking,
        action: DiffAction.add,
      }),
    })
  })

  it('type changed: enum -> scalar', () => {
    const before = graphapi`
      type Query {
        fruit: Fruit!
      }

      enum Fruit {
        Pineapple
        "Orange sour-sweet fruit"
        Orange
        Banana @deprecated(reason: "Because why")
      }
    `
    const after = graphapi`
      type Query {
        fruit: String!
      }
    `

    const tree = createGraphApiDiffTreeForTests(before, after, metaKey)
    const root = tree.root
    const output = root!
      .children().find(child => child.kind === 'query')!
      .children().find(child => child.kind === 'output')

    const outputValue = output!.value()

    expect(outputValue).toHaveProperty('nullable', false)
    expect(outputValue).toHaveProperty('title', 'Fruit')
    expect(outputValue).toHaveProperty('values', {
      Pineapple: expect.objectContaining({}),
      Orange: expect.objectContaining({
        description: 'Orange sour-sweet fruit',
      }),
      Banana: expect.objectContaining({
        deprecationReason: 'Because why',
      })
    })

    expect((outputValue as DiffNodeValue)!.$changes).toHaveProperty(['values'], {
      Pineapple: expect.objectContaining({
        type: breaking,
        action: DiffAction.remove,
      }),
      Orange: expect.objectContaining({
        type: breaking,
        action: DiffAction.remove,
      }),
      Banana: expect.objectContaining({
        type: breaking,
        action: DiffAction.remove,
      }),
    })
  })

  it('type changed: scalar -> object', () => {
    const before = graphapi`
      type Query {
        fruit: String!
      }
    `
    const after = graphapi`
      type Query {
        fruit: Fruit!
      }

      type Fruit {
        title: String!
        flavour: String!
        shape: String!
        isExotic: Boolean
      }
    `

    const tree = createGraphApiDiffTreeForTests(before, after, metaKey)

    const output = tree.root!
      .children().find(child => child.kind === 'query')!
      .children().find(child => child.kind === 'output')

    const pathProperty = `#/queries/fruit/output/typeDef/type/methods`
    const expectedDiff = (outputType: string, nullable: boolean = true) => ({
      type: breaking,
      action: DiffAction.add,
      afterValue: {
        output: {
          typeDef: {
            type: { kind: outputType }
          },
          ...!nullable ? { nullable: false } : {}
        }
      }
    })
    expect(output!.meta.$childrenChanges).toMatchObject({
      [`${pathProperty}/title`]: expectedDiff('string', false),
      [`${pathProperty}/flavour`]: expectedDiff('string', false),
      [`${pathProperty}/shape`]: expectedDiff('string', false),
      [`${pathProperty}/isExotic`]: expectedDiff('boolean'),
    })
    const value = output?.value()
    expect(value).toHaveProperty('type', 'object')
    expect(value).toHaveProperty('title', 'Fruit')
    expect(value?.$changes).toMatchObject({
      type: {
        type: breaking,
        action: DiffAction.replace,
        beforeValue: 'string',
        afterValue: 'object'
      }
    })
  })

  it('type changed: scalar -> array', () => {
    const before = graphapi`
      type Query {
        test: Response!
      }
      scalar Response
    `
    const after = graphapi`
      type Query {
        test: [String!]!
      }
    `
    const tree = createGraphApiDiffTreeForTests(before, after, metaKey)
    const output = tree.root!
      .children().find(child => child.kind === 'query')!
      .children().find(child => child.kind === 'output')!
    expect(output.value()).toMatchObject({
      title: 'Response',
      type: 'list',
      nullable: false,
    })
    expect(output.value()!.$changes).toMatchObject({
      title: { action: DiffAction.remove, beforeValue: 'Response' },
      type: { action: DiffAction.replace, beforeValue: 'scalar', afterValue: 'list' },
    })
    expect(output.children()[0]?.value()).toMatchObject({
      type: 'string',
      nullable: false,
    })
  })

  it('type changed: object -> array', () => {
    const before = graphapi`
      type Query {
        test: Response!
      }
      type Response {
        id: ID!
        name: String
      }
    `
    const after = graphapi`
      type Query {
        test: [String!]!
      }
    `
    const tree = createGraphApiDiffTreeForTests(before, after, metaKey)
    const output = tree.root!
      .children().find(child => child.kind === 'query')!
      .children().find(child => child.kind === 'output')!
    expect(output.value()).toMatchObject({
      title: 'Response',
      type: 'list',
      nullable: false,
    })
    expect(output.value()!.$changes).toMatchObject({
      title: { type: unclassified, action: DiffAction.remove },
      type: { type: breaking, action: DiffAction.replace, beforeValue: 'object', afterValue: 'list' }
    })
    const outputChildren = output.children()
    expect(outputChildren.length).toBe(3)
    const methods = outputChildren.filter(child => child.kind === 'method')
    const [methodId, methodName] = methods
    const items = outputChildren.find(child => child.kind === 'items')
    expect(methodId?.meta).toMatchObject({
      $nodeChange: { type: breaking, action: DiffAction.remove }
    })
    expect(methodName?.meta).toMatchObject({
      $nodeChange: { type: breaking, action: DiffAction.remove }
    })
    expect(items?.meta).toMatchObject({
      $nodeChange: { type: breaking, action: DiffAction.add }
    })
  })

  it('type changed: interface -> array', () => {
    const before = graphapi`
      type Query {
        test: Response!
      }
      interface Response {
        id: ID!
        name: String
      }
    `
    const after = graphapi`
      type Query {
        test: [String!]!
      }
    `
    const tree = createGraphApiDiffTreeForTests(before, after, metaKey)
    const output = tree.root!
      .children().find(child => child.kind === 'query')!
      .children().find(child => child.kind === 'output')!
    expect(output.value()).toMatchObject({
      title: 'Response',
      type: 'list',
      nullable: false,
    })
    expect(output.value()!.$changes).toMatchObject({
      title: { type: unclassified, action: DiffAction.remove },
      type: { type: breaking, action: DiffAction.replace, beforeValue: 'interface', afterValue: 'list' }
    })
    const outputChildren = output.children()
    expect(outputChildren.length).toBe(3)
    const methods = outputChildren.filter(child => child.kind === 'method')
    const [methodId, methodName] = methods
    const items = outputChildren.find(child => child.kind === 'items')
    expect(methodId?.meta).toMatchObject({
      $nodeChange: { type: breaking, action: DiffAction.remove }
    })
    expect(methodName?.meta).toMatchObject({
      $nodeChange: { type: breaking, action: DiffAction.remove }
    })
    expect(items?.meta).toMatchObject({
      $nodeChange: { type: breaking, action: DiffAction.add }
    })
  })

  it('type changed: input object -> array', () => {
    const before = graphapi`
      type Query {
        test: Response!
      }
      input Response {
        id: ID!
        name: String
      }
    `
    const after = graphapi`
      type Query {
        test: [String!]!
      }
    `
    const tree = createGraphApiDiffTreeForTests(before, after, metaKey)
    const output = tree.root!
      .children().find(child => child.kind === 'query')!
      .children().find(child => child.kind === 'output')!
    expect(output.value()).toMatchObject({
      title: 'Response',
      type: 'list',
      nullable: false,
    })
    expect(output.value()!.$changes).toMatchObject({
      title: { type: unclassified, action: DiffAction.remove },
      type: { type: breaking, action: DiffAction.replace, beforeValue: 'input', afterValue: 'list' }
    })
    const outputChildren = output.children()
    expect(outputChildren.length).toBe(3)
    const props = outputChildren.filter(child => child.kind === 'property')
    const [propId, propName] = props
    const items = outputChildren.find(child => child.kind === 'items')
    expect(propId?.meta).toMatchObject({
      $nodeChange: { type: breaking, action: DiffAction.remove }
    })
    expect(propName?.meta).toMatchObject({
      $nodeChange: { type: breaking, action: DiffAction.remove }
    })
    expect(items?.meta).toMatchObject({
      $nodeChange: { type: breaking, action: DiffAction.add }
    })
  })

  it('type changed: object -> input', () => {
    const before = graphapi`
      type Query {
        test: Response!
      }
      type Response {
        id: ID!
        name: String
      }
    `
    const after = graphapi`
      type Query {
        test: Response!
      }
      input Response {
        id: ID!
        name: String
      }
    `
    const tree = createGraphApiDiffTreeForTests(before, after, metaKey)
    const output = tree.root!
      .children().find(child => child.kind === 'query')!
      .children().find(child => child.kind === 'output')!
    expect(output.value()).toMatchObject({
      title: 'Response',
      type: 'input',
      nullable: false,
    })
    expect(output.value()!.$changes).toMatchObject({
      type: { type: breaking, action: DiffAction.replace, beforeValue: 'object', afterValue: 'input' }
    })
    const outputChildren = output.children()
    expect(outputChildren.length).toBe(4)
    const methods = outputChildren.filter(child => child.kind === 'method')
    const props = outputChildren.filter(child => child.kind === 'property')
    expect(methods[0]?.meta).toMatchObject({
      $nodeChange: { type: breaking, action: DiffAction.remove }
    })
    expect(methods[1]?.meta).toMatchObject({
      $nodeChange: { type: breaking, action: DiffAction.remove }
    })
    expect(props[0]?.meta).toMatchObject({
      $nodeChange: { type: breaking, action: DiffAction.add }
    })
    expect(props[1]?.meta).toMatchObject({
      $nodeChange: { type: breaking, action: DiffAction.add }
    })
  })

  it('type changed: object -> interface', () => {
    const before = graphapi`
      type Query {
        test: Response!
      }
      type Response {
        id: ID!
        name: String
      }
    `
    const after = graphapi`
      type Query {
        test: Response!
      }
      interface Response {
        id: ID!
        name: String
      }
    `
    const tree = createGraphApiDiffTreeForTests(before, after, metaKey)
    const output = tree.root!
      .children().find(child => child.kind === 'query')!
      .children().find(child => child.kind === 'output')!
    expect(output.value()).toMatchObject({
      title: 'Response',
      type: 'interface',
      nullable: false,
    })
    expect(output.value()!.$changes).toMatchObject({
      type: { type: breaking, action: DiffAction.replace, beforeValue: 'object', afterValue: 'interface' }
    })
    const outputChildren = output.children()
    expect(outputChildren.length).toBe(4)
    const methods = outputChildren.filter(child => child.kind === 'method')
    const addedMethods: string[] = []
    const removedMethods: string[] = []
    for (const method of methods) {
      if (method.meta.$nodeChange?.action === DiffAction.add) {
        addedMethods.push(method.id)
      }
      if (method.meta.$nodeChange?.action === DiffAction.remove) {
        removedMethods.push(method.id)
      }
    }
    expect(addedMethods.length).toBe(2)
    expect(removedMethods.length).toBe(2)
    expect(addedMethods).not.toEqual(expect.arrayContaining(removedMethods))
  })

  it('enum values changed', () => {
    const before = graphapi`
      type Query {
        fruit: Fruit!
      }

      enum Fruit {
        Apple
        Orange @deprecated
        Banana
      }
    `
    const after = graphapi`
      type Query {
        fruit: Fruit!
      }

      enum Fruit {
        Pineapple
        "Orange sour-sweet fruit"
        Orange
        Banana @deprecated(reason: "Because why")
      }
    `

    const tree = createGraphApiDiffTreeForTests(before, after, metaKey)

    const output = tree.root!
      .children().find(child => child.kind === 'query')!
      .children().find(child => child.kind === 'output')!

    const outputNodeValue = output.value()

    if (!isGraphSchemaNodeEnumValue(outputNodeValue)) { fail() }

    expect(outputNodeValue?.nullable).toBe(false)
    expect(outputNodeValue?.values).toMatchObject({
      Apple: {},
      Pineapple: {},
      Orange: {
        description: 'Orange sour-sweet fruit',
        deprecationReason: 'No longer supported',
        directives: {}
      },
      Banana: {
        deprecationReason: 'Because why',
        directives: {}
      }
    })
    expect(outputNodeValue?.$changes).toMatchObject({
      values: {
        Apple: { type: nonBreaking, action: DiffAction.remove, beforeValue: {} },
        Pineapple: { type: breaking, action: DiffAction.add, afterValue: {} },
        Orange: {
          description: {
            type: annotation,
            action: DiffAction.add,
            afterValue: 'Orange sour-sweet fruit'
          },
          deprecationReason: {
            type: deprecated,
            action: DiffAction.remove,
            beforeValue: 'No longer supported'
          }
        },
        Banana: {
          deprecationReason: {
            type: deprecated,
            action: DiffAction.add,
            afterValue: 'Because why'
          }
        }
      }
    })
  })

  it('properties changed', () => {
    const before = graphapi`
      type Query {
        fruit: Fruit!
      }

      type Fruit {
        title: String!
        flavour: String!
        shape: String!
        isExotic: Boolean
      }
    `
    const after = graphapi`
      type Query {
        fruit: Fruit!
      }

      type Fruit {
        title: String!
        flavour: String!
        shape: String!
        "true - is exotic, false - regular"
        isExotic: Boolean @deprecated
      }
    `

    const tree = createGraphApiDiffTreeForTests(before, after, metaKey)
    const root = tree.root

    const pathCommon = `#/queries/fruit/output`
    const pathMethodCommon = `${pathCommon}/typeDef/type/methods`
    const outputNode = root!.children()[0]!.children()[0]
    expect(outputNode.id).toBe(pathCommon)
    expect(outputNode.children().length).toBe(4)
    expect(outputNode.children()[0].id).toBe(`${pathMethodCommon}/title`)
    expect(outputNode.children()[0].children()[0].value()).toMatchObject({ type: 'string' })
    expect(outputNode.children()[1].id).toBe(`${pathMethodCommon}/flavour`)
    expect(outputNode.children()[1].children()[0].value()).toMatchObject({ type: 'string' })
    expect(outputNode.children()[2].id).toBe(`${pathMethodCommon}/shape`)
    expect(outputNode.children()[2].children()[0].value()).toMatchObject({ type: 'string' })
    expect(outputNode.children()[3].id).toBe(`${pathMethodCommon}/isExotic`)
    expect(outputNode.children()[3].meta).toMatchObject({
      deprecationReason: 'No longer supported'
    })
    expect(outputNode.children()[3].value()).toMatchObject({
      description: 'true - is exotic, false - regular',
    })
    expect(outputNode.children()[3].meta.$metaChanges).toMatchObject({
      deprecationReason: {
        type: deprecated,
        action: DiffAction.add,
        afterValue: 'No longer supported'
      }
    })
    expect(outputNode.children()[3].value()?.$changes).toMatchObject({
      description: {
        type: annotation,
        action: DiffAction.add,
        afterValue: 'true - is exotic, false - regular'
      },
    })
    expect(outputNode.children()[3].children()[0].value()).toMatchObject({ type: 'boolean' })
  })

  it('property added', () => {
    const before = graphapi`
      type Query {
        fruit: Fruit!
      }

      type Fruit {
        title: String!
        flavour: String!
        shape: String!
      }
    `
    const after = graphapi`
      type Query {
        fruit: Fruit!
      }

      type Fruit {
        title: String!
        flavour: String!
        shape: String!
        isExotic: Boolean
      }
    `
    const tree = createGraphApiDiffTreeForTests(before, after, metaKey)
    const queryFruitOutput = tree.root!.children()[0]?.children()[0]

    const pathCommon = '#/queries/fruit/output'
    const pathMethod = `${pathCommon}/typeDef/type/methods`
    expect(queryFruitOutput?.id).toBe(pathCommon)
    const expectedDiffAddProperty = {
      type: nonBreaking,
      action: DiffAction.add,
      afterValue: {
        output: {
          typeDef: {
            type: { kind: 'boolean' }
          },
        }
      }
    }
    expect(queryFruitOutput?.meta.$childrenChanges).toMatchObject({
      [`${pathMethod}/isExotic`]: expectedDiffAddProperty
    })
    const props = queryFruitOutput?.children()
    expect(props.length).toBe(4)
    expect(props[0]?.id).toBe(`${pathMethod}/title`)
    expect(props[1]?.id).toBe(`${pathMethod}/flavour`)
    expect(props[2]?.id).toBe(`${pathMethod}/shape`)
    expect(props[3]?.id).toBe(`${pathMethod}/isExotic`)
    expect(props[3]?.meta.$nodeChange).toMatchObject(expectedDiffAddProperty)
  })

  it('property removed', () => {
    const before = graphapi`
      type Query {
        fruit: Fruit!
      }

      type Fruit {
        title: String!
        flavour: String!
        shape: String!
        isExotic: Boolean
      }
    `
    const after = graphapi`
      type Query {
        fruit: Fruit!
      }

      type Fruit {
        title: String!
        flavour: String!
        shape: String!
      }
    `
    const tree = createGraphApiDiffTreeForTests(before, after, metaKey)
    const queryFruitOutput = tree.root!.children()[0]?.children()[0]

    const pathCommon = '#/queries/fruit/output'
    const pathMethod = `${pathCommon}/typeDef/type/methods`
    expect(queryFruitOutput?.id).toBe(pathCommon)
    const expectedDiffRemoveProperty = {
      type: breaking,
      action: DiffAction.remove,
      beforeValue: {
        output: {
          typeDef: {
            type: { kind: 'boolean' }
          },
        }
      }
    }
    expect(queryFruitOutput?.meta.$childrenChanges).toMatchObject({
      [`${pathMethod}/isExotic`]: expectedDiffRemoveProperty
    })
    const props = queryFruitOutput?.children()
    expect(props.length).toBe(4)
    expect(props[0]?.id).toBe(`${pathMethod}/title`)
    expect(props[1]?.id).toBe(`${pathMethod}/flavour`)
    expect(props[2]?.id).toBe(`${pathMethod}/shape`)
    expect(props[3]?.id).toBe(`${pathMethod}/isExotic`)
    expect(props[3]?.meta.$nodeChange).toMatchObject(expectedDiffRemoveProperty)
  })

  it('union item added', () => {
    const before = graphapi`
      type Query {
        shape: Shape
      }
      union Shape = Circle | Triangle | Rectangle
      scalar Circle
      scalar Triangle
      scalar Rectangle
    `
    const after = graphapi`
      type Query {
        shape: Shape
      }
      union Shape = Circle | Triangle | Parallelogram | Rectangle
      scalar Circle
      scalar Triangle
      scalar Parallelogram
      scalar Rectangle
    `
    const tree = createGraphApiDiffTreeForTests(before, after, metaKey)

    const pathOutput = '#/queries/shape/output'
    const pathOneOfItem = `${pathOutput}/typeDef/type/oneOf`

    const output = tree.root!
      .children().find(child => child.kind === 'query')!
      .children().find(child => child.kind === 'output')!

    const expectedDiff = {
      type: breaking,
      action: DiffAction.add,
      afterValue: {
        title: 'Parallelogram',
        type: { kind: 'scalar' },
      }
    }

    expect(output.id).toBe(pathOutput)
    expect(output.meta.$nestedChanges)
      .toMatchObject({ [`${pathOneOfItem}/3`]: expectedDiff })
    expect(output.nested.length).toBe(4)
    expect(output.nested[0]?.id).toBe(`${pathOneOfItem}/0`)
    expect(output.nested[0]?.value()).toMatchObject({
      title: 'Circle',
      type: 'scalar',
    })
    expect(output.nested[1]?.id).toBe(`${pathOneOfItem}/1`)
    expect(output.nested[1]?.value()).toMatchObject({
      title: 'Triangle',
      type: 'scalar',
    })
    expect(output.nested[2]?.id).toBe(`${pathOneOfItem}/2`)
    expect(output.nested[2]?.value()).toMatchObject({
      title: 'Rectangle',
      type: 'scalar',
    })
    expect(output.nested[3]?.id).toBe(`${pathOneOfItem}/3`)
    expect(output.nested[3]?.value()).toMatchObject({
      title: 'Parallelogram',
      type: 'scalar',
    })
    expect(output.nested[3]?.meta)
      .toMatchObject({ $nodeChange: expectedDiff })
  })

  it('union item remove', () => {
    const before = graphapi`
      type Query {
        shape: Shape
      }
      union Shape = Circle | Triangle | Parallelogram | Rectangle
      scalar Circle
      scalar Triangle
      scalar Parallelogram
      scalar Rectangle
    `
    const after = graphapi`
      type Query {
        shape: Shape
      }
      union Shape = Circle | Triangle | Rectangle
      scalar Circle
      scalar Triangle
      scalar Rectangle
    `
    const tree = createGraphApiDiffTreeForTests(before, after, metaKey)

    const pathOutput = '#/queries/shape/output'
    const pathOneOfItem = `${pathOutput}/typeDef/type/oneOf`

    const output = tree.root!
      .children().find(child => child.kind === 'query')!
      .children().find(child => child.kind === 'output')!

    const expectedDiff = {
      type: breaking,
      action: DiffAction.remove,
      beforeValue: {
        title: 'Parallelogram',
        type: { kind: 'scalar' },
      }
    }

    expect(output?.id).toBe(pathOutput)
    expect(output.meta.$nestedChanges)
      .toMatchObject({ [`${pathOneOfItem}/2`]: expectedDiff })
    expect(output.nested.length).toBe(4)
    expect(output.nested[0]?.id).toBe(`${pathOneOfItem}/0`)
    expect(output.nested[0]?.value()).toMatchObject({
      title: 'Circle',
      type: 'scalar',
    })
    expect(output.nested[1]?.id).toBe(`${pathOneOfItem}/1`)
    expect(output.nested[1]?.value()).toMatchObject({
      title: 'Triangle',
      type: 'scalar',
    })
    expect(output.nested[2]?.id).toBe(`${pathOneOfItem}/2`)
    expect(output.nested[2]?.value()).toMatchObject({
      title: 'Parallelogram',
      type: 'scalar',
    })
    expect(output.nested[2]?.meta)
      .toMatchObject({ $nodeChange: expectedDiff })
    expect(output.nested[3]?.id).toBe(`${pathOneOfItem}/3`)
    expect(output.nested[3]?.value()).toMatchObject({
      title: 'Rectangle',
      type: 'scalar',
    })
  })
})