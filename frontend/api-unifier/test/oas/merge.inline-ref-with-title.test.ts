import { normalize } from '../../src'
import { TEST_INLINE_REFS_FLAG, TEST_SYNTHETIC_TITLE_FLAG } from '../helpers'

describe('add title when inline ref', function () {
  it('when no title', function () {
    const result: any = normalize({
      type: 'object',
      properties: {
        man: {
          type: 'array',
          items: {
            $ref: '#/definitions/Human',
          },
        },
        women: {
          type: 'array',
          items: {
            $ref: '#/definitions/Human',
          },
        },
      },
    }, {
      syntheticTitleFlag: TEST_SYNTHETIC_TITLE_FLAG,
      inlineRefsFlag: TEST_INLINE_REFS_FLAG,
      source: {
        definitions: {
          Human: {
            type: 'object',
            properties: {
              age: {
                type: 'number',
              },
            },
          },
        },
      },
    })
    const expected = {
      type: 'object',
      properties: {
        man: {
          type: 'array',
          items: {
            title: 'Human',
            type: 'object',
            [TEST_INLINE_REFS_FLAG]: ['#/definitions/Human'],
            [TEST_SYNTHETIC_TITLE_FLAG]: true,
            properties: {
              age: {
                type: 'number',
              },
            },
          },
        },
        women: /*not the same ref*/{
          type: 'array',
          items: {
            title: 'Human',
            type: 'object',
            [TEST_INLINE_REFS_FLAG]: ['#/definitions/Human'],
            [TEST_SYNTHETIC_TITLE_FLAG]: true,
            properties: {
              age: {
                type: 'number',
              },
            },
          },
        },
      },
    }
    expect(result).toEqual(expected)
    expect(result.properties.man.items).toBe(result.properties.women.items)
  })

  it('when title already exists', function () {
    const result: any = normalize({
      type: 'object',
      properties: {
        man: {
          type: 'array',
          items: {
            $ref: '#/definitions/Human',
          },
        },
        women: {
          type: 'array',
          items: {
            $ref: '#/definitions/Human',
          },
        },
      },
    }, {
      syntheticTitleFlag: TEST_SYNTHETIC_TITLE_FLAG,
      inlineRefsFlag: TEST_INLINE_REFS_FLAG,
      source: {
        definitions: {
          Human: {
            title: 'Batman',
            type: 'object',
            properties: {
              age: {
                type: 'number',
              },
            },
          },
        },
      },
    })
    const expected = {
      type: 'object',
      properties: {
        man: {
          type: 'array',
          items: {
            title: 'Batman',
            type: 'object',
            [TEST_INLINE_REFS_FLAG]: ['#/definitions/Human'],
            properties: {
              age: {
                type: 'number',
              },
            },
          },
        },
        women: /*not the same ref*/{
          type: 'array',
          items: {
            title: 'Batman',
            type: 'object',
            [TEST_INLINE_REFS_FLAG]: ['#/definitions/Human'],
            properties: {
              age: {
                type: 'number',
              },
            },
          },
        },
      },
    }
    expect(result).toEqual(expected)
    expect(result.properties.man.items).toBe(result.properties.women.items)
  })

  it('when have override', function () {
    const result = normalize({
      openapi: '3.1.0',
      paths: {
        'humans': {
          get: {
            responses: {
              '200': {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        prp1: {
                          $ref: '#/components/schemas/Human',
                          title: 'Human 1',
                        },
                        prp2: {
                          $ref: '#/components/schemas/Human',
                          description: 'Description 1',
                        },
                        prp3: {
                          $ref: '#/components/schemas/Unknown',
                          title: 'Unknown 1',
                        },
                        prp4: {
                          $ref: '#/components/schemas/Unknown',
                          description: 'Description 1',
                        },
                        prp5: {
                          allOf: [
                            {
                              $ref: '#/components/schemas/Human',
                            },
                            {
                              title: 'Human 2',
                            },
                          ],
                        },
                        prp6: {
                          allOf: [
                            {
                              $ref: '#/components/schemas/Human',
                            },
                            {
                              description: 'Description 2',
                            },
                          ],
                        },
                        prp7: {
                          allOf: [
                            {
                              $ref: '#/components/schemas/Unknown',
                            },
                            {
                              title: 'Unknown 2',
                            },
                          ],
                        },
                        prp8: {
                          allOf: [
                            {
                              $ref: '#/components/schemas/Unknown',
                            },
                            {
                              description: 'Description 2',
                            },
                          ],
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          Human: {
            title: 'Batman',
            type: 'object',
            properties: {
              age: {
                type: 'number',
              },
            },
          },
          Unknown: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
              },
            },
          },
        },
      },
    }, {
      syntheticTitleFlag: TEST_SYNTHETIC_TITLE_FLAG,
      inlineRefsFlag: TEST_INLINE_REFS_FLAG,
    })
    const expected = {
      openapi: '3.1.0',
      paths: {
        humans: {
          get: {
            responses: {
              200: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        prp1: {
                          title: 'Human 1',
                          [TEST_INLINE_REFS_FLAG]: ['#/components/schemas/Human'],
                          type: 'object',
                          properties: {
                            age: {
                              type: 'number',
                            },
                          },
                        },
                        prp2: {
                          title: 'Batman',
                          [TEST_INLINE_REFS_FLAG]: ['#/components/schemas/Human'],
                          type: 'object',

                          properties: {
                            age: {
                              type: 'number',
                            },
                          },
                          description: 'Description 1',
                        },
                        prp3: {
                          [TEST_INLINE_REFS_FLAG]: ['#/components/schemas/Unknown'],
                          title: 'Unknown 1',
                          type: 'object',
                          properties: {
                            name: {
                              type: 'string',
                            },
                          },
                        },
                        prp4: {
                          title: 'Unknown',
                          [TEST_INLINE_REFS_FLAG]: ['#/components/schemas/Unknown'],
                          [TEST_SYNTHETIC_TITLE_FLAG]: true,
                          type: 'object',
                          properties: {
                            name: {
                              type: 'string',
                            },
                          },
                          description: 'Description 1',
                        },
                        prp5: {
                          title: 'Human 2',
                          [TEST_INLINE_REFS_FLAG]: ['#/components/schemas/Human'],
                          type: 'object',
                          properties: {
                            age: {
                              type: 'number',
                            },
                          },
                        },
                        prp6: {
                          title: 'Batman',
                          [TEST_INLINE_REFS_FLAG]: ['#/components/schemas/Human'],
                          type: 'object',
                          properties: {
                            age: {
                              type: 'number',
                            },
                          },
                          description: 'Description 2',
                        },
                        prp7: {
                          title: 'Unknown 2',
                          [TEST_INLINE_REFS_FLAG]: ['#/components/schemas/Unknown'],
                          type: 'object',
                          properties: {
                            name: {
                              type: 'string',
                            },
                          },
                        },
                        prp8: {
                          title: 'Unknown',
                          [TEST_INLINE_REFS_FLAG]: ['#/components/schemas/Unknown'],
                          [TEST_SYNTHETIC_TITLE_FLAG]: true,
                          type: 'object',
                          properties: {
                            name: {
                              type: 'string',
                            },
                          },
                          description: 'Description 2',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          Human: {
            title: 'Batman',
            [TEST_INLINE_REFS_FLAG]: ['#/components/schemas/Human'],
            type: 'object',
            properties: {
              age: {
                type: 'number',
              },
            },
          },
          Unknown: {
            type: 'object',
            [TEST_INLINE_REFS_FLAG]: ['#/components/schemas/Unknown'],
            properties: {
              name: {
                type: 'string',
              },
            },
          },
        },
      },
    }
    expect(result).toEqual(expected)
  })

  it('synthetic ref', () => {
    const data =
    {
      type: 'object',
      properties: {
        foo: {
          allOf: [
            {
              properties: {
                test: {
                  type: 'object',
                },
              },
              description: 'override',
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

    const result = normalize(data, {
      syntheticTitleFlag: TEST_SYNTHETIC_TITLE_FLAG,
      inlineRefsFlag: TEST_INLINE_REFS_FLAG,
    })
    const expected =
    {
      type: 'object',
      properties: {
        foo: {
          [TEST_INLINE_REFS_FLAG]: expect.toIncludeSameMembers(['#/properties/foo','#/properties/baz']),
          [TEST_SYNTHETIC_TITLE_FLAG]: true,
          properties: {
            test: {
              type: 'object',
              properties: {
                test: null as any /*ref*/,
              },
              description: 'override',
              title: 'baz',
              [TEST_INLINE_REFS_FLAG]: expect.toIncludeSameMembers(['#/properties/foo','#/properties/baz']),
              [TEST_SYNTHETIC_TITLE_FLAG]: true,
            },
          },
          description: 'override',
          title: 'baz',
        },
        baz: {
          [TEST_INLINE_REFS_FLAG]: ['#/properties/baz'],
          properties: {
            test: {
              title: 'baz',
              properties: {
                test: null as any /*ref*/,
              },
              description: 'override',
              [TEST_INLINE_REFS_FLAG]: expect.toIncludeSameMembers(['#/properties/foo','#/properties/baz']),
              [TEST_SYNTHETIC_TITLE_FLAG]: true,
            },
          },
        },
      },
    }
    expected.properties.foo.properties.test.properties.test = expected.properties.foo.properties.test
    expected.properties.baz.properties.test.properties.test = expected.properties.foo.properties.test
    expect(result).toEqual(expected)
  })

  it('ref chain', () => {
    const data =
    {
      items: {
        $ref: '#/definitions/level1',
      },
      definitions: {
        level1: {
          $ref: '#/definitions/level2',
        },
        level2: {
          allOf: [
            {
              $ref: '#/definitions/level3',
            },
            {
              allOf: [
                {
                  title: 'Not overridden',
                },
                {
                  title: 'Overridden',
                },
              ],
            },
          ],
        },
        level3: {
          $ref: '#/definitions/level4',
        },
        level4: {
          type: 'string',
          title: 'Original',
        },
      },
    }

    const result = normalize(data, {
      syntheticTitleFlag: TEST_SYNTHETIC_TITLE_FLAG,
      inlineRefsFlag: TEST_INLINE_REFS_FLAG,
    })
    const expected =
    {
      items: /*2*/{
        title: 'Overridden',
        type: 'string',
        [TEST_INLINE_REFS_FLAG]: expect.toIncludeSameMembers(['#/definitions/level1','#/definitions/level2','#/definitions/level3','#/definitions/level4']),
      },
      definitions: {
        level1: {
          title: 'Overridden',
          type: 'string',
          [TEST_INLINE_REFS_FLAG]: expect.toIncludeSameMembers(['#/definitions/level1','#/definitions/level2','#/definitions/level3','#/definitions/level4']),
        },
        level2: {
          title: 'Overridden',
          type: 'string',
          [TEST_INLINE_REFS_FLAG]: expect.toIncludeSameMembers(['#/definitions/level2','#/definitions/level3','#/definitions/level4']),
        },
        level3: {
          type: 'string',
          title: 'Original',
          [TEST_INLINE_REFS_FLAG]: expect.toIncludeSameMembers(['#/definitions/level3','#/definitions/level4']),
        },
        level4: {
          type: 'string',
          title: 'Original',
          [TEST_INLINE_REFS_FLAG]: ['#/definitions/level4'],
        },
      },
    }
    // expected.definitions.level1 = expected.items
    expect(result).toEqual(expected)
  })
})
