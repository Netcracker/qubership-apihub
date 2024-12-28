import { defineOriginsAndResolveRef } from '../../src/define-origins-and-resolve-ref'
import { pathItemToFullPath, stringifyCyclicJso, stringifyCyclicJsoWithOrigins } from '../../src'
import { commonOriginsCheck, TEST_ORIGINS_FLAG, TEST_SYNTHETIC_TITLE_FLAG } from '../helpers'

describe('ref chain by several pure refs', () => {
  const source = {
    paths: {
      get: {
        schema: {
          type: 'array',
          items: {
            $ref: '#/components/schemas/Item',
          },
        },
      },
    },
    components: {
      schemas: {
        Item: {
          $ref: '#/components/schemas/Item1',
        },
        Item1: {
          type: 'string',
        },
      },
    },
  }
  it('resolve refs', () => {
    const expected = {
      paths: {
        get: {
          schema: {
            type: 'array',
            items: null as any,
          },
        },
      },
      components: {
        schemas: {
          Item: null as any,
          Item1: {
            type: 'string',
          },
        },
      },
    }
    expected.components.schemas.Item = expected.components.schemas.Item1
    expected.paths.get.schema.items = expected.components.schemas.Item1
    const result: any = defineOriginsAndResolveRef(source)

    expect(result).toEqual(expected)

    // check same resolved-ref instance
    expect(result.components.schemas.Item1).toBe(result.paths.get.schema.items)
    expect(result.components.schemas.Item1).toBe(result.components.schemas.Item)
  })

  it('origin chains', () => {
      const result: any = defineOriginsAndResolveRef(source, { originsFlag: TEST_ORIGINS_FLAG })
      commonOriginsCheck(result, { source })

      // items, Item and Item1 have specific origins
      expect(pathItemToFullPath(result.paths.get.schema[TEST_ORIGINS_FLAG].items[0])).toEqual(['paths', 'get', 'schema', 'items'])
      expect(pathItemToFullPath(result.components.schemas[TEST_ORIGINS_FLAG].Item[0])).toEqual(['components', 'schemas', 'Item'])
      expect(pathItemToFullPath(result.components.schemas[TEST_ORIGINS_FLAG].Item1[0])).toEqual(['components', 'schemas', 'Item1'])
      // field 'type' under Item1, Item and items should has same origin instance
      expect(pathItemToFullPath(result.paths.get.schema.items[TEST_ORIGINS_FLAG].type[0])).toEqual(['components', 'schemas', 'Item1', 'type'])
      expect(result.paths.get.schema.items[TEST_ORIGINS_FLAG].type[0]).toBe(result.components.schemas.Item[TEST_ORIGINS_FLAG].type[0])
      expect(result.paths.get.schema.items[TEST_ORIGINS_FLAG].type[0]).toBe(result.components.schemas.Item1[TEST_ORIGINS_FLAG].type[0])
    },
  )
})

