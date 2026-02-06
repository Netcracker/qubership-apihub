import { annotation, deprecated, DiffAction, nonBreaking, unclassified } from "@netcracker/qubership-apihub-api-diff"
import { createGraphApiDiffTreeForTests, diffMetaKeys, graphapi } from "./helpers/graphql"

describe('directive changes', () => {
  it('enum value, added deprecation', () => {
    const before = graphapi`
      type Query {
        test: Enum
      }
      enum Enum {
        deprecatedValue
      }
    `
    const after = graphapi`
      type Query {
        test: Enum
      }
      enum Enum {
        deprecatedValue @deprecated
      }
    `
    const tree = createGraphApiDiffTreeForTests(before, after, diffMetaKeys)

    const output = tree.root!
      .children().find(child => child.kind === 'query')!
      .children().find(child => child.kind === 'output')!

    expect(output.value()).toHaveProperty(
      ['values', 'deprecatedValue', 'deprecationReason'],
      'No longer supported'
    )
    expect(output.value()?.$changes).toHaveProperty(
      ['values', 'deprecatedValue', 'deprecationReason'],
      expect.objectContaining({
        type: deprecated,
        action: DiffAction.add,
        afterValue: 'No longer supported',
      })
    )
  })

  it('enum value, removed deprecation', () => {
    const before = graphapi`
      type Query {
        test: Enum
      }
      enum Enum {
        deprecatedValue @deprecated
      }
    `
    const after = graphapi`
      type Query {
        test: Enum
      }
      enum Enum {
        deprecatedValue
      }
    `
    const tree = createGraphApiDiffTreeForTests(before, after, diffMetaKeys)

    const output = tree.root!
      .children().find(child => child.kind === 'query')!
      .children().find(child => child.kind === 'output')!

    expect(output.value()).toHaveProperty(
      ['values', 'deprecatedValue', 'deprecationReason'],
      'No longer supported'
    )
    expect(output.value()?.$changes).toHaveProperty(
      ['values', 'deprecatedValue', 'deprecationReason'],
      expect.objectContaining({
        type: deprecated,
        action: DiffAction.remove,
        beforeValue: 'No longer supported',
      })
    )
  })

  it('deprecated enum value, replaced deprecation reason', () => {
    const before = graphapi`
      type Query {
        test: Enum
      }
      enum Enum {
        deprecatedValue @deprecated(reason: "Before")
      }
    `
    const after = graphapi`
      type Query {
        test: Enum
      }
      enum Enum {
        deprecatedValue @deprecated(reason: "After")
      }
    `
    const tree = createGraphApiDiffTreeForTests(before, after, diffMetaKeys)

    const output = tree.root!
      .children().find(child => child.kind === 'query')!
      .children().find(child => child.kind === 'output')!

    expect(output.value()).toHaveProperty(
      ['values', 'deprecatedValue', 'deprecationReason'],
      'After'
    )
    expect(output.value()?.$changes).toHaveProperty(
      ['values', 'deprecatedValue', 'deprecationReason'],
      expect.objectContaining({
        type: annotation,
        action: DiffAction.replace,
        beforeValue: 'Before',
        afterValue: 'After',
      })
    )
  })

  it('query, added deprecation', () => {
    const before = graphapi`
      type Query {
        test: String 
      }
    `
    const after = graphapi`
      type Query {
        test: String @deprecated
      }
    `
    const tree = createGraphApiDiffTreeForTests(before, after, diffMetaKeys)

    const query = tree.root!
      .children().find(child => child.kind === 'query')!

    expect(query.meta).toHaveProperty('deprecationReason', 'No longer supported')
    expect(query.meta.$metaChanges).toHaveProperty(
      'deprecationReason',
      expect.objectContaining({
        type: deprecated,
        action: DiffAction.add,
      })
    )
  })

  it('query, remove deprecation', () => {
    const before = graphapi`
      type Query {
        test: String @deprecated
      }
    `
    const after = graphapi`
      type Query {
        test: String 
      }
    `
    const tree = createGraphApiDiffTreeForTests(before, after, diffMetaKeys)

    const query = tree.root!
      .children().find(child => child.kind === 'query')!

    expect(query.meta).toHaveProperty('deprecationReason', 'No longer supported')
    expect(query.meta.$metaChanges).toHaveProperty(
      'deprecationReason',
      expect.objectContaining({
        type: deprecated,
        action: DiffAction.remove,
      })
    )
  })

  it('deprecated query, replaced deprecation reason', () => {
    const before = graphapi`
      type Query {
        test: String @deprecated
      }
    `
    const after = graphapi`
      type Query {
        test: String @deprecated(reason: "Will be deleted")
      }
    `
    const tree = createGraphApiDiffTreeForTests(before, after, diffMetaKeys)

    const query = tree.root!
      .children().find(child => child.kind === 'query')!

    expect(query.meta).toHaveProperty('deprecationReason', 'Will be deleted')
    expect(query.meta.$metaChanges).toHaveProperty(
      'deprecationReason',
      expect.objectContaining({
        type: annotation,
        action: DiffAction.replace,
      })
    )
  })

  it('method, added deprecation', () => {
    const before = graphapi`
      type Query {
        test: Wrapper
      }
      type Wrapper {
        test: String 
      }
    `
    const after = graphapi`
      type Query {
        test: Wrapper
      }
      type Wrapper {
        test: String @deprecated
      }
    `
    const tree = createGraphApiDiffTreeForTests(before, after, diffMetaKeys)

    const output = tree.root!
      .children().find(child => child.kind === 'query')!
      .children().find(child => child.kind === 'output')!

    const method = output!
      .children().find(child => child.kind === 'method')!

    expect(method.meta).toHaveProperty('deprecationReason', 'No longer supported')
    expect(method.meta.$metaChanges).toHaveProperty(
      'deprecationReason',
      expect.objectContaining({
        type: deprecated,
        action: DiffAction.add,
      })
    )
  })

  it('method, remove deprecation', () => {
    const before = graphapi`
      type Query {
        test: Wrapper
      }
      type Wrapper {
        test: String @deprecated
      }
    `
    const after = graphapi`
      type Query {
        test: Wrapper
      }
      type Wrapper {
        test: String 
      }
    `
    const tree = createGraphApiDiffTreeForTests(before, after, diffMetaKeys)

    const output = tree.root!
      .children().find(child => child.kind === 'query')!
      .children().find(child => child.kind === 'output')!

    const method = output!
      .children().find(child => child.kind === 'method')!

    expect(method.meta).toHaveProperty('deprecationReason', 'No longer supported')
    expect(method.meta.$metaChanges).toHaveProperty(
      'deprecationReason',
      expect.objectContaining({
        type: deprecated,
        action: DiffAction.remove,
      })
    )
  })

  it('deprecated method, replaced deprecation reason', () => {
    const before = graphapi`
      type Query {
        test: Wrapper
      }
      type Wrapper {
        test: String @deprecated
      }
    `
    const after = graphapi`
      type Query {
        test: Wrapper
      }
      type Wrapper {
        test: String @deprecated(reason: "Will be deleted")
      }
    `
    const tree = createGraphApiDiffTreeForTests(before, after, diffMetaKeys)

    const output = tree.root!
      .children().find(child => child.kind === 'query')!
      .children().find(child => child.kind === 'output')!

    const method = output!
      .children().find(child => child.kind === 'method')!

    expect(method.meta).toHaveProperty('deprecationReason', 'Will be deleted')
    expect(method.meta.$metaChanges).toHaveProperty(
      'deprecationReason',
      expect.objectContaining({
        type: annotation,
        action: DiffAction.replace,
      })
    )
  })

  it('added custom directive on query', () => {
    const before = graphapi`
      type Query {
        test: String
      }
    `
    const after = graphapi`
      directive @foo on FIELD_DEFINITION
      type Query {
        test: String @foo
      }
    `

    const tree = createGraphApiDiffTreeForTests(before, after, diffMetaKeys)
    const query = tree.root!.children().find(child => child.kind === 'query')

    expect(query?.meta.directives).toHaveProperty('foo', {
      definition: expect.objectContaining({
        title: 'foo',
        locations: ['FIELD_DEFINITION']
      })
    })

    const usedDirectives = query!
      .children().find(child => child.kind === 'usedDirectives')
    expect(usedDirectives?.children().length).toBe(1)

    const expectedDiff = {
      type: unclassified,
      action: DiffAction.add,
    }
    expect(usedDirectives?.meta.$childrenChanges)
      .toEqual({ '#/queries/test/directives/foo': expect.objectContaining(expectedDiff) })
    expect(usedDirectives?.children()[0]?.meta.$nodeChange)
      .toMatchObject(expectedDiff)
  })

  it('removed custom directive on query', () => {
    const before = graphapi`
      directive @foo on FIELD_DEFINITION
      type Query {
        test: String @foo
      }
    `
    const after = graphapi`
      type Query {
        test: String
      }
    `

    const tree = createGraphApiDiffTreeForTests(before, after, diffMetaKeys)
    const query = tree.root!.children().find(child => child.kind === 'query')

    expect(query?.meta.directives).toHaveProperty('foo', {
      definition: expect.objectContaining({
        title: 'foo',
        locations: ['FIELD_DEFINITION']
      })
    })

    const usedDirectives = query!
      .children().find(child => child.kind === 'usedDirectives')
    expect(usedDirectives?.children().length).toBe(1)

    const expectedDiff = {
      type: unclassified,
      action: DiffAction.remove,
    }
    expect(usedDirectives?.meta.$childrenChanges)
      .toEqual({ '#/queries/test/directives/foo': expect.objectContaining(expectedDiff) })
    expect(usedDirectives?.children()[0]?.meta.$nodeChange)
      .toMatchObject(expectedDiff)
  })

  it('custom directive on query, added location', () => {
    const before = graphapi`
      directive @foo on FIELD_DEFINITION
      type Query {
        test: String @foo
      }
    `
    const after = graphapi`
      directive @foo on FIELD_DEFINITION | ENUM_VALUE
      type Query {
        test: String @foo
      }
    `
    const tree = createGraphApiDiffTreeForTests(before, after, diffMetaKeys)

    const output = tree.root!
      .children().find(child => child.kind === 'query')!
    const usedDirectives = output!
      .children().find(child => child.kind === 'usedDirectives')
    const directiveUsage = usedDirectives!.children()[0]

    expect(directiveUsage.value()).toMatchObject({
      title: 'foo'
    })
    expect(directiveUsage.meta).toMatchObject({
      locations: ['FIELD_DEFINITION', 'ENUM_VALUE']
    })
    expect(directiveUsage.meta?.$metaChanges).toMatchObject({
      locations: {
        1: expect.objectContaining({
          type: nonBreaking,
          action: DiffAction.add,
        })
      }
    })
  })

  it('custom directive on query, removed location', () => {
    const before = graphapi`
      directive @foo on FIELD_DEFINITION | ENUM_VALUE
      type Query {
        test: String @foo
      }
    `
    const after = graphapi`
      directive @foo on FIELD_DEFINITION
      type Query {
        test: String @foo
      }
    `
    const tree = createGraphApiDiffTreeForTests(before, after, diffMetaKeys)

    const output = tree.root!
      .children().find(child => child.kind === 'query')!
    const usedDirectives = output!
      .children().find(child => child.kind === 'usedDirectives')
    const directiveUsage = usedDirectives!.children()[0]

    expect(directiveUsage.value()).toMatchObject({
      title: 'foo',
    })
    expect(directiveUsage.meta).toMatchObject({
      locations: ['FIELD_DEFINITION', 'ENUM_VALUE']
    })
    expect(directiveUsage.meta.$metaChanges).toMatchObject({
      locations: {
        1: expect.objectContaining({
          type: nonBreaking,
          action: DiffAction.remove,
        })
      }
    })
  })

  it('custom directive on query, replaced location', () => {
    const before = graphapi`
      directive @foo on FIELD_DEFINITION | ENUM_VALUE
      type Query {
        test: String @foo
      }
    `
    const after = graphapi`
      directive @foo on FIELD_DEFINITION | INPUT_FIELD_DEFINITION
      type Query {
        test: String @foo
      }
    `
    const tree = createGraphApiDiffTreeForTests(before, after, diffMetaKeys)

    const output = tree.root!
      .children().find(child => child.kind === 'query')!
    const usedDirectives = output!
      .children().find(child => child.kind === 'usedDirectives')
    const directiveUsage = usedDirectives!.children()[0]

    expect(directiveUsage.value()).toMatchObject({
      title: 'foo',
    })
    expect(directiveUsage.meta).toMatchObject({
      locations: ['FIELD_DEFINITION', 'ENUM_VALUE', 'INPUT_FIELD_DEFINITION']
    })
    expect(directiveUsage.meta.$metaChanges).toMatchObject({
      locations: {
        1: expect.objectContaining({
          type: nonBreaking,
          action: DiffAction.remove,
        }),
        2: expect.objectContaining({
          type: nonBreaking,
          action: DiffAction.add,
        }),
      }
    })
  })

  it('custom directive on query, made repeatable', () => {
    const before = graphapi`
      directive @foo on FIELD_DEFINITION
      type Query {
        test: String @foo
      }
    `
    const after = graphapi`
      directive @foo repeatable on FIELD_DEFINITION
      type Query {
        test: String @foo
      }
    `
    const tree = createGraphApiDiffTreeForTests(before, after, diffMetaKeys)

    const output = tree.root!
      .children().find(child => child.kind === 'query')!
    const usedDirectives = output!
      .children().find(child => child.kind === 'usedDirectives')
    const directiveUsage = usedDirectives!.children()[0]

    expect(directiveUsage.value()).toMatchObject({
      title: 'foo',
    })
    expect(directiveUsage.meta).toMatchObject({
      locations: ['FIELD_DEFINITION'],
      repeatable: true,
    })
    expect(directiveUsage.meta.$metaChanges).toMatchObject({
      repeatable: expect.objectContaining({
        type: unclassified,
        action: DiffAction.replace,
        beforeValue: false,
        afterValue: true,
      })
    })
  })

  it('custom directive on query, made NOT repeatable', () => {
    const before = graphapi`
      directive @foo repeatable on FIELD_DEFINITION
      type Query {
        test: String @foo
      }
    `
    const after = graphapi`
      directive @foo on FIELD_DEFINITION
      type Query {
        test: String @foo
      }
    `
    const tree = createGraphApiDiffTreeForTests(before, after, diffMetaKeys)

    const output = tree.root!
      .children().find(child => child.kind === 'query')!
    const usedDirectives = output!
      .children().find(child => child.kind === 'usedDirectives')
    const directiveUsage = usedDirectives!.children()[0]

    expect(directiveUsage.value()).toMatchObject({
      title: 'foo',
    })
    expect(directiveUsage.meta).toMatchObject({
      locations: ['FIELD_DEFINITION'],
      repeatable: false,
    })
    expect(directiveUsage.meta.$metaChanges).toMatchObject({
      repeatable: expect.objectContaining({
        type: unclassified,
        action: DiffAction.replace,
        beforeValue: true,
        afterValue: false,
      })
    })
  })

  it('custom directive on query, added arg', () => {
    const before = graphapi`
      directive @foo on FIELD_DEFINITION
      type Query {
        test: String @foo
      }
    `
    const after = graphapi`
      directive @foo(value: String) on FIELD_DEFINITION
      type Query {
        test: String @foo
      }
    `
    const tree = createGraphApiDiffTreeForTests(before, after, diffMetaKeys, 5)

    const query = tree.root!
      .children().find(child => child.kind === 'query')!
    const usedDirectives = query!
      .children().find(child => child.kind === 'usedDirectives')
    const directiveUsage = usedDirectives!.children()[0]

    expect(directiveUsage.value()).toMatchObject({
      title: 'foo',
    })
    expect(directiveUsage.meta).toMatchObject({
      locations: ['FIELD_DEFINITION'],
    })

    const directiveArg = directiveUsage!
      .children().find(child => child.kind === 'args')!
      .children().find(child => child.kind === 'arg')!

    expect(directiveArg.meta.$nodeChange).toMatchObject({
      type: nonBreaking,
      action: DiffAction.add,
    })
  })

  it('custom directive on query, removed arg', () => {
    const before = graphapi`
      directive @foo(value: String) on FIELD_DEFINITION
      type Query {
        test: String @foo
      }
    `
    const after = graphapi`
      directive @foo on FIELD_DEFINITION
      type Query {
        test: String @foo
      }
    `
    const tree = createGraphApiDiffTreeForTests(before, after, diffMetaKeys, 5)

    const query = tree.root!
      .children().find(child => child.kind === 'query')!
    const usedDirectives = query!
      .children().find(child => child.kind === 'usedDirectives')
    const directiveUsage = usedDirectives!.children()[0]

    expect(directiveUsage.value()).toMatchObject({
      title: 'foo',
    })

    expect(directiveUsage.meta).toMatchObject({
      locations: ['FIELD_DEFINITION'],
    })

    const directiveArg = directiveUsage!
      .children().find(child => child.kind === 'args')!
      .children().find(child => child.kind === 'arg')!

    expect(directiveArg.meta.$nodeChange).toMatchObject({
      type: nonBreaking,
      action: DiffAction.remove,
    })
  })

  it('custom directive usage, changed argument', () => {
    const before = graphapi`
      directive @foo(val: String) on FIELD_DEFINITION
      type Query {
        test: String @foo(val: "value")
      }
    `
    const after = graphapi`
      directive @foo(val: String) on FIELD_DEFINITION
      type Query {
        test: String @foo(val: "changed value")
      }
    `
    const tree = createGraphApiDiffTreeForTests(before, after, diffMetaKeys, 5)

    const arg = tree.root!
      .children().find(child => child.kind === 'query')!
      .children().find(child => child.kind === 'usedDirectives')!
      .children().find(child => child.kind === 'directiveUsage')!
      .children().find(child => child.kind === 'args')!
      .children().find(child => child.kind === 'arg')

    expect(arg!.value()).toHaveProperty('value', 'changed value')
    expect(arg!.value()?.$changes).toMatchObject({
      value: {
        type: annotation,
        action: DiffAction.replace,
        beforeValue: 'value',
        afterValue: 'changed value',
      }
    })
  })
})