import { defineOriginsAndResolveRef } from '../../src/define-origins-and-resolve-ref'
import { pathItemToFullPath } from '../../src'
import { commonOriginsCheck, TEST_ORIGINS_FLAG, TEST_SYNTHETIC_TITLE_FLAG } from '../helpers'

describe('simple origins', () => {

  it('origins without refs', () => {
    const source = {
      title: 'Some Schema',
      properties: {
        foo: { type: 'string' },
        bar: {
          type: 'object',
          properties: {
            lol: { type: 'integer' },
          },
        },
      },
    }
    const expected = {
      title: 'Some Schema',
      properties: {
        foo: {
          type: 'string',
          [TEST_ORIGINS_FLAG]: {
            type: [{ parent: undefined as any /*2*/, value: 'type' }],
          },
        },
        bar: {
          type: 'object',
          properties: {
            lol: {
              type: 'integer',
              [TEST_ORIGINS_FLAG]: {
                type: [{ parent: undefined as any /*5*/, value: 'type' }],
              },
            },
            [TEST_ORIGINS_FLAG]: {
              lol: [{ parent: undefined as any /*4*/, value: 'lol' }], /*5*/
            },
          },
          [TEST_ORIGINS_FLAG]: {
            type: [{ parent: undefined as any /*3*/, value: 'type' }],
            properties: [{ parent: undefined as any /*3*/, value: 'properties' }], /*4*/
          },
        },
        [TEST_ORIGINS_FLAG]: {
          foo: [{ parent: undefined as any /*1*/, value: 'foo' }], /*2*/
          bar: [{ parent: undefined as any /*1*/, value: 'bar' }], /*3*/
        },
      },
      [TEST_ORIGINS_FLAG]: {
        title: [{ parent: undefined, value: 'title' }], /*0*/
        properties: [{ parent: undefined, value: 'properties' }], /*1*/
      },
    }

    expected.properties[TEST_ORIGINS_FLAG].foo[0].parent = expected[TEST_ORIGINS_FLAG].properties[0]
    expected.properties[TEST_ORIGINS_FLAG].bar[0].parent = expected[TEST_ORIGINS_FLAG].properties[0]
    expected.properties.foo[TEST_ORIGINS_FLAG].type[0].parent = expected.properties[TEST_ORIGINS_FLAG].foo[0]
    expected.properties.bar[TEST_ORIGINS_FLAG].type[0].parent = expected.properties[TEST_ORIGINS_FLAG].bar[0]
    expected.properties.bar[TEST_ORIGINS_FLAG].properties[0].parent = expected.properties[TEST_ORIGINS_FLAG].bar[0]
    expected.properties.bar.properties[TEST_ORIGINS_FLAG].lol[0].parent = expected.properties.bar[TEST_ORIGINS_FLAG].properties[0]
    expected.properties.bar.properties.lol[TEST_ORIGINS_FLAG].type[0].parent = expected.properties.bar.properties[TEST_ORIGINS_FLAG].lol[0]

    const result: any = defineOriginsAndResolveRef(source, { originsFlag: TEST_ORIGINS_FLAG })
    expect(result).toEqual(expected)
    commonOriginsCheck(result, { source })
  })

  it('origin of refs to same source', () => {
    const data = {
      title: 'Some Schema',
      properties: {
        foo: { $ref: '#/components/entities/reference' },
        bar: {
          type: 'object',
          properties: {
            lol: { $ref: '#/components/entities/reference' },
          },
        },
        items: [
          { $ref: '#/components/entities/reference' },
          { $ref: '#/components/entities/link' },
        ],
      },
    }

    const components = {
      components: {
        entities: {
          reference: { type: 'string' },
          link: { type: 'integer' },
        },
      },
    }

    const componentsOrigins = {
      components: [{ parent: undefined, value: 'components' }], /*1000*/
      entities: [{ parent: undefined as any/*1000*/, value: 'entities' }], /*1001*/
      reference: [{ parent: undefined as any/*1001*/, value: 'reference' }], /*1002*/
      link: [{ parent: undefined as any/*1001*/, value: 'link' }], /*1003*/
    }
    componentsOrigins.entities[0].parent = componentsOrigins.components[0]
    componentsOrigins.reference[0].parent = componentsOrigins.entities[0]
    componentsOrigins.link[0].parent = componentsOrigins.entities[0]

    const expected = {
      title: 'Some Schema',
      properties: {
        foo: {
          type: 'string',
          [TEST_ORIGINS_FLAG]: {
            type: [{ parent: undefined as any /*1002*/, value: 'type' }],
          },
        },
        bar: {
          type: 'object',
          properties: {
            lol: {
              type: 'string',
              [TEST_ORIGINS_FLAG]: {
                type: [{ parent: undefined as any /*1003*/, value: 'type' }],
              },
            },
            [TEST_ORIGINS_FLAG]: {
              lol: [{ parent: undefined as any /*1003*/, value: 'lol' }], /*6*/
            },
          },
          [TEST_ORIGINS_FLAG]: {
            type: [{ parent: undefined as any /*3*/, value: 'type' }],
            properties: [{ parent: undefined as any /*3*/, value: 'properties' }], /*5*/
          },
        },
        items: [
          {
            type: 'string',
            [TEST_ORIGINS_FLAG]: {
              type: [{ parent: undefined as any /*1002*/, value: 'type' }],
            },
          },
          {
            type: 'integer',
            [TEST_ORIGINS_FLAG]: {
              type: [{ parent: undefined as any /*1003*/, value: 'type' }],
            },
          },
        ] as any,
        [TEST_ORIGINS_FLAG]: {
          foo: [{ parent: undefined as any /*1*/, value: 'foo' }], /*2*/
          bar: [{ parent: undefined as any /*1*/, value: 'bar' }], /*3*/
          items: [{ parent: undefined as any /*1*/, value: 'items' }], /*4*/
        },
      },
      [TEST_ORIGINS_FLAG]: {
        title: [{ parent: undefined, value: 'title' }], /*0*/
        properties: [{ parent: undefined, value: 'properties' }], /*1*/
      },
    }

    expected.properties[TEST_ORIGINS_FLAG].bar[0].parent = expected[TEST_ORIGINS_FLAG].properties[0]
    expected.properties[TEST_ORIGINS_FLAG].foo[0].parent = expected[TEST_ORIGINS_FLAG].properties[0]
    expected.properties[TEST_ORIGINS_FLAG].items[0].parent = expected[TEST_ORIGINS_FLAG].properties[0]
    expected.properties.foo[TEST_ORIGINS_FLAG].type[0].parent = componentsOrigins.reference[0]
    expected.properties.bar[TEST_ORIGINS_FLAG].type[0].parent = expected.properties[TEST_ORIGINS_FLAG].bar[0]
    expected.properties.bar[TEST_ORIGINS_FLAG].properties[0].parent = expected.properties[TEST_ORIGINS_FLAG].bar[0]
    expected.properties.items[TEST_ORIGINS_FLAG] = {
      0: [{ parent: expected.properties[TEST_ORIGINS_FLAG].items[0], value: 0 }],
      1: [{ parent: expected.properties[TEST_ORIGINS_FLAG].items[0], value: 1 }],
    }
    expected.properties.items[0][TEST_ORIGINS_FLAG].type[0].parent = componentsOrigins.reference[0]
    expected.properties.items[1][TEST_ORIGINS_FLAG].type[0].parent = componentsOrigins.link[0]
    expected.properties.bar.properties[TEST_ORIGINS_FLAG].lol[0].parent = expected.properties.bar[TEST_ORIGINS_FLAG].properties[0]
    expected.properties.bar.properties.lol[TEST_ORIGINS_FLAG].type[0].parent = componentsOrigins.reference[0]

    const result: any = defineOriginsAndResolveRef(data, { originsFlag: TEST_ORIGINS_FLAG, source: components })
    expect(result).toEqual(expected)
    commonOriginsCheck(result, {
      source: {
        ...data,
        ...components,
      },
    })

    // origin of 'type' under foo has path /components/entities/reference
    expect(pathItemToFullPath(result.properties.foo[TEST_ORIGINS_FLAG].type[0])).toEqual(['components', 'entities', 'reference', 'type'])
    // foo, lol and items[0] have 'type' with same origin instance
    expect(result.properties.foo[TEST_ORIGINS_FLAG].type[0]).toBe(result.properties.bar.properties.lol[TEST_ORIGINS_FLAG].type[0])
    expect(result.properties.foo[TEST_ORIGINS_FLAG].type[0]).toBe(result.properties.items[0][TEST_ORIGINS_FLAG].type[0])
    // origins of foo, bar, and items[0] have different origins (NOT reference!!!)
    expect(result.properties[TEST_ORIGINS_FLAG].foo[0]).not.toBe(result.properties.bar.properties[TEST_ORIGINS_FLAG].lol[0])
    expect(result.properties[TEST_ORIGINS_FLAG].foo[0]).not.toBe(result.properties.items[TEST_ORIGINS_FLAG][0])
    // 'type' under items[0] and items[1] have same parent origin instance
    expect(result.properties.items[0][TEST_ORIGINS_FLAG].type[0].parent.parent).toBe(result.properties.items[1][TEST_ORIGINS_FLAG].type[0].parent.parent)
  })

  it('synthetic allOf origins', () => {
    const source = {
      openapi: '3.1.0',
      components: {
        schemas: {
          foo: {
            description: 'Some Number',
            $ref: '#/components/schemas/bar',
          },
          bar: {
            type: 'number',
          },
        },
      },
    }

    const expected = {
      openapi: '3.1.0',
      components: {
        schemas: {
          foo: {
            allOf: [
              null as any,  /*1000*/
              {
                description: 'Some Number',
                [TEST_ORIGINS_FLAG]: {
                  description: [{ parent: null as any /*3*/, value: 'description' }],
                },
              },
            ],
            [TEST_ORIGINS_FLAG]: {
              allOf: null as any/*5*/,
            },
          } as any,
          bar: { /*1000*/
            type: 'number',
            [TEST_ORIGINS_FLAG]: {
              type: [{ parent: null as any /*4*/, value: 'type' }],
            },
          },
          [TEST_ORIGINS_FLAG]: {
            foo: [{ parent: null as any /*2*/, value: 'foo' }], /*3*/
            bar: [{ parent: null as any /*2*/, value: 'bar' }], /*4*/
          },
        },
        [TEST_ORIGINS_FLAG]: {
          schemas: [{ parent: null as any, value: 'schemas' }], /*2*/
        },
      },
      [TEST_ORIGINS_FLAG]: {
        openapi: [{ parent: undefined, value: 'openapi' }], /*0*/
        components: [{ parent: undefined, value: 'components' }], /*1*/
      },
    }

    expected.components.schemas.foo.allOf[0] = expected.components.schemas.bar
    expected.components[TEST_ORIGINS_FLAG].schemas[0].parent = expected[TEST_ORIGINS_FLAG].components[0]
    expected.components.schemas[TEST_ORIGINS_FLAG].foo[0].parent = expected.components[TEST_ORIGINS_FLAG].schemas[0]
    expected.components.schemas[TEST_ORIGINS_FLAG].bar[0].parent = expected.components[TEST_ORIGINS_FLAG].schemas[0]
    expected.components.schemas.foo[TEST_ORIGINS_FLAG].allOf = expected.components.schemas[TEST_ORIGINS_FLAG].foo
    expected.components.schemas.foo.allOf[TEST_ORIGINS_FLAG] = {
      0: [{ parent: expected.components.schemas[TEST_ORIGINS_FLAG].foo[0], value: '$ref' }],
      1: expected.components.schemas[TEST_ORIGINS_FLAG].foo,
    }
    expected.components.schemas.foo.allOf[1][TEST_ORIGINS_FLAG].description[0].parent = expected.components.schemas[TEST_ORIGINS_FLAG].foo[0]
    expected.components.schemas.bar[TEST_ORIGINS_FLAG].type[0].parent = expected.components.schemas[TEST_ORIGINS_FLAG].bar[0]

    const result: any = defineOriginsAndResolveRef(source, { originsFlag: TEST_ORIGINS_FLAG })
    expect(result).toEqual(expected)
    commonOriginsCheck(result, { source })
  })

  it('external source with same nodes should not duplicate origins', () => {
    const data = {
      openapi: '3.1.0',
      components: {
        schemas: {
          one: {
            $ref: '#/components/schemas/two',
          },
        },
      },
    }
    const source = {
      openapi: '3.1.0',
      components: {
        schemas: {
          two: {
            description: 'Two',
          },
        },
      },
    }
    const result = defineOriginsAndResolveRef(data, { originsFlag: TEST_ORIGINS_FLAG, source })
    commonOriginsCheck(result)
  })

  it('external source with same nodes should not duplicate origins. case 2', () => {
    const data = {
      openapi: '3.1.0',
      paths: {
        path: {
          get: {
            requestBody: {
              schema: {
                $ref: '#/components/schemas/two',
              },
            },
          },
        },
      },
      components: {
        schemas: {
          notUsed: {
            $ref: '#/components/schemas/two',
          },
        },
      },
    }
    const source = {
      openapi: '3.1.0',
      components: {
        schemas: {
          two: {
            description: 'Two',
          },
        },
      },
    }
    const result = defineOriginsAndResolveRef(data, { originsFlag: TEST_ORIGINS_FLAG, source })
    commonOriginsCheck(result)
  })

  it('broken refs', () => {
    const source = {
      openapi: '3.0.0',
      components: {
        schemas: {
          simple: {
            $ref: '#/components/schemas/never',
          },
          cycled: {
            $ref: '#/components/schemas/cycled',
          },
          rich: {
            $ref: '#/components/schemas/cycled',
            allOf: [{ $ref: '#/components/schemas/simple' }],
          },
          reuse: {
            allOf: [{ $ref: '#/components/schemas/simple' }],
          },
        },
      },
    }
    const result = defineOriginsAndResolveRef(source, { originsFlag: TEST_ORIGINS_FLAG, source })
    commonOriginsCheck(result, { source })
    expect(result).not.toHaveProperty(['components', 'schemas', 'rich', 'allOf'])
    expect(result).toHaveProperty(['components', 'schemas', 'rich', '$ref'])
  })

  it('synthetic title should have ref to physical reference property key', () => {
    const source = {
      openapi: '3.0.0',
      components: {
        schemas: {
          Object: {
            type: 'object',
            properties: {
              one: {
                $ref: '#/components/schemas/Intermidiate1',
              },
              two: {
                $ref: '#/components/schemas/Intermidiate1',
              }
            }
          },
          Intermidiate1: {
            $ref: '#/components/schemas/Intermidiate2',
          },
          Intermidiate2: {
            $ref: '#/components/schemas/Final',
            readOnly: true,
          },
          Final: {
            readOnly: true
          }
        },
      },
    }
    const result = defineOriginsAndResolveRef(source, { originsFlag: TEST_ORIGINS_FLAG, syntheticTitleFlag: TEST_SYNTHETIC_TITLE_FLAG })
    commonOriginsCheck(result, { source })
    expect(result).toHaveProperty(['components', 'schemas', 'Object', 'properties', 'one', 'allOf', 0, TEST_ORIGINS_FLAG, 'title', 0, 'value'], 'Intermidiate1')
    expect(result).toHaveProperty(['components', 'schemas', 'Object', 'properties', 'two', 'allOf', 0, TEST_ORIGINS_FLAG, 'title', 0, 'value'], 'Intermidiate1')
    expect(result).toHaveProperty(['components', 'schemas', 'Intermidiate1', 'allOf', 0, TEST_ORIGINS_FLAG, 'title', 0, 'value'], 'Intermidiate2')
    expect(result).toHaveProperty(['components', 'schemas', 'Intermidiate2', 'allOf', 0, TEST_ORIGINS_FLAG, 'title', 0, 'value'], 'Final')
  })
})

