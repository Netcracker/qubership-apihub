import { createGraphApiTreeForTests, graphapi } from './helpers/graphql'

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
    const tree = createGraphApiTreeForTests(source, 6)

    const queryOutput = tree.root!
      .children()
      .find(child => child.kind === 'query')!
      .children()
      .find(child => child.kind === 'output')! // CycledEntity (1)

    expect(queryOutput.value()).toHaveProperty('title', 'CycledEntity')
    expect(queryOutput.isCycle).toBe(false)

    const methodChildOutput = queryOutput
      .children()
      .find(child => child.key === 'child' && child.kind === 'method')!
      .children()
      .find(child => child.kind === 'output')! // CycledEntity (2)

    expect(methodChildOutput.value()).toHaveProperty('title', 'CycledEntity')
    expect(methodChildOutput.isCycle).toBe(true)

    const nextMethodChildOutput = methodChildOutput
      .children()
      .find(child => child.key === 'child' && child.kind === 'method')!
      .children()
      .find(child => child.kind === 'output')! // CycledEntity (3)

    expect(nextMethodChildOutput.value()).toHaveProperty('title', 'CycledEntity')
    expect(nextMethodChildOutput.isCycle).toBe(true)
  })
})