describe('ref chain that not yet resolved.simple', () => {
  const source = {
    openapi: '3.1.0',
    components: {
      schemas: {
        main: {
          $ref: '#/components/schemas/jump1/properties/jump3/properties/end',
        },
        jump1: {
          $ref: '#/components/schemas/jump2',
        },
        jump2: {
          properties: {
            jump3: {
              $ref: '#/components/schemas/jump3',
            },
          },
        },
        jump3: {
          properties: {
            end: {
              type: 'string',
            },
          },
        },
        summary: {
          items: [
            { $ref: '#/components/schemas/main' },
            { $ref: '#/components/schemas/jump1' },
            { $ref: '#/components/schemas/jump2' },
            { $ref: '#/components/schemas/jump3' },
          ],
        },
      },
    },
  }

  it('resolve ref', () => {
    const expected = {
      openapi: '3.1.0',
      components: {
        schemas: {
          main: /*3*/ {
            type: 'string',
          },
          jump1: /*4*/ {
            properties: {
              jump3: /*6*/ {
                properties: {
                  end: null as any /*#3*/,
                },
              },
            },
          },
          jump2: null as any/*#4*/,
          jump3: null as any/*#6*/,
          summary: {
            items: [/*#3*//*#4*//*#4*//*#6*/] as any[],
          },
        },
      },
    }
    expected.components.schemas.jump1.properties.jump3.properties.end = expected.components.schemas.main
    expected.components.schemas.jump2 = expected.components.schemas.jump1
    expected.components.schemas.jump3 = expected.components.schemas.jump1.properties.jump3
    expected.components.schemas.summary.items = [
      expected.components.schemas.main,
      expected.components.schemas.jump1,
      expected.components.schemas.jump1,
      expected.components.schemas.jump1.properties.jump3,
    ]
    const result = defineOriginsAndResolveRef(source)
    expect(result).toEqual(expected)
    //todo add references check
  })

  it('origin chains', () => {
    const result: any = defineOriginsAndResolveRef(source, { originsFlag: TEST_ORIGINS_FLAG })
    commonOriginsCheck(result, { source })
    expectThreeJumpSimpleOrigins(result)

    //check summary
    const { jump1, jump3, summary } = result.components.schemas
    expect(jump3[TEST_ORIGINS_FLAG].properties[0]).toBe(summary.items[1].properties.jump3[TEST_ORIGINS_FLAG].properties[0])
    expect(jump3[TEST_ORIGINS_FLAG].properties[0]).toBe(summary.items[2].properties.jump3[TEST_ORIGINS_FLAG].properties[0])

    expect(jump1[TEST_ORIGINS_FLAG].properties[0]).toBe(summary.items[1][TEST_ORIGINS_FLAG].properties[0])
    expect(jump1[TEST_ORIGINS_FLAG].properties[0]).toBe(summary.items[2][TEST_ORIGINS_FLAG].properties[0])

    const typeOriginInstance = jump3.properties.end[TEST_ORIGINS_FLAG].type[0]
    expect(summary.items[0][TEST_ORIGINS_FLAG].type[0]).toBe(typeOriginInstance)
    expect(summary.items[1].properties.jump3.properties.end[TEST_ORIGINS_FLAG].type[0]).toBe(typeOriginInstance)
    expect(summary.items[2].properties.jump3.properties.end[TEST_ORIGINS_FLAG].type[0]).toBe(typeOriginInstance)
    expect(summary.items[3].properties.end[TEST_ORIGINS_FLAG].type[0]).toBe(typeOriginInstance)
  })

  it('origins together with synthetic title', () => {
    const result = defineOriginsAndResolveRef(source, {
      originsFlag: TEST_ORIGINS_FLAG,
      syntheticTitleFlag: TEST_SYNTHETIC_TITLE_FLAG,
    }) as any

    commonOriginsCheck(result, { source })
    expect(result).toHaveProperty(['components', 'schemas', 'main', 'allOf', 1, 'type'], 'string')
    expect(result).toHaveProperty(['components', 'schemas', 'main', 'allOf', 0, TEST_ORIGINS_FLAG, 'title', 0, 'value'], 'end')
    expect(result).toHaveProperty(['components', 'schemas', 'main', 'allOf', 0, TEST_ORIGINS_FLAG, 'title', 0, 'parent', 'value'], 'properties')
    expect(result.components.schemas.main.allOf[0][TEST_ORIGINS_FLAG].title[0]).toBe(result.components.schemas.jump3.properties[TEST_ORIGINS_FLAG]['end'][0])
    expect(result).toHaveProperty(['components', 'schemas', 'summary', 'items', 2, 'allOf', TEST_ORIGINS_FLAG, 0, 0, 'value'], '$ref')
    expect(result).toHaveProperty(['components', 'schemas', 'summary', 'items', 2, 'allOf', TEST_ORIGINS_FLAG, 0, 0, 'parent', 'value'], 2)
    expect(result).toHaveProperty(['components', 'schemas', 'summary', 'items', 3, 'allOf', TEST_ORIGINS_FLAG, 0, 0, 'value'], '$ref')
    expect(result).toHaveProperty(['components', 'schemas', 'summary', 'items', 3, 'allOf', TEST_ORIGINS_FLAG, 0, 0, 'parent', 'value'], 3)
  })
})

