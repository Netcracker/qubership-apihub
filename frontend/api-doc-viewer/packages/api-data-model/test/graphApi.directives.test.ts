import { createGraphApiTreeForTests, graphapi } from "./helpers/graphql"

describe('GraphAPI. Directives', () => {
  it('on arg', () => {
    const source = graphapi`
      directive @foo on ARGUMENT_DEFINITION
      type Query {
        test(arg: Int @foo): String
      }
    `
    const tree = createGraphApiTreeForTests(source)

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
    const tree = createGraphApiTreeForTests(source)

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
    const tree = createGraphApiTreeForTests(source)

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
    const tree = createGraphApiTreeForTests(source)

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

  it('custom directive definition', () => {
    const source = graphapi`
      "Description"
      directive @foo(val: String = "Test") repeatable on FIELD_DEFINITION | ENUM_VALUE
    `
    const tree = createGraphApiTreeForTests(source)
    const directive = tree.root!
      .children().find(child => child.kind === 'directive')

    expect(directive).toBeTruthy()
    expect(directive!.value()).toHaveProperty('title', 'foo')
    expect(directive!.value()).toHaveProperty('description', "Description")
    expect(directive!.meta).toHaveProperty('repeatable', true)
    expect(directive!.meta).toHaveProperty('locations', ['FIELD_DEFINITION', 'ENUM_VALUE'])

    const arg = directive!
      .children().find(child => child.kind === 'args')!
      .children().find(child => child.kind === 'arg')

    expect(arg).toBeTruthy()
    expect(arg!.value()).toHaveProperty('type', 'string')
    expect(arg!.value()).toHaveProperty('default', 'Test')
  })

  it('custom directive with provided value', () => {
    const source = graphapi`
      directive @foo(val: String = "Default Value") on FIELD_DEFINITION
      type Query {
        test: String @foo(val: "My Value")
      }
    `
    const tree = createGraphApiTreeForTests(source)

    const directiveDefinition = tree.root!
      .children().find(child => child.kind === 'directive')
    const directiveDefinitionArg = directiveDefinition!
      .children().find(child => child.kind === 'args')!
      .children().find(child => child.kind === 'arg')

    expect(directiveDefinition).toBeTruthy()
    expect(directiveDefinition!.value()).toHaveProperty('title', 'foo')
    expect(directiveDefinition!.meta).toHaveProperty('locations', ['FIELD_DEFINITION'])

    expect(directiveDefinitionArg).toBeTruthy()
    expect(directiveDefinitionArg!.value()).toHaveProperty('type', 'string')
    expect(directiveDefinitionArg!.value()).toHaveProperty('default', 'Default Value')
    expect(directiveDefinitionArg!.value()).not.toHaveProperty('value', 'My Value')

    const directiveUsage = tree.root!
      .children().find(child => child.kind === 'query')!
      .children().find(child => child.kind === 'usedDirectives')!
      .children().find(child => child.kind === 'directiveUsage')
    const directiveUsageArg = directiveUsage!
      .children().find(child => child.kind === 'args')!
      .children().find(child => child.kind === 'arg')

    expect(directiveUsageArg!.value()).toHaveProperty('type', 'string')
    expect(directiveUsageArg!.value()).toHaveProperty('default', 'Default Value')
    expect(directiveUsageArg!.value()).toHaveProperty('value', 'My Value')
  })
})