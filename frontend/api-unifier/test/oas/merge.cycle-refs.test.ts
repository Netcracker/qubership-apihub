import { normalize } from '../../src'
import { TEST_INLINE_REFS_FLAG } from '../helpers'
import 'jest-extended'

describe('cycle $refs', () => {

  it('should support cycle refs in allOf', () => {
    const data = {
      type: 'object',
      description: 'parent',
      properties: {
        foo: {
          allOf: [
            {
              description: 'foo not override',
            },
            {
              $ref: '#',
            },
          ],
        },
        baz: {
          allOf: [
            {
              $ref: '#',
            },
            {
              description: 'baz override',
            },
          ],
        },
      },
    }

    const mergedData: any = normalize(data, { inlineRefsFlag: TEST_INLINE_REFS_FLAG })

    const expected = {
      type: 'object',
      description: 'parent',
      properties: {
        foo: {
          type: 'object',
          properties: {
            foo: null as any,
            baz: null as any,
          },
          description: 'parent',
          [TEST_INLINE_REFS_FLAG]: ['#'],
        },
        baz: {
          type: 'object',
          properties: {
            foo: null as any,
            baz: null as any,
          },
          description: 'baz override',
          [TEST_INLINE_REFS_FLAG]: ['#'],
        },
      },
      [TEST_INLINE_REFS_FLAG]: ['#'],
    }
    expected.properties.foo.properties.foo = expected.properties.foo
    expected.properties.foo.properties.baz = expected.properties.baz
    expected.properties.baz.properties.foo = expected.properties.foo
    expected.properties.baz.properties.baz = expected.properties.baz
    expect(mergedData).toEqual(expected)
  })

  it('should support cross cycle refs in allOf', () => {
    const data =
      {
        type: 'object',
        properties: {
          foo: {
            allOf: [
              {
                properties: {
                  test: {
                    type: 'string',//strange type cause have properties
                  },
                },
                description: '1-st parent',
              },
              {
                $ref: '#/properties/baz',
              },
            ],
          },
          baz: {
            properties: {
              test: {
                $ref: '#/properties/foo',
              },
            },
          },
        },
      }

    const result = normalize(data, { inlineRefsFlag: TEST_INLINE_REFS_FLAG })

    const expected =
      {
        type: 'object',
        properties: {
          foo: {
            properties: {
              test: {
                type: 'string',
                properties: {
                  test: null as any,//#foo(overridden)/,
                },
                description: '1-st parent',
                [TEST_INLINE_REFS_FLAG]: expect.toIncludeSameMembers(['#/properties/baz','#/properties/foo']),
              },
            },
            description: '1-st parent',
            [TEST_INLINE_REFS_FLAG]: expect.toIncludeSameMembers(['#/properties/baz','#/properties/foo']),
          },
          baz: {
            [TEST_INLINE_REFS_FLAG]: ['#/properties/baz'],
            properties: {
              test: null as any,//#foo
            },
          },
        },
      }
    expected.properties.foo.properties.test.properties.test = expected.properties.foo.properties.test
    expected.properties.baz.properties.test = expected.properties.foo
    expect(result).toEqual(expected)
  })

  it('should handle circular refs in GraphAPI properly', () => {
    const source = {
      graphapi: '0.1.2',
      mutations: {
        abortQuote: {
          description: 'The operation allows aborting an existing quote',
          args: {
            type: 'object',
            required: ['id'],
            properties: {
              id: {
                type: 'string',
                format: 'ID',
                description: 'Unique quote id.',
              },
            },
          },
          $ref: '#/components/objects/Quote',
          nullable: true,
        },
      },
      components: {
        objects: {
          Quote: {
            title: 'Quote',
            description: 'The entity that represents common information about a customers request.',
            type: 'object',
            properties: {
              baselineQuote: {
                $ref: '#/components/objects/Quote',
                description: 'Baseline Quote resource',
              },
            },
          },
        },
      },
    }

    const mergedSource = normalize(
      source,
      {
        source: source,
      },
    )
    const expected = {
      graphapi: '0.1.2',
      mutations: /*1*/ {
        abortQuote: /*2*/ {
          title: 'Quote',
          description: 'The operation allows aborting an existing quote',
          type: 'object',
          properties: /*3*/ {
            baselineQuote: /*4*/ {
              title: 'Quote',
              description: 'Baseline Quote resource',
              type: 'object',
              properties: /*5*/ {
                baselineQuote: null as any,//#4/
              },
            },
          },
          args: /*6*/ {
            type: 'object',
            required: /*7*/ [
              'id',
            ],
            properties: /*8*/ {
              id: /*9*/ {
                type: 'string',
                format: 'ID',
                description: 'Unique quote id.',
              },
            },
          },
          nullable: true,
        },
      },
      components: /*10*/ {
        objects: /*11*/ {
          Quote: /*12*/ {
            title: 'Quote',
            description: 'The entity that represents common information about a customers request.',
            type: 'object',
            properties: /*13*/ {
              baselineQuote: null as any,//#4/
            },
          },
        },
      },
    }
    expected.mutations.abortQuote.properties.baselineQuote.properties.baselineQuote = expected.mutations.abortQuote.properties.baselineQuote
    expected.components.objects.Quote.properties.baselineQuote = expected.mutations.abortQuote.properties.baselineQuote
    expect(mergedSource).toBeTruthy()
  })

  it('self cycled', () => {
    const data =
      {
        type: 'object',
        properties: {
          cycle: {
            allOf: [
              {
                properties: {
                  test: {
                    type: 'object',
                  },
                },
                description: '1-st parent',
              },
              {
                $ref: '#/properties/cycle',
              },
            ],
          },
        },
      }

    const result = normalize(data, { inlineRefsFlag: TEST_INLINE_REFS_FLAG })
    const expected =
      {
        type: 'object',
        properties: {
          cycle: {
            properties: {
              test: {
                type: 'object',
              },
            },
            description: '1-st parent',
            [TEST_INLINE_REFS_FLAG]: ['#/properties/cycle']
          },
        },
      }
    expect(result).toEqual(expected)
  })

  it('deferred cycle', () => {
    const data =
      {
        openapi: '3.0.2',
        components: {
          schemas: {
            Root: {
              $ref: '#/components/schemas/Jump1',
            },
            Jump1: {
              $ref: '#/components/schemas/Jump2',
            },
            Jump2: {
              type: 'object',
              properties: {
                item: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/Jump2',
                  },
                },
              },
            },
          },
        },
      }

    const result = normalize(data)
    const expected =
      {
        openapi: '3.0.2',
        components: {
          schemas: {
            Root: /*3*/ {
              type: 'object',
              properties: {
                item: {
                  type: 'array',
                  items: null as any,//#3/,
                },
              },
            },
            Jump1: null as any,//#3/,
            Jump2: null as any,//#3/,
          },
        },
      }
    expected.components.schemas.Root.properties.item.items = expected.components.schemas.Root
    expected.components.schemas.Jump1 = expected.components.schemas.Root
    expected.components.schemas.Jump2 = expected.components.schemas.Root
    expect(result).toEqual(expected)
  })

  it('dead triangle', () => {
    const data =
      {
        openapi: '3.0.2',
        components: {
          schemas: {
            Root: {
              $ref: '#/components/schemas/Jump1',
            },
            Jump1: {
              $ref: '#/components/schemas/Jump2',
            },
            Jump2: {
              $ref: '#/components/schemas/Root',
            },
          },
        },
      }

    let errorCount = 0
    const result = normalize(data, { onRefResolveError: () => errorCount++ })
    expect(result).toEqual(data)
    expect(result).not.toBe(data)
    expect(errorCount).toBe(3)
  })
})