describe('ref chain that already yet resolved.simple', () => {
  const source = {
    openapi: '3.1.0',
    components: {
      schemas: {
        summary: {
          items: [
            { $ref: '#/components/schemas/jump3' },
            { $ref: '#/components/schemas/jump2' },
            { $ref: '#/components/schemas/jump1' },
            { $ref: '#/components/schemas/main' },
          ],
        },
        main: {
          $ref: '#/components/schemas/jump1/properties/jump3/properties/end',
        },
        jump1: {
          $ref: '#/components/schemas/jump2',
        },
        jump2: {
          properties: {
            jump3: {
              $ref: '#/components/schemas/jump3',
            },
          },
        },
        jump3: {
          properties: {
            end: {
              type: 'string',
            },
          },
        },
      },
    },
  }
  it('resolve ref', () => {
    const expected = {
      openapi: '3.1.0',
      components: {
        schemas: {
          summary: {
            items: [/*#6*//*#4*//*#4*//*#3*/] as any[],
          },
          main: /*3*/ {
            type: 'string',
          },
          jump1: /*4*/ {
            properties: {
              jump3: /*6*/ {
                properties: {
                  end: null as any /*#3*/,
                },
              },
            },
          },
          jump2: null as any/*#4*/,
          jump3: null as any/*#6*/,
        },
      },
    }
    expected.components.schemas.jump1.properties.jump3.properties.end = expected.components.schemas.main
    expected.components.schemas.jump2 = expected.components.schemas.jump1
    expected.components.schemas.jump3 = expected.components.schemas.jump1.properties.jump3
    expected.components.schemas.summary.items = [
      expected.components.schemas.jump1.properties.jump3,
      expected.components.schemas.jump1,
      expected.components.schemas.jump1,
      expected.components.schemas.main,
    ]
    const result = defineOriginsAndResolveRef(source)
    expect(result).toEqual(expected)
  })

  it('origin chains', () => {
    const result: any = defineOriginsAndResolveRef(source, { originsFlag: TEST_ORIGINS_FLAG })
    commonOriginsCheck(result, { source })

    expectThreeJumpSimpleOrigins(result)
    //check summary
    const { jump1, jump3, summary } = result.components.schemas
    expect(jump3[TEST_ORIGINS_FLAG].properties[0]).toBe(summary.items[1].properties.jump3[TEST_ORIGINS_FLAG].properties[0])
    expect(jump3[TEST_ORIGINS_FLAG].properties[0]).toBe(summary.items[2].properties.jump3[TEST_ORIGINS_FLAG].properties[0])

    expect(jump1[TEST_ORIGINS_FLAG].properties[0]).toBe(summary.items[1][TEST_ORIGINS_FLAG].properties[0])
    expect(jump1[TEST_ORIGINS_FLAG].properties[0]).toBe(summary.items[2][TEST_ORIGINS_FLAG].properties[0])

    const typeOriginInstance = jump3.properties.end[TEST_ORIGINS_FLAG].type[0]
    expect(summary.items[3][TEST_ORIGINS_FLAG].type[0]).toBe(typeOriginInstance)
    expect(summary.items[1].properties.jump3.properties.end[TEST_ORIGINS_FLAG].type[0]).toBe(typeOriginInstance)
    expect(summary.items[2].properties.jump3.properties.end[TEST_ORIGINS_FLAG].type[0]).toBe(typeOriginInstance)
    expect(summary.items[0].properties.end[TEST_ORIGINS_FLAG].type[0]).toBe(typeOriginInstance)
  })
})

