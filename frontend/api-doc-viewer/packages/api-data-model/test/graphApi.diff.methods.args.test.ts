import { DiffAction, annotation, breaking, nonBreaking, unclassified } from "@netcracker/qubership-apihub-api-diff"
import { buildGraphApi, createGraphApiDiffTreeForTests, graphapi, metaKey } from "./helpers/graphql"

describe('args', () => {
  it('arg changed', () => {
    const expectedDescription = "By default pretty = false and string has the only line. If pretty = true, it'll be formatted as JSON"
    const before = graphapi`
      type Query {
        fruit: Fruit!
      }

      type Fruit {
        title: String!
        flavour: String!
        shape: String!
        asString(pretty: Boolean = false): String!
      }
    `
    const after = buildGraphApi(`
      type Query {
        fruit: Fruit!
      }

      type Fruit {
        title: String!
        flavour: String!
        shape: String!
        asString(
          "${expectedDescription}"
          pretty: Boolean = false
        ): String!
      }
    `)
    const tree = createGraphApiDiffTreeForTests(before, after, metaKey)
    const queryOutput = tree.root?.children()[0]?.children().find(node => node.kind === 'output')
    const propertyWithArg = queryOutput?.children().find(node => node.key === 'asString')
    const arg = propertyWithArg
      ?.children().find(node => node.kind === 'args')
      ?.children().find(node => node.key === 'pretty')

    expect(arg).toBeDefined()
    expect(arg?.value())
      .toMatchObject({
        type: 'boolean',
        default: false,
        description: expectedDescription
      })
    expect(arg?.value()?.$changes)
      .toMatchObject({
        description: {
          type: annotation,
          action: DiffAction.add,
          afterValue: expectedDescription
        }
      })
  })

  it('arg added', () => {
    const expectedDescription = "By default pretty = false and string has the only line. If pretty = true, it'll be formatted as JSON"
    const before = graphapi`
      type Query {
        fruit: Fruit!
      }

      type Fruit {
        title: String!
        flavour: String!
        shape: String!
        asString: String!
      }
    `
    const after = buildGraphApi(`
      type Query {
        fruit: Fruit!
      }

      type Fruit {
        title: String!
        flavour: String!
        shape: String!
        asString(
          "${expectedDescription}"
          pretty: Boolean = false
        ): String!
      }
    `)
    const tree = createGraphApiDiffTreeForTests(before, after, metaKey)
    const queryOutput = tree.root?.children()[0]?.children().find(node => node.kind === 'output')
    const propertyWithArg = queryOutput?.children().find(node => node.key === 'asString')
    const arg = propertyWithArg
      ?.children().find(node => node.kind === 'args')
      ?.children().find(node => node.key === 'pretty')

    expect(arg).toBeDefined()
    expect(arg?.value())
      .toMatchObject({
        description: expectedDescription,
        type: 'boolean',
        default: false,
      })
    expect(arg?.meta.$nodeChange)
      .toMatchObject({
        type: nonBreaking,
        action: DiffAction.add,
        afterValue: {
          typeDef: { type: { kind: 'boolean' } },
          default: false,
        },
      })
  })

  it('arg removed', () => {
    const expectedDescription = "By default pretty = false and string has the only line. If pretty = true, it'll be formatted as JSON"
    const before = buildGraphApi(`
      type Query {
        fruit: Fruit!
      }

      type Fruit {
        title: String!
        flavour: String!
        shape: String!
        asString(
          "${expectedDescription}"
          pretty: Boolean = false
        ): String!
      }
    `)
    const after = graphapi`
      type Query {
        fruit: Fruit!
      }

      type Fruit {
        title: String!
        flavour: String!
        shape: String!
        asString: String!
      }
    `
    const tree = createGraphApiDiffTreeForTests(before, after, metaKey)
    const queryOutput = tree.root?.children()[0]?.children().find(node => node.kind === 'output')
    const propertyWithArg = queryOutput?.children().find(node => node.key === 'asString')
    const arg = propertyWithArg
      ?.children().find(node => node.kind === 'args')
      ?.children().find(node => node.key === 'pretty')

    expect(arg).toBeDefined()
    expect(arg?.value())
      .toMatchObject({
        description: expectedDescription,
        type: 'boolean',
        default: false,
      })
    expect(arg?.meta.$nodeChange)
      .toMatchObject({
        type: breaking,
        action: DiffAction.remove,
        beforeValue: {
          typeDef: { type: { kind: 'boolean' } },
          default: false
        },
      })
  })

  it('type changed scalar -> object (with union inside)', () => {
    const before = graphapi`
      type Query {
        fruit: Fruit!
      }

      type Fruit {
        title: String!
        flavour: String!
        shape: String!
        asString(pretty: Boolean = false): String!
      }
    `
    const after = buildGraphApi(`
      type Query {
        fruit: Fruit!
      }

      type Fruit {
        title: String!
        flavour: String!
        shape: String!
        asString(pretty: Format): String!
      }

      input Format {
        kind: FormatKind!
        indent: Int = 2
      }
      
      union FormatKind = JSON | XML

      scalar JSON
      scalar XML
    `)
    const tree = createGraphApiDiffTreeForTests(before, after, metaKey)
    const queryOutput = tree.root?.children()[0]?.children().find(node => node.kind === 'output')
    const propertyWithArg = queryOutput?.children().find(node => node.key === 'asString')
    const arg = propertyWithArg
      ?.children().find(node => node.kind === 'args')
      ?.children().find(node => node.key === 'pretty')

    expect(arg).toBeDefined()
    expect(arg?.value()).toMatchObject({
      type: 'input'
    })
    expect(arg?.value()?.$changes)
      .toMatchObject({
        type: {
          type: breaking,
          action: DiffAction.replace,
          beforeValue: 'boolean',
          afterValue: 'input'
        },
        // default: {
        //   type: breaking,
        //   action: DiffAction.remove,
        //   beforeValue: false,
        // },
        // nullable: {
        //   type: breaking,
        //   action: DiffAction.remove,
        //   beforeValue: false
        // }
      })

    expect(arg?.children().length).toBe(2)
    expect(arg?.children()[0]?.meta.$nodeChange).toMatchObject({
      type: breaking,
      action: DiffAction.add,
      afterValue: {
        typeDef: {
          type: {
            oneOf: [
              { title: 'JSON', type: { kind: 'scalar' } },
              { title: 'XML', type: { kind: 'scalar' } },
            ]
          }
        }
      }
    })
    const nodeFormatKind = arg?.children()[0]
    expect(nodeFormatKind).toBeTruthy()
    expect(nodeFormatKind?.nested.length).toBe(2)
    const nodeFormatKindJson = nodeFormatKind?.nested[0]
    const nodeFormatKindXml = nodeFormatKind?.nested[1]
    expect(nodeFormatKindJson?.value()).toMatchObject({ title: 'JSON', type: 'scalar' })
    expect(nodeFormatKindXml?.value()).toMatchObject({ title: 'XML', type: 'scalar' })
    const nodeIndent = arg?.children()[1]
    expect(nodeIndent?.meta.$nodeChange).toMatchObject({
      type: breaking,
      action: DiffAction.add,
      afterValue: {
        typeDef: { type: { kind: 'integer' } },
        default: 2
      }
    })
  })
})