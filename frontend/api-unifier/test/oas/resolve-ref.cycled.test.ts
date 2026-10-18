import { defineOriginsAndResolveRef } from '../../src/define-origins-and-resolve-ref'
import { commonOriginsCheck, TEST_ORIGINS_FLAG } from '../helpers'
import { ChainItem, pathItemToFullPath } from '../../src'

describe('cycled refs. simple case', () => {
  const source = {
    openapi: '3.1.0',
    components: {
      schemas: {
        foo: {
          properties: {
            bar: {
              properties: {
                foo: {
                  $ref: '#/components/schemas/foo',
                },
              },
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
          foo: {
            properties: {
              bar: {
                properties: {
                  foo: null as any /*#foo*/,
                },
              },
            },
          },
        },
      },
    }
    expected.components.schemas.foo.properties.bar.properties.foo = expected.components.schemas.foo
    const result = defineOriginsAndResolveRef(source)

    expect(result).toEqual(expected)
  })

  it('origins chains', () => {
    const result: any = defineOriginsAndResolveRef(source, { originsFlag: TEST_ORIGINS_FLAG })
    commonOriginsCheck(result, { source })

    // check common structure
    expect(result.components.schemas[TEST_ORIGINS_FLAG]).toEqual({
      foo: expect.any(Array),
    })
    const firstFooOrigin = result.components.schemas[TEST_ORIGINS_FLAG].foo[0]
    expect(pathItemToFullPath(firstFooOrigin)).toEqual(['components', 'schemas', 'foo'])

    const { foo: firstFoo } = result.components.schemas
    const commonFooPropertiesOrigin = firstFoo[TEST_ORIGINS_FLAG].properties[0]
    expect(pathItemToFullPath(commonFooPropertiesOrigin)).toEqual(['components', 'schemas', 'foo', 'properties'])
    const secondFooOrigin = firstFoo.properties.bar.properties[TEST_ORIGINS_FLAG].foo[0]
    expect(pathItemToFullPath(secondFooOrigin)).toEqual(['components', 'schemas', 'foo', 'properties', 'bar', 'properties', 'foo'])
    expect(firstFoo.properties.bar.properties.foo[TEST_ORIGINS_FLAG].properties[0]).toBe(commonFooPropertiesOrigin)

    expect(commonFooPropertiesOrigin.parent).toBe(firstFooOrigin)
  })
})

describe('cycled refs. wide case', () => {
  const source = {
    openapi: '3.1.0',
    components: {
      schemas: {
        foo: {
          properties: {
            bar: {
              $ref: '#/components/schemas/bar',
            },
          },
        },
        bar: {
          properties: {
            foo: {
              $ref: '#/components/schemas/foo',
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
  it('resolve ref ', () => {
    const expected = {
      openapi: '3.1.0',
      components: {
        schemas: {
          foo: {
            properties: {
              bar: null as any /*#bar*/,
            },
          },
          bar: {
            properties: {
              foo: null as any /*#foo*/,
            },
          },
          summary: {
            items: [/*#foo*//*#bar*/] as any[],
          },
        },
      },
    }
    expected.components.schemas.foo.properties.bar = expected.components.schemas.bar
    expected.components.schemas.bar.properties.foo = expected.components.schemas.foo
    expected.components.schemas.summary.items = [
      expected.components.schemas.foo,
      expected.components.schemas.bar,
    ]
    const result = defineOriginsAndResolveRef(source)
    expect(result).toEqual(expected)
  })

  it('origin chains', () => {
    const result: any = defineOriginsAndResolveRef(source, { originsFlag: TEST_ORIGINS_FLAG })
    commonOriginsCheck(result, { source })

    // check common structure
    expect(result.components.schemas[TEST_ORIGINS_FLAG]).toEqual({
      foo: expect.any(Array<ChainItem>),
      bar: expect.any(Array<ChainItem>),
      summary: expect.any(Array<ChainItem>),
    })

    const { foo: firstFoo, bar: firstBar, summary } = result.components.schemas
    expect(pathItemToFullPath(result.components.schemas[TEST_ORIGINS_FLAG].foo[0])).toEqual(['components', 'schemas', 'foo'])
    expect(pathItemToFullPath(result.components.schemas[TEST_ORIGINS_FLAG].bar[0])).toEqual(['components', 'schemas', 'bar'])
    expect(pathItemToFullPath(result.components.schemas[TEST_ORIGINS_FLAG].summary[0])).toEqual(['components', 'schemas', 'summary'])

    //check common properties
    const fooPropertiesOrigin = firstFoo[TEST_ORIGINS_FLAG].properties[0]
    const barPropertiesOrigin = firstBar[TEST_ORIGINS_FLAG].properties[0]
    expect(pathItemToFullPath(fooPropertiesOrigin)).toEqual(['components', 'schemas', 'foo', 'properties'])
    expect(pathItemToFullPath(barPropertiesOrigin)).toEqual(['components', 'schemas', 'bar', 'properties'])

    expect(firstFoo.properties.bar.properties.foo[TEST_ORIGINS_FLAG].properties[0]).toBe(fooPropertiesOrigin)
    expect(firstBar.properties.foo[TEST_ORIGINS_FLAG].properties[0]).toBe(fooPropertiesOrigin)
    expect(summary.items[0][TEST_ORIGINS_FLAG].properties[0]).toBe(fooPropertiesOrigin)

    expect(firstBar.properties.foo.properties.bar[TEST_ORIGINS_FLAG].properties[0]).toBe(barPropertiesOrigin)
    expect(firstFoo.properties.bar[TEST_ORIGINS_FLAG].properties[0]).toBe(barPropertiesOrigin)
    expect(summary.items[1][TEST_ORIGINS_FLAG].properties[0]).toBe(barPropertiesOrigin)

    // second foo and second bar origins have specific origins
    expect(pathItemToFullPath(firstFoo.properties[TEST_ORIGINS_FLAG].bar[0])).toEqual(['components', 'schemas', 'foo', 'properties', 'bar'])
    expect(pathItemToFullPath(firstBar.properties[TEST_ORIGINS_FLAG].foo[0])).toEqual(['components', 'schemas', 'bar', 'properties', 'foo'])

    //parents of properties origins are first foo and bar origins
    expect(fooPropertiesOrigin.parent).toBe(result.components.schemas[TEST_ORIGINS_FLAG].foo[0])
    expect(barPropertiesOrigin.parent).toBe(result.components.schemas[TEST_ORIGINS_FLAG].bar[0])
  })
})

describe('resolve already cycled jso', () => {
  const source = {
    openapi: '3.1.0',
    components: {
      schemas: {
        foo: {
          properties: {
            bar: {
              $ref: '#/components/schemas/bar',
            },
          },
        },
        bar: {
          properties: {
            foo: null as any /*#foo*/,
          },
        },
      },
    },
  }
  source.components.schemas.bar.properties.foo = source.components.schemas.foo

  it('resolve ref', () => {
    const expected = {
      openapi: '3.1.0',
      components: {
        schemas: {
          foo: {
            properties: {
              bar: {
                properties: {
                  foo: null as any /*#foo*/,
                },
              },
            },
          },
          bar: null as any /*#bar*/,
        },
      },
    }
    expected.components.schemas.foo.properties.bar.properties.foo = expected.components.schemas.foo
    expected.components.schemas.bar = expected.components.schemas.foo.properties.bar
    const result = defineOriginsAndResolveRef(source)
    expect(result).toEqual(expected)
  })

  it('origin chains', () => {
    const result: any = defineOriginsAndResolveRef(source, { originsFlag: TEST_ORIGINS_FLAG })
    // we don't use commonOriginsCheck here because manually resolved Ref cannot have origin (commented check below)

    // check common structure
    expect(result.components.schemas[TEST_ORIGINS_FLAG]).toEqual({
      foo: expect.any(Array<ChainItem>),
      bar: expect.any(Array<ChainItem>),
    })

    const { foo: firstFoo, bar: firstBar } = result.components.schemas
    expect(pathItemToFullPath(result.components.schemas[TEST_ORIGINS_FLAG].foo[0])).toEqual(['components', 'schemas', 'foo'])
    expect(pathItemToFullPath(result.components.schemas[TEST_ORIGINS_FLAG].bar[0])).toEqual(['components', 'schemas', 'bar'])
    //check common properties
    const fooPropertiesOrigin = firstFoo[TEST_ORIGINS_FLAG].properties[0]
    const barPropertiesOrigin = firstBar[TEST_ORIGINS_FLAG].properties[0]
    expect(pathItemToFullPath(fooPropertiesOrigin)).toEqual(['components', 'schemas', 'foo', 'properties'])
    expect(pathItemToFullPath(barPropertiesOrigin)).toEqual(['components', 'schemas', 'bar', 'properties'])
    expect(firstFoo.properties.bar.properties.foo[TEST_ORIGINS_FLAG].properties[0]).toBe(fooPropertiesOrigin)
    expect(firstBar.properties.foo[TEST_ORIGINS_FLAG].properties[0]).toBe(fooPropertiesOrigin)

    expect(firstFoo.properties.bar[TEST_ORIGINS_FLAG].properties[0]).toBe(barPropertiesOrigin)
    expect(firstBar.properties.foo.properties.bar[TEST_ORIGINS_FLAG].properties[0]).toBe(barPropertiesOrigin)
    // second foo and second bar origins have specific origins
    expect(pathItemToFullPath(firstFoo.properties[TEST_ORIGINS_FLAG].bar[0])).toEqual(['components', 'schemas', 'foo', 'properties', 'bar'])
    // expect(firstBar.properties[TEST_ORIGINS_FLAG]).toHaveProperty('foo') // TODO IT IS POSSIBLE?
    // expect(pathItemToFullPath(firstBar.properties[TEST_ORIGINS_FLAG].foo[0])).toEqual(['components', 'schemas', 'bar', 'properties', 'foo'])
    //parent of common foo properties origin is first origin properties
    expect(fooPropertiesOrigin.parent).toBe(result.components.schemas[TEST_ORIGINS_FLAG].foo[0])
  })
})

describe('complex cycled ref', () => {
  const source = {
    openapi: '3.1.0',
    components: {
      schemas: {
        complexFoo: {
          $ref: '#/components/schemas/foo',
          description: 'Override',
        },
        foo: {
          description: 'Original',
          properties: {
            complexFoo: {
              $ref: '#/components/schemas/complexFoo',
              description: 'Override x2',
            },
          },
        },
        summary: {
          items: [
            { $ref: '#/components/schemas/complexFoo' },
            { $ref: '#/components/schemas/foo' },
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
          complexFoo: {
            allOf: [
              null as any /*#foo*/,
              {
                description: 'Override',
              },
            ],
          },
          foo: {
            description: 'Original',
            properties: {
              complexFoo: {
                allOf: [
                  null as any /*#complexFoo*/,
                  {
                    description: 'Override x2',
                  },
                ],
              },
            },
          },
          summary: {
            items: [
              null as any /*#complexFoo*/,
              null as any /*#foo*/,
            ],
          },
        },
      },
    }
    expected.components.schemas.complexFoo.allOf[0] = expected.components.schemas.foo
    expected.components.schemas.foo.properties.complexFoo.allOf[0] = expected.components.schemas.complexFoo
    expected.components.schemas.summary.items[0] = expected.components.schemas.complexFoo
    expected.components.schemas.summary.items[1] = expected.components.schemas.foo
    const result = defineOriginsAndResolveRef(source)
    expect(result).toEqual(expected)
  })

  it('origins chains', () => {
    const result: any = defineOriginsAndResolveRef(source, { originsFlag: TEST_ORIGINS_FLAG })
    commonOriginsCheck(result, { source })

    // check common structure
    expect(result.components.schemas[TEST_ORIGINS_FLAG]).toEqual({
      complexFoo: expect.any(Array<ChainItem>),
      foo: expect.any(Array<ChainItem>),
      summary: expect.any(Array<ChainItem>),
    })
    expect(result.components.schemas.summary.items[TEST_ORIGINS_FLAG]).toEqual({
      0: expect.any(Array<ChainItem>),
      1: expect.any(Array<ChainItem>),
    })

    const { complexFoo, foo, summary } = result.components.schemas
    const complexFooOriginal = result.components.schemas[TEST_ORIGINS_FLAG].complexFoo[0]
    const fooOriginal = result.components.schemas[TEST_ORIGINS_FLAG].foo[0]
    expect(pathItemToFullPath(complexFooOriginal)).toEqual(['components', 'schemas', 'complexFoo'])
    expect(pathItemToFullPath(fooOriginal)).toEqual(['components', 'schemas', 'foo'])
    expect(pathItemToFullPath(summary.items[TEST_ORIGINS_FLAG][0][0])).toEqual(['components', 'schemas', 'summary', 'items', 0])
    expect(pathItemToFullPath(summary.items[TEST_ORIGINS_FLAG][1][0])).toEqual(['components', 'schemas', 'summary', 'items', 1])

    const fooOriginalDescriptionOrigin = foo[TEST_ORIGINS_FLAG].description[0]
    expect(pathItemToFullPath(fooOriginalDescriptionOrigin)).toEqual(['components', 'schemas', 'foo', 'description'])
    expect(complexFoo.allOf[0][TEST_ORIGINS_FLAG].description[0]).toBe(fooOriginalDescriptionOrigin)
    expect(foo.properties.complexFoo.allOf[0].allOf[0][TEST_ORIGINS_FLAG].description[0]).toBe(fooOriginalDescriptionOrigin)
    expect(summary.items[1][TEST_ORIGINS_FLAG].description[0]).toBe(fooOriginalDescriptionOrigin)
    expect(summary.items[0].allOf[0][TEST_ORIGINS_FLAG].description[0]).toBe(fooOriginalDescriptionOrigin)

    const overrideDescriptionOrigin = complexFoo.allOf[1][TEST_ORIGINS_FLAG].description[0]
    expect(pathItemToFullPath(overrideDescriptionOrigin)).toEqual(['components', 'schemas', 'complexFoo', 'description'])
    expect(foo.properties.complexFoo.allOf[0].allOf[1][TEST_ORIGINS_FLAG].description[0]).toBe(overrideDescriptionOrigin)
    expect(summary.items[0].allOf[1][TEST_ORIGINS_FLAG].description[0]).toBe(overrideDescriptionOrigin)

    //description: 'Override x2' origin
    expect(pathItemToFullPath(foo.properties.complexFoo.allOf[1][TEST_ORIGINS_FLAG].description[0])).toEqual(['components', 'schemas', 'foo', 'properties', 'complexFoo', 'description'])
  })
})

describe('error handling', () => {
  it('stack overflow', (done) => {
    const data = {
      openapi: '3.1.0',
      components: {
        schemas: {
          main: {
            properties: {
              main: {
                $ref: '#/components/schemas/main/properties/main/properties/main',
              },
            },
          },
        },
      },
    }

    const result = defineOriginsAndResolveRef(data, { onRefResolveError: () => done() })
    expect(result).toEqual(data)
  })
})

