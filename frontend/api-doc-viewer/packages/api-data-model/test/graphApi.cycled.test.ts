import { IModelTreeNode } from '../src/abstract/model/types'
import { createGraphApiTreeForTests, graphapi } from './helpers/graphql'

function findNodeChild(node: IModelTreeNode<any, any, any>): IModelTreeNode<any, any, any> {
  return node
    .children().find(child => child.kind === 'output')!
    .children().find(({ key, kind }) => kind === 'method' && key === 'child')!
}

describe('cycled entities', () => {
  const jestConsole = console
  beforeEach(() => {
    global.console = require('console')
  })
  afterEach(() => {
    global.console = jestConsole
  })

  it('self cycled object', () => {
    const source = graphapi`
      type Query {
        test: CycledEntity
      }
      type CycledEntity {
        value: String
        child: CycledEntity
      }
    `
    const tree = createGraphApiTreeForTests(source)

    const query = tree.root!.children().find(child => child.kind === 'query')!

    const childFirst = findNodeChild(query)
    const childSecond = findNodeChild(childFirst)
    const childThird = findNodeChild(childSecond)

    expect(childFirst!.isCycle).toBe(false)
    expect(childSecond!.isCycle).toBe(true)
    expect(childThird).toBe(childSecond)

    expect(tree).toBeTruthy()
  })
})