describe('resolve ref chain that contains resolved refs.simple', () => {
  const source = {
    openapi: '3.1.0',
    components: {
      schemas: {
        jump3: {
          properties: {
            end: {
              type: 'string',
            },
          },
        },
        jump2: {
          properties: {
            jump3: {
              $ref: '#/components/schemas/jump3',
            },
          },
        },
        jump1: {
          $ref: '#/components/schemas/jump2',
        },
        main: {
          $ref: '#/components/schemas/jump1/properties/jump3/properties/end',
        },
        summary: {
          items: [
            { $ref: '#/components/schemas/jump3' },
            { $ref: '#/components/schemas/jump2' },
            { $ref: '#/components/schemas/jump1' },
            { $ref: '#/components/schemas/main' },
          ],
        },
      },
    },
  }
  it('resolve ref', () => {
    const expected = {
      openapi: '3.1.0',
      components: {
        schemas: {
          summary: {
            items: [/*#3*//*#4*//*#4*//*#6*/] as any[],
          },
          main: /*3*/ {
            type: 'string',
          },
          jump1: /*4*/ {
            properties: {
              jump3: /*6*/ {
                properties: {
                  end: null as any /*#3*/,
                },
              },
            },
          },
          jump2: null as any/*#4*/,
          jump3: null as any/*#6*/,
        },
      },
    }
    expected.components.schemas.jump1.properties.jump3.properties.end = expected.components.schemas.main
    expected.components.schemas.jump2 = expected.components.schemas.jump1
    expected.components.schemas.jump3 = expected.components.schemas.jump1.properties.jump3
    expected.components.schemas.summary.items = [
      expected.components.schemas.jump1.properties.jump3,
      expected.components.schemas.jump1,
      expected.components.schemas.jump1,
      expected.components.schemas.main,
    ]
    const result = defineOriginsAndResolveRef(source)
    expect(result).toEqual(expected)
  })

  it('origin chains', () => {
    const result: any = defineOriginsAndResolveRef(source, { originsFlag: TEST_ORIGINS_FLAG })
    commonOriginsCheck(result, { source })

    expectThreeJumpSimpleOrigins(result)
    //check summary
    const { jump1, jump3, summary } = result.components.schemas
    expect(jump3[TEST_ORIGINS_FLAG].properties[0]).toBe(summary.items[1].properties.jump3[TEST_ORIGINS_FLAG].properties[0])
    expect(jump3[TEST_ORIGINS_FLAG].properties[0]).toBe(summary.items[2].properties.jump3[TEST_ORIGINS_FLAG].properties[0])

    expect(jump1[TEST_ORIGINS_FLAG].properties[0]).toBe(summary.items[1][TEST_ORIGINS_FLAG].properties[0])
    expect(jump1[TEST_ORIGINS_FLAG].properties[0]).toBe(summary.items[2][TEST_ORIGINS_FLAG].properties[0])

    const typeOriginInstance = jump3.properties.end[TEST_ORIGINS_FLAG].type[0]
    expect(summary.items[3][TEST_ORIGINS_FLAG].type[0]).toBe(typeOriginInstance)
    expect(summary.items[1].properties.jump3.properties.end[TEST_ORIGINS_FLAG].type[0]).toBe(typeOriginInstance)
    expect(summary.items[2].properties.jump3.properties.end[TEST_ORIGINS_FLAG].type[0]).toBe(typeOriginInstance)
    expect(summary.items[0].properties.end[TEST_ORIGINS_FLAG].type[0]).toBe(typeOriginInstance)
  })
})

