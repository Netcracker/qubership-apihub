import { annotation, breaking, deprecated, DiffAction, nonBreaking, unclassified } from "@netcracker/qubership-apihub-api-diff"
import { isGraphSchemaNodeEnumValue } from "../src"
import { createGraphApiDiffTreeForTests, graphapi, metaKey } from "./helpers/graphql"

describe('output', () => {
  it('type changed: scalar -> enum', () => {
    const before = graphapi`
      type Query {
        fruit: FruitWrapper
      }
      type FruitWrapper {
        fruit: String!
      }
    `
    const after = graphapi`
      type Query {
        fruit: FruitWrapper
      }
      type FruitWrapper {
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

    expect(output!.id).toBe('#/queries/fruit/output')
    const outputValue = output!.value()
    expect(outputValue).toMatchObject({ title: 'FruitWrapper', type: 'object' })

    const fruit = output!
      .children().find(child => child.kind === 'method')!
      .children().find(child => child.kind === 'output')
    const fruitValue = fruit!.value()

    if (!isGraphSchemaNodeEnumValue(fruitValue)) { fail() }

    expect(fruitValue!.nullable).toBe(false)
    expect(fruitValue!.title).toBe('Fruit')
    expect(fruitValue!.values).toMatchObject({
      Pineapple: {},
      Orange: {
        description: 'Orange sour-sweet fruit',
      },
      Banana: {
        deprecationReason: 'Because why',
      }
    })

    expect(fruitValue!.$changes).toHaveProperty(['values'], {
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

  it('type changed: scalar -> object', () => {
    const before = graphapi`
      type Query {
        fruit: FruitWrapper
      }
      type FruitWrapper {
        fruit: String!
      }
    `
    const after = graphapi`
      type Query {
        fruit: FruitWrapper
      }
      type FruitWrapper {
        fruit: Fruit!
      }
      type Fruit {
        title: String!
        flavour: String!
        shape: String!
        isExotic: Boolean
      }
    `

    const pathOutput = '#/queries/fruit/output'

    const tree = createGraphApiDiffTreeForTests(before, after, metaKey)
    const root = tree.root
    const output = root!
      .children().find(child => child.kind === 'query')!
      .children().find(child => child.kind === 'output')!

    expect(output.id).toBe(pathOutput)
    const fruitOutput = output
      .children().find(child => child.kind === 'method')!
      .children().find(child => child.kind === 'output')!
    const fruitOutputMeta = fruitOutput!.meta
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
    const pathFruitMethods = `${pathOutput}/typeDef/type/methods/fruit/output/typeDef/type/methods`
    expect(fruitOutputMeta.$childrenChanges).toMatchObject({
      [`${pathFruitMethods}/title`]: expectedDiff('string', false),
      [`${pathFruitMethods}/flavour`]: expectedDiff('string', false),
      [`${pathFruitMethods}/shape`]: expectedDiff('string', false),
      [`${pathFruitMethods}/isExotic`]: expectedDiff('boolean'),
    })
  })

  it('type changed: scalar -> array', () => {
    const before = graphapi`
      type Query {
        fruit: FruitWrapper
      }
      type FruitWrapper {
        test: Response!
      }
      scalar Response
    `
    const after = graphapi`
      type Query {
        fruit: FruitWrapper
      }
      type FruitWrapper {
        test: [String!]!
      }
    `
    const tree = createGraphApiDiffTreeForTests(before, after, metaKey)
    const output = tree.root!
      .children().find(child => child.kind === 'query')!
      .children().find(child => child.kind === 'output')!
    expect(output.value()).toMatchObject({
      title: 'FruitWrapper',
      type: 'object',
    })
    const test = output!
      .children().find(child => child.kind === 'method')!
      .children().find(child => child.kind === 'output')!
    expect(test.value()).toMatchObject({
      title: 'Response',
      type: 'list',
      nullable: false,
    })
    expect(test.value()!.$changes).toMatchObject({
      title: { action: DiffAction.remove, beforeValue: 'Response' },
      type: { action: DiffAction.replace, beforeValue: 'scalar', afterValue: 'list' },
    })
    expect(test.children()[0]?.value()).toMatchObject({
      type: 'string',
      nullable: false,
    })
  })

  it('type changed: object -> array', () => {
    const before = graphapi`
      type Query {
        fruit: FruitWrapper
      }
      type FruitWrapper {
        test: Response!
      }
      type Response {
        id: ID!
        name: String
      }
    `
    const after = graphapi`
      type Query {
        fruit: FruitWrapper
      }
      type FruitWrapper {
        test: [String!]!
      }
    `
    const tree = createGraphApiDiffTreeForTests(before, after, metaKey)
    const output = tree.root!
      .children().find(child => child.kind === 'query')!
      .children().find(child => child.kind === 'output')!
    expect(output.value()).toMatchObject({
      title: 'FruitWrapper',
      type: 'object',
    })
    const test = output!
      .children().find(child => child.kind === 'method')!
      .children().find(child => child.kind === 'output')!
    expect(test.value()).toMatchObject({
      title: 'Response',
      type: 'list',
      nullable: false,
    })
    expect(test.value()!.$changes).toMatchObject({
      title: { type: unclassified, action: DiffAction.remove },
      type: { type: breaking, action: DiffAction.replace, beforeValue: 'object', afterValue: 'list' }
    })
    const testChildren = test.children()
    expect(testChildren.length).toBe(3)
    const methods = testChildren.filter(child => child.kind === 'method')
    const [methodId, methodName] = methods
    const items = testChildren.find(child => child.kind === 'items')
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
        fruit: FruitWrapper
      }
      type FruitWrapper {
        test: Response!
      }
      interface Response {
        id: ID!
        name: String
      }
    `
    const after = graphapi`
      type Query {
        fruit: FruitWrapper
      }
      type FruitWrapper {
        test: [String!]!
      }
    `
    const tree = createGraphApiDiffTreeForTests(before, after, metaKey)
    const output = tree.root!
      .children().find(child => child.kind === 'query')!
      .children().find(child => child.kind === 'output')!
    expect(output.value()).toMatchObject({
      title: 'FruitWrapper',
      type: 'object',
    })
    const test = output!
      .children().find(child => child.kind === 'method')!
      .children().find(child => child.kind === 'output')!
    expect(test.value()).toMatchObject({
      title: 'Response',
      type: 'list',
      nullable: false,
    })
    expect(test.value()!.$changes).toMatchObject({
      title: { type: unclassified, action: DiffAction.remove },
      type: { type: breaking, action: DiffAction.replace, beforeValue: 'interface', afterValue: 'list' }
    })
    const testChildren = test.children()
    expect(testChildren.length).toBe(3)
    const methods = testChildren.filter(child => child.kind === 'method')
    const [methodId, methodName] = methods
    const items = testChildren.find(child => child.kind === 'items')
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
        fruit: FruitWrapper
      }
      type FruitWrapper {
        test: Response!
      }
      input Response {
        id: ID!
        name: String
      }
    `
    const after = graphapi`
      type Query {
        fruit: FruitWrapper
      }
      type FruitWrapper {
        test: [String!]!
      }
    `
    const tree = createGraphApiDiffTreeForTests(before, after, metaKey)
    const output = tree.root!
      .children().find(child => child.kind === 'query')!
      .children().find(child => child.kind === 'output')!
    expect(output.value()).toMatchObject({
      title: 'FruitWrapper',
      type: 'object',
    })
    const test = output!
      .children().find(child => child.kind === 'method')!
      .children().find(child => child.kind === 'output')!
    expect(test.value()).toMatchObject({
      title: 'Response',
      type: 'list',
      nullable: false,
    })
    expect(test.value()!.$changes).toMatchObject({
      title: { type: unclassified, action: DiffAction.remove },
      type: { type: breaking, action: DiffAction.replace, beforeValue: 'input', afterValue: 'list' }
    })
    const testChildren = test.children()
    expect(testChildren.length).toBe(3)
    const props = testChildren.filter(child => child.kind === 'property')
    const [propId, propName] = props
    const items = testChildren.find(child => child.kind === 'items')
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
        fruit: FruitWrapper
      }
      type FruitWrapper {
        test: Response!
      }
      type Response {
        id: ID!
        name: String
      }
    `
    const after = graphapi`
      type Query {
        fruit: FruitWrapper
      }
      type FruitWrapper {
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
      title: 'FruitWrapper',
      type: 'object',
    })
    const test = output!
      .children().find(child => child.kind === 'method')!
      .children().find(child => child.kind === 'output')!
    expect(test.value()).toMatchObject({
      title: 'Response',
      type: 'input',
      nullable: false,
    })
    expect(test.value()!.$changes).toMatchObject({
      type: { type: breaking, action: DiffAction.replace, beforeValue: 'object', afterValue: 'input' }
    })
    const testChildren = test.children()
    expect(testChildren.length).toBe(4)
    const methods = testChildren.filter(child => child.kind === 'method')
    const props = testChildren.filter(child => child.kind === 'property')
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
        fruit: FruitWrapper
      }
      type FruitWrapper {
        test: Response!
      }
      type Response {
        id: ID!
        name: String
      }
    `
    const after = graphapi`
      type Query {
        fruit: FruitWrapper
      }
      type FruitWrapper {
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
      title: 'FruitWrapper',
      type: 'object',
    })
    const test = output!
      .children().find(child => child.kind === 'method')!
      .children().find(child => child.kind === 'output')!
    expect(test.value()).toMatchObject({
      title: 'Response',
      type: 'interface',
      nullable: false,
    })
    expect(test.value()!.$changes).toMatchObject({
      type: { type: breaking, action: DiffAction.replace, beforeValue: 'object', afterValue: 'interface' }
    })
    const testChildren = test.children()
    expect(testChildren.length).toBe(4)
    const methods = testChildren.filter(child => child.kind === 'method')
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
        fruit: FruitWrapper
      }
      type FruitWrapper {
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
        fruit: FruitWrapper
      }
      type FruitWrapper {
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
    expect(output.value()).toMatchObject({
      title: 'FruitWrapper',
      type: 'object'
    })
    const fruit = output!
      .children().find(child => child.kind === 'method')!
      .children().find(child => child.kind === 'output')!
    const fruitValue = fruit.value()

    if (!isGraphSchemaNodeEnumValue(fruitValue)) { fail() }

    expect(fruitValue?.nullable).toBe(false)
    expect(fruitValue?.values).toMatchObject({
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
    expect(fruitValue?.$changes).toMatchObject({
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
        fruit: FruitWrapper
      }
      type FruitWrapper {
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
        fruit: FruitWrapper
      }
      type FruitWrapper {
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

    const output = tree.root!
      .children().find(child => child.kind === 'query')!
      .children().find(child => child.kind === 'output')!

    const fruit = output!
      .children().find(child => child.kind === 'method')!
      .children().find(child => child.kind === 'output')!

    expect(fruit.children().length).toBe(4)
    expect(fruit.children()[0].children()[0].value()).toMatchObject({ type: 'string' })
    expect(fruit.children()[1].children()[0].value()).toMatchObject({ type: 'string' })
    expect(fruit.children()[2].children()[0].value()).toMatchObject({ type: 'string' })
    expect(fruit.children()[3].meta).toMatchObject({
      deprecationReason: 'No longer supported'
    })
    expect(fruit.children()[3].value()).toMatchObject({
      description: 'true - is exotic, false - regular',
    })
    expect(fruit.children()[3].meta.$metaChanges).toMatchObject({
      deprecationReason: {
        type: deprecated,
        action: DiffAction.add,
        afterValue: 'No longer supported'
      }
    })
    expect(fruit.children()[3].value()?.$changes).toMatchObject({
      description: {
        type: annotation,
        action: DiffAction.add,
        afterValue: 'true - is exotic, false - regular'
      },
    })
    expect(fruit.children()[3].children()[0].value()).toMatchObject({ type: 'boolean' })
  })

  it('property added', () => {
    const before = graphapi`
      type Query {
        fruit: FruitWrapper
      }
      type FruitWrapper {
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
        fruit: FruitWrapper
      }
      type FruitWrapper {
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

    const pathOutput = '#/queries/fruit/output'
    const pathMethods = `${pathOutput}/typeDef/type/methods/fruit/output/typeDef/type/methods`

    const output = tree.root!
      .children().find(child => child.kind === 'query')!
      .children().find(child => child.kind === 'output')!

    const fruit = output!
      .children().find(child => child.kind === 'method')!
      .children().find(child => child.kind === 'output')!

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
    expect(fruit?.meta.$childrenChanges).toMatchObject({
      [`${pathMethods}/isExotic`]: expectedDiffAddProperty
    })
    const props = fruit?.children()
    expect(props.length).toBe(4)
    expect(props[0]?.id).toBe(`${pathMethods}/title`)
    expect(props[1]?.id).toBe(`${pathMethods}/flavour`)
    expect(props[2]?.id).toBe(`${pathMethods}/shape`)
    expect(props[3]?.id).toBe(`${pathMethods}/isExotic`)
    expect(props[3]?.meta.$nodeChange).toMatchObject(expectedDiffAddProperty)
  })

  it('property removed', () => {
    const before = graphapi`
      type Query {
        fruit: FruitWrapper
      }
      type FruitWrapper {
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
        fruit: FruitWrapper
      }
      type FruitWrapper {
        fruit: Fruit!
      }
      type Fruit {
        title: String!
        flavour: String!
        shape: String!
      }
    `
    const tree = createGraphApiDiffTreeForTests(before, after, metaKey)

    const pathOutput = '#/queries/fruit/output'
    const pathMethods = `${pathOutput}/typeDef/type/methods/fruit/output/typeDef/type/methods`

    const output = tree.root!
      .children().find(child => child.kind === 'query')!
      .children().find(child => child.kind === 'output')!

    const fruit = output!
      .children().find(child => child.kind === 'method')!
      .children().find(child => child.kind === 'output')!

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
    expect(fruit?.meta.$childrenChanges).toMatchObject({
      [`${pathMethods}/isExotic`]: expectedDiffRemoveProperty
    })
    const props = fruit?.children()
    expect(props.length).toBe(4)
    expect(props[0]?.id).toBe(`${pathMethods}/title`)
    expect(props[1]?.id).toBe(`${pathMethods}/flavour`)
    expect(props[2]?.id).toBe(`${pathMethods}/shape`)
    expect(props[3]?.id).toBe(`${pathMethods}/isExotic`)
    expect(props[3]?.meta.$nodeChange).toMatchObject(expectedDiffRemoveProperty)
  })

  it('union item added', () => {
    const before = graphapi`
      type Query {
        test: ShapeWrapper
      }
      type ShapeWrapper {
        shape: Shape
      }
      union Shape = Circle | Triangle | Rectangle
      scalar Circle
      scalar Triangle
      scalar Rectangle
    `
    const after = graphapi`
      type Query {
        test: ShapeWrapper
      }
      type ShapeWrapper {
        shape: Shape
      }
      union Shape = Circle | Triangle | Parallelogram | Rectangle
      scalar Circle
      scalar Triangle
      scalar Parallelogram
      scalar Rectangle
    `
    const tree = createGraphApiDiffTreeForTests(before, after, metaKey)

    const pathOneOfItem = '#/queries/test/output/typeDef/type/methods/shape/output/typeDef/type/oneOf'

    const output = tree.root!
      .children().find(child => child.kind === 'query')!
      .children().find(child => child.kind === 'output')!

    const test = output!
      .children().find(child => child.kind === 'method')!
      .children().find(child => child.kind === 'output')!

    const expectedDiff = {
      type: breaking,
      action: DiffAction.add,
      afterValue: {
        title: 'Parallelogram',
        type: { kind: 'scalar' },
      }
    }

    expect(test.meta.$nestedChanges)
      .toMatchObject({ [`${pathOneOfItem}/3`]: expectedDiff })
    expect(test.nested.length).toBe(4)
    expect(test.nested[0]?.id).toBe(`${pathOneOfItem}/0`)
    expect(test.nested[0]?.value()).toMatchObject({
      title: 'Circle',
      type: 'scalar',
    })
    expect(test.nested[1]?.id).toBe(`${pathOneOfItem}/1`)
    expect(test.nested[1]?.value()).toMatchObject({
      title: 'Triangle',
      type: 'scalar',
    })
    expect(test.nested[2]?.id).toBe(`${pathOneOfItem}/2`)
    expect(test.nested[2]?.value()).toMatchObject({
      title: 'Rectangle',
      type: 'scalar',
    })
    expect(test.nested[3]?.id).toBe(`${pathOneOfItem}/3`)
    expect(test.nested[3]?.value()).toMatchObject({
      title: 'Parallelogram',
      type: 'scalar',
    })
    expect(test.nested[3]?.meta)
      .toMatchObject({ $nodeChange: expectedDiff })
  })

  it('union item remove', () => {
    const before = graphapi`
      type Query {
        test: ShapeWrapper
      }
      type ShapeWrapper {
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
        test: ShapeWrapper
      }
      type ShapeWrapper {
        shape: Shape
      }
      union Shape = Circle | Triangle | Rectangle
      scalar Circle
      scalar Triangle
      scalar Rectangle
    `

    const tree = createGraphApiDiffTreeForTests(before, after, metaKey)

    const pathOneOfItem = '#/queries/test/output/typeDef/type/methods/shape/output/typeDef/type/oneOf'

    const output = tree.root!
      .children().find(child => child.kind === 'query')!
      .children().find(child => child.kind === 'output')!

    const test = output!
      .children().find(child => child.kind === 'method')!
      .children().find(child => child.kind === 'output')!

    const expectedDiff = {
      type: breaking,
      action: DiffAction.remove,
      beforeValue: {
        title: 'Parallelogram',
        type: { kind: 'scalar' },
      }
    }

    expect(test.meta.$nestedChanges)
      .toMatchObject({ [`${pathOneOfItem}/2`]: expectedDiff })
    expect(test.nested.length).toBe(4)
    expect(test.nested[0]?.id).toBe(`${pathOneOfItem}/0`)
    expect(test.nested[0]?.value()).toMatchObject({
      title: 'Circle',
      type: 'scalar',
    })
    expect(test.nested[1]?.id).toBe(`${pathOneOfItem}/1`)
    expect(test.nested[1]?.value()).toMatchObject({
      title: 'Triangle',
      type: 'scalar',
    })
    expect(test.nested[2]?.id).toBe(`${pathOneOfItem}/2`)
    expect(test.nested[2]?.value()).toMatchObject({
      title: 'Parallelogram',
      type: 'scalar',
    })
    expect(test.nested[2]?.meta)
      .toMatchObject({ $nodeChange: expectedDiff })
    expect(test.nested[3]?.id).toBe(`${pathOneOfItem}/3`)
    expect(test.nested[3]?.value()).toMatchObject({
      title: 'Rectangle',
      type: 'scalar',
    })
  })
})