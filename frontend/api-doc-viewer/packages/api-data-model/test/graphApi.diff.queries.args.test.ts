import { breaking, DiffAction, nonBreaking, unclassified } from "@netcracker/qubership-apihub-api-diff"
import { createGraphApiDiffTreeForTests, graphapi, metaKey } from "./helpers/graphql"

describe('args', () => {
  it('arg changed', () => {
    const before = graphapi`
      type Query {
        exist(id: ID!): Boolean!
      }
      scalar Key
    `
    const after = graphapi`
      type Query {
        exist(id: Key!): Boolean!
      }
      scalar Key
    `
    const tree = createGraphApiDiffTreeForTests(before, after, metaKey)
    const root = tree.root
    const args = root!.children()[0]!.children()[0]
    const argsList = args!.children()

    const pathArg = '#/queries/exist/args'
    expect(argsList.length).toBe(1)
    expect(argsList[0]!.id).toBe(`${pathArg}/id`)
    expect(argsList[0]!.value()).toMatchObject({
      title: 'Key',
      type: 'scalar',
      nullable: false
    })
    expect(argsList[0]!.value()!.$changes).toMatchObject({
      title: {
        type: unclassified,
        action: DiffAction.add,
        afterValue: 'Key'
      },
      type: {
        type: breaking,
        action: DiffAction.replace,
        beforeValue: 'ID',
        afterValue: 'scalar'
      }
    })
  })

  it('arg added', () => {
    const before = graphapi`
      type Query {
        exist(id: ID!): Boolean!
      }
    `
    const after = graphapi`
      type Query {
        exist(id: ID!, table: String = "*"): Boolean!
      }
    `
    const tree = createGraphApiDiffTreeForTests(before, after, metaKey)
    const root = tree.root
    const args = root!.children()[0]!.children()[0]
    const argsList = args!.children()

    const pathArg = '#/queries/exist/args'
    expect(argsList.length).toBe(2)
    expect(argsList[0]!.id).toBe(`${pathArg}/id`)
    expect(argsList[0]!.value()).toMatchObject({ type: 'ID', nullable: false })
    expect(argsList[1]!.id).toBe(`${pathArg}/table`)
    expect(argsList[1]!.value()).toMatchObject({ type: 'string', default: '*' })
    expect(argsList[1]!.meta.$nodeChange).toMatchObject({
      type: nonBreaking,
      action: DiffAction.add,
      afterValue: { typeDef: { type: { kind: 'string' } }, default: '*' }
    })
  })

  it('arg removed', () => {
    const before = graphapi`
      type Query {
        exist(id: ID!, table: String = "*"): Boolean!
      }
    `
    const after = graphapi`
      type Query {
        exist(id: ID!): Boolean!
      }
    `
    const tree = createGraphApiDiffTreeForTests(before, after, metaKey)
    const root = tree.root
    const args = root!.children()[0]!.children()[0]
    const argsList = args!.children()

    const pathArg = '#/queries/exist/args'
    expect(argsList.length).toBe(2)
    expect(argsList[0]!.id).toBe(`${pathArg}/id`)
    expect(argsList[0]!.value()).toMatchObject({ type: 'ID', nullable: false })
    expect(argsList[1]!.id).toBe(`${pathArg}/table`)
    expect(argsList[1]!.value()).toMatchObject({ type: 'string', default: '*' })
    expect(argsList[1]!.meta.$nodeChange).toMatchObject({
      type: breaking,
      action: DiffAction.remove,
      beforeValue: { typeDef: { type: { kind: 'string' } }, default: '*' }
    })
  })
})