describe('complex ref with sibling with ref', () => {
  const source = {
    openapi: '3.1.0',
    components: {
      schemas: {
        foo: {
          description: 'Original',
          type: 'object',
        },
        bar: {
          $ref: '#/components/schemas/foo',
          description: 'L1',
          properties: {
            bar: {
              $ref: '#/components/schemas/foo',
              description: 'L2',
              properties: {
                bar: {
                  $ref: '#/components/schemas/bar',
                  description: 'L3',
                },
              },
            },
          },
        },
        summary: {
          items: [
            { $ref: '#/components/schemas/foo' },
            { $ref: '#/components/schemas/bar' },
          ],
        },
      },
    },
  }

  it('resolve ref', () => {
    const expected = {
      openapi: '3.1.0',
      components: {
        schemas: {
          foo: /*3*/ {
            description: 'Original',
            type: 'object',
          },
          bar: /*4*/ {
            allOf: [
              null as any /*#3*/,
              {
                description: 'L1',
                properties: {
                  bar: {
                    allOf: [
                      null as any /*#3*/,
                      {
                        description: 'L2',
                        properties: {
                          bar: {
                            allOf: [
                              null as any /*#4*/,
                              {
                                description: 'L3',
                              },
                            ],
                          },
                        },
                      },
                    ],
                  },
                },
              },
            ],
          },
          summary: {
            items: [
              null as any/*#3*/,
              null as any/*#4*/,
            ],
          },
        },
      },
    }
    expected.components.schemas.bar.allOf[0] = expected.components.schemas.foo
    expected.components.schemas.bar.allOf[1].properties.bar.allOf[0] = expected.components.schemas.foo
    expected.components.schemas.bar.allOf[1].properties.bar.allOf[1].properties.bar.allOf[0] = expected.components.schemas.bar
    expected.components.schemas.summary.items[0] = expected.components.schemas.foo
    expected.components.schemas.summary.items[1] = expected.components.schemas.bar

    const result = defineOriginsAndResolveRef(source)
    expect(result).toEqual(expected)
  })

  it('origin chains', () => {
    const result: any = defineOriginsAndResolveRef(source, { originsFlag: TEST_ORIGINS_FLAG })
    commonOriginsCheck(result, { source })
    expectComplexRefWithSiblingOrigins(result)
  })
})

describe('complex ref with sibling with ref. deferred', () => {
  const source = {
    openapi: '3.1.0',
    components: {
      schemas: {
        bar: {
          $ref: '#/components/schemas/foo',
          description: 'L1',
          properties: {
            bar: {
              $ref: '#/components/schemas/foo',
              description: 'L2',
              properties: {
                bar: {
                  $ref: '#/components/schemas/bar',
                  description: 'L3',
                },
              },
            },
          },
        },
        foo: {
          description: 'Original',
          type: 'object',
        },
        summary: {
          items: [
            { $ref: '#/components/schemas/foo' },
            { $ref: '#/components/schemas/bar' },
          ],
        },
      },
    },
  }

  it('resolve ref', () => {
    const expected = {
      openapi: '3.1.0',
      components: {
        schemas: {
          foo: /*3*/ {
            description: 'Original',
            type: 'object',
          },
          bar: /*4*/ {
            allOf: [
              null as any /*#3*/,
              {
                description: 'L1',
                properties: {
                  bar: {
                    allOf: [
                      null as any /*#3*/,
                      {
                        description: 'L2',
                        properties: {
                          bar: {
                            allOf: [
                              null as any /*#4*/,
                              {
                                description: 'L3',
                              },
                            ],
                          },
                        },
                      },
                    ],
                  },
                },
              },
            ],
          },
          summary: {
            items: [
              null as any/*#3*/,
              null as any/*#4*/,
            ],
          },
        },
      },
    }
    expected.components.schemas.bar.allOf[0] = expected.components.schemas.foo
    expected.components.schemas.bar.allOf[1].properties.bar.allOf[0] = expected.components.schemas.foo
    expected.components.schemas.bar.allOf[1].properties.bar.allOf[1].properties.bar.allOf[0] = expected.components.schemas.bar
    expected.components.schemas.summary.items[0] = expected.components.schemas.foo
    expected.components.schemas.summary.items[1] = expected.components.schemas.bar

    const result = defineOriginsAndResolveRef(source)
    expect(result).toEqual(expected)
  })

  it('origin chains', () => {
    const result: any = defineOriginsAndResolveRef(source, { originsFlag: TEST_ORIGINS_FLAG })
    commonOriginsCheck(result, { source })
    expectComplexRefWithSiblingOrigins(result)
  })
})

//todo sibling not allowed in ref(mergeRefSibling)
//todo inline symbol
//todo inline title

