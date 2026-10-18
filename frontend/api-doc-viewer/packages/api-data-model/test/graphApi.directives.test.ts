import { createGraphApiTreeForTests, graphapi } from "./helpers/graphql"

describe('GraphAPI. Directives', () => {
  it('on arg', () => {
    const source = graphapi`
      directive @foo on ARGUMENT_DEFINITION
      type Query {
        test(arg: Int @foo): String
      }
    `
    const tree = createGraphApiTreeForTests(source, 5)

    const args = tree.root!
      .children().find(child => child.kind === 'query')!
      .children().find(child => child.kind === 'args')

    const usedDirectives = args!
      .children().find(child => child.kind === 'arg')!
      .children().find(child => child.kind === 'usedDirectives')
    expect(usedDirectives).toBeTruthy()

    const directiveUsage = usedDirectives!
      .children().find(child => child.kind === 'directiveUsage')
    expect(directiveUsage).toBeTruthy()
  })

  it('on input field', () => {
    const source = graphapi`
      directive @foo on INPUT_FIELD_DEFINITION
      type Query {
        test(arg: Input): String
      }
      input Input {
        field: Int @foo
      }
    `
    const tree = createGraphApiTreeForTests(source, 6)

    const args = tree.root!
      .children().find(child => child.kind === 'query')!
      .children().find(child => child.kind === 'args')

    const field = args!
      .children().find(child => child.kind === 'arg')!
      .children().find(child => child.kind === 'property')

    const usedDirectives = field!
      .children().find(child => child.kind === 'usedDirectives')
    expect(usedDirectives).toBeTruthy()

    const directiveUsage = usedDirectives!
      .children().find(child => child.kind === 'directiveUsage')
    expect(directiveUsage).toBeTruthy()
  })

  it('on method', () => {
    const source = graphapi`
      directive @foo on FIELD_DEFINITION
      type Query {
        test: Result
      }
      type Result {
        field: String @foo
      }
    `
    const tree = createGraphApiTreeForTests(source, 5)

    const output = tree.root!
      .children().find(child => child.kind === 'query')!
      .children().find(child => child.kind === 'output')

    const field = output!
      .children().find(child => child.kind === 'method')

    const usedDirectives = field!
      .children().find(child => child.kind === 'usedDirectives')
    expect(usedDirectives).toBeTruthy()

    const directiveUsage = usedDirectives!
      .children().find(child => child.kind === 'directiveUsage')
    expect(directiveUsage).toBeTruthy()
  })

  it('on enum value', () => {
    const source = graphapi`
      directive @foo on ENUM_VALUE
      type Query {
        test: Result
      }
      enum Result {
        value @foo
      }
    `
    const tree = createGraphApiTreeForTests(source, 4)

    const output = tree.root!
      .children().find(child => child.kind === 'query')!
      .children().find(child => child.kind === 'output')

    const usedDirectives = output!
      .children().find(child => child.kind === 'usedDirectives')
    expect(usedDirectives).toBeTruthy()

    const directiveUsage = usedDirectives!
      .children().find(child => child.kind === 'directiveUsage')
    expect(directiveUsage).toBeTruthy()
  })
})