xit('resolve ref chain that not yet resolved.complex', () => {
  const data = {
    openapi: '3.1.0',
    components: {
      schemas: {
        main: {
          $ref: '#/components/schemas/jump1/properties/jump3/properties/end',/*or #/components/schemas/jump1/allOf/0/properties/jump3/properties/end?*/
        },
        jump1: {
          allOf: [
            {
              $ref: '#/components/schemas/jump2',
            },
            {
              description: 'merged object allOf',
            },
          ],
        },
        jump2: {
          properties: {
            jump3: {
              $ref: '#/components/schemas/jump3',
              description: 'merged object simple',
            },
          },
        },
        jump3: {
          properties: {
            end: {
              type: 'string',
            },
          },
        },
      },
      summary: {
        items: [
          { $ref: '#/components/schemas/main' },
          { $ref: '#/components/schemas/jump1' },
          { $ref: '#/components/schemas/jump2' },
          { $ref: '#/components/schemas/jump3' },
        ],
      },
    },
  }
  defineOriginsAndResolveRef(data)//need to resolve allOf during path resolve
  //todo add expected when read specification and found real life sample
})

function expectThreeJumpSimpleOrigins(result: any): void {
  // check common structure
  expect(result.components.schemas[TEST_ORIGINS_FLAG]).toEqual({
    main: expect.any(Array),
    jump1: expect.any(Array),
    jump2: expect.any(Array),
    jump3: expect.any(Array),
    summary: expect.any(Array),
  })
  expect(result.components.schemas.main[TEST_ORIGINS_FLAG]).toEqual({
    type: expect.any(Array),
  })
  expect(result.components.schemas.jump1[TEST_ORIGINS_FLAG]).toEqual({
    properties: expect.any(Array),
  })
  expect(result.components.schemas.summary.items[TEST_ORIGINS_FLAG]).toEqual(expect.objectContaining({
    0: expect.any(Array),
    1: expect.any(Array),
    2: expect.any(Array),
    3: expect.any(Array),
  }))
  // all nodes with refs have specific origins
  expect(pathItemToFullPath(result.components.schemas[TEST_ORIGINS_FLAG].main[0])).toEqual(['components', 'schemas', 'main'])
  expect(pathItemToFullPath(result.components.schemas[TEST_ORIGINS_FLAG].jump1[0])).toEqual(['components', 'schemas', 'jump1'])
  expect(pathItemToFullPath(result.components.schemas[TEST_ORIGINS_FLAG].jump2[0])).toEqual(['components', 'schemas', 'jump2'])
  expect(pathItemToFullPath(result.components.schemas[TEST_ORIGINS_FLAG].jump3[0])).toEqual(['components', 'schemas', 'jump3'])

  expect(pathItemToFullPath(result.components.schemas.summary.items[TEST_ORIGINS_FLAG][0][0])).toEqual(['components', 'schemas', 'summary', 'items', 0])
  expect(pathItemToFullPath(result.components.schemas.summary.items[TEST_ORIGINS_FLAG][1][0])).toEqual(['components', 'schemas', 'summary', 'items', 1])
  expect(pathItemToFullPath(result.components.schemas.summary.items[TEST_ORIGINS_FLAG][2][0])).toEqual(['components', 'schemas', 'summary', 'items', 2])
  expect(pathItemToFullPath(result.components.schemas.summary.items[TEST_ORIGINS_FLAG][3][0])).toEqual(['components', 'schemas', 'summary', 'items', 3])

  const { main, jump1, jump2, jump3, summary } = result.components.schemas
  // 'properties' origins under jump1 and jump2 are same origin instance
  expect(pathItemToFullPath(jump1[TEST_ORIGINS_FLAG].properties[0])).toEqual(['components', 'schemas', 'jump2', 'properties'])
  expect(jump1[TEST_ORIGINS_FLAG].properties[0]).toBe(jump2[TEST_ORIGINS_FLAG].properties[0])
  // 'properties' origins under jump1 and jump2 and jump3 are same origin instance
  expect(pathItemToFullPath(jump3[TEST_ORIGINS_FLAG].properties[0])).toEqual(['components', 'schemas', 'jump3', 'properties'])
  expect(jump3[TEST_ORIGINS_FLAG].properties[0]).toBe(jump1.properties.jump3[TEST_ORIGINS_FLAG].properties[0])
  expect(jump3[TEST_ORIGINS_FLAG].properties[0]).toBe(jump2.properties.jump3[TEST_ORIGINS_FLAG].properties[0])

  // origin of 'type' references to jump3 and it is single instance everywhere
  const typeOriginInstance = jump3.properties.end[TEST_ORIGINS_FLAG].type[0]
  expect(pathItemToFullPath(typeOriginInstance)).toEqual(['components', 'schemas', 'jump3', 'properties', 'end', 'type'])
  expect(main[TEST_ORIGINS_FLAG].type[0]).toBe(typeOriginInstance)
  expect(jump1.properties.jump3.properties.end[TEST_ORIGINS_FLAG].type[0]).toBe(typeOriginInstance)
  expect(jump2.properties.jump3.properties.end[TEST_ORIGINS_FLAG].type[0]).toBe(typeOriginInstance)
}

function expectComplexRefWithSiblingOrigins(result: any): void {
  // check common structure
  expect(result.components.schemas[TEST_ORIGINS_FLAG]).toEqual({
    foo: expect.any(Array),
    bar: expect.any(Array),
    summary: expect.any(Array),
  })
  expect(result.components.schemas.summary.items[TEST_ORIGINS_FLAG]).toEqual({
    0: expect.any(Array),
    1: expect.any(Array),
  })
  expect(pathItemToFullPath(result.components.schemas[TEST_ORIGINS_FLAG].bar[0])).toEqual(['components', 'schemas', 'bar'])
  expect(pathItemToFullPath(result.components.schemas[TEST_ORIGINS_FLAG].foo[0])).toEqual(['components', 'schemas', 'foo'])

  const { foo, bar, summary } = result.components.schemas
  const fooTypeOrigin = foo[TEST_ORIGINS_FLAG].type[0]
  expect(pathItemToFullPath(fooTypeOrigin)).toEqual(['components', 'schemas', 'foo', 'type'])
  expect(bar.allOf[0][TEST_ORIGINS_FLAG].type[0]).toBe(fooTypeOrigin)
  expect(bar.allOf[1].properties.bar.allOf[0][TEST_ORIGINS_FLAG].type[0]).toBe(fooTypeOrigin)
  expect(summary.items[0][TEST_ORIGINS_FLAG].type[0]).toBe(fooTypeOrigin)

  const descriptionL1Origin = bar.allOf[1][TEST_ORIGINS_FLAG].description[0]
  expect(pathItemToFullPath(descriptionL1Origin)).toEqual(['components', 'schemas', 'bar', 'description'])
  expect(pathItemToFullPath(bar.allOf[1].properties[TEST_ORIGINS_FLAG].bar[0])).toEqual(['components', 'schemas', 'bar', 'properties', 'bar'])
  const descriptionL2Origin = bar.allOf[1].properties.bar.allOf[1][TEST_ORIGINS_FLAG].description[0]
  expect(pathItemToFullPath(descriptionL2Origin)).toEqual(['components', 'schemas', 'bar', 'properties', 'bar', 'description'])
  expect(pathItemToFullPath(bar.allOf[1].properties.bar.allOf[1].properties[TEST_ORIGINS_FLAG].bar[0])).toEqual(['components', 'schemas', 'bar', 'properties', 'bar', 'properties', 'bar'])
  const descriptionL3Origin = bar.allOf[1].properties.bar.allOf[1].properties.bar.allOf[1][TEST_ORIGINS_FLAG].description[0]
  expect(pathItemToFullPath(descriptionL3Origin)).toEqual(['components', 'schemas', 'bar', 'properties', 'bar', 'properties', 'bar', 'description'])
  expect(bar.allOf[1].properties.bar.allOf[1].properties.bar.allOf[0].allOf[1][TEST_ORIGINS_FLAG].description[0]).toBe(descriptionL1Origin)
  expect(summary.items[1].allOf[0][TEST_ORIGINS_FLAG].type[0]).toBe(fooTypeOrigin)
  expect(summary.items[1].allOf[1][TEST_ORIGINS_FLAG].description[0]).toBe(descriptionL1Origin)
}
