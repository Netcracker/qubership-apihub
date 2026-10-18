import { convertOriginToHumanReadable, denormalize, normalize, NormalizeOptions, OriginLeafs } from '../../src'
import {
  createSimpleOriginsMetaRecord,
  TEST_ORIGINS_FLAG,
  TEST_SYNTHETIC_ALL_OF_FLAG,
  TEST_SYNTHETIC_TITLE_FLAG,
} from '../helpers/index'
import { isObject } from '@netcracker/qubership-apihub-json-crawl'

describe('normalize options', () => {

  it('resolves refs', () => {
    const data = {
      openapi: '3.1.0',
      paths: {
        '/api/v1/dictionaries/applications': {
          post: {
            requestBody: {
              $ref: '#/components/requestBodies/DictionaryApplicationVersion',
            },
          },
        },
      },
      components: {
        requestBodies: {
          DictionaryApplicationVersion: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  title: 'Dictionary',
                },
              },
            },
          },
        },
      },
    }
    const expected = {
      openapi: '3.1.0',
      paths: {
        '/api/v1/dictionaries/applications': {
          post: {
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    title: 'Dictionary',
                  },
                },
              },
            },
          },
        },
      },
      components: data.components,
    }

    const result = normalize(data, {})
    expect(result).toEqual(expected)
  })

  it('does not resolve refs', () => {
    const data = {
      openapi: '3.1.0',
      paths: {
        '/api/v1/dictionaries/applications': {
          post: {
            requestBody: {
              $ref: '#/components/requestBodies/DictionaryApplicationVersion',
            },
          },
        },
      },
      components: {
        requestBodies: {
          DictionaryApplicationVersion: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  title: 'Dictionary',
                },
              },
            },
          },
        },
      },
    }

    const result = normalize(data, {
      resolveRef: false,
    })
    expect(result).toEqual(data)
  })

  it('merges allOfs', () => {
    const data = {
      openapi: '3.1.0',
      paths: {
        '/api/v1/dictionaries/applications': {
          post: {
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      {
                        type: 'object',
                        properties: {
                          prop1: {
                            type: 'string',
                          },
                        },
                      },
                      {
                        type: 'object',
                        properties: {
                          prop2: {
                            type: 'number',
                          },
                        },
                      },
                      {
                        type: 'object',
                        properties: {
                          prop3: {
                            type: 'number',
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      },
    }
    const expected = {
      openapi: '3.1.0',
      paths: {
        '/api/v1/dictionaries/applications': {
          post: {
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    properties: {
                      prop1: {
                        type: 'string',
                      },
                      prop2: {
                        type: 'number',
                      },
                      prop3: {
                        type: 'number',
                      },
                    },
                    type: 'object',
                  },
                },
              },
            },
          },
        },
      },
    }

    const result = normalize(data, {})
    expect(result).toEqual(expected)
  })

  it('does not merge allOfs', () => {
    const data = {
      openapi: '3.1.0',
      paths: {
        '/api/v1/dictionaries/applications': {
          post: {
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      {
                        type: 'object',
                        properties: {
                          prop1: {
                            type: 'string',
                          },
                        },
                      },
                      {
                        type: 'object',
                        properties: {
                          prop2: {
                            type: 'number',
                          },
                        },
                      },
                      {
                        type: 'object',
                        properties: {
                          prop3: {
                            type: 'number',
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      },
    }
    const result = normalize(data, {
      mergeAllOf: false,
    })
    expect(result).toEqual(data)
  })

  it('mark synthethic allOf', () => {
    const data = {
      openapi: '3.0.0',
      paths: {
        '/path': {
          post: {
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      {
                        $ref: '#/components/schemas/Ref',
                      },
                      {
                        type: 'string',
                        minLength: 42,
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          Ref: {
            readOnly: true,
            allOf: [
              {
                $ref: '#/components/schemas/AnotherRef',
              },
            ],
          },
          AnotherRef: {
            writeOnly: true,
          },
        },
      },
    }
    const result = normalize(data, {
      mergeAllOf: false,
      syntheticTitleFlag: TEST_SYNTHETIC_TITLE_FLAG,
      syntheticAllOfFlag: TEST_SYNTHETIC_ALL_OF_FLAG,
    })
    const expected: any = {
      openapi: '3.0.0',
      paths: {
        '/path': {
          post: {
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      {
                        allOf: [
                          {
                            title: 'Ref',
                            [TEST_SYNTHETIC_TITLE_FLAG]: true,
                          },
                          {
                            readOnly: true,
                            allOf: [
                              {
                                allOf: [
                                  {
                                    title: 'AnotherRef',
                                    [TEST_SYNTHETIC_TITLE_FLAG]: true,
                                  },
                                  {
                                    writeOnly: true,
                                  },
                                ],
                                [TEST_SYNTHETIC_ALL_OF_FLAG]: true,
                              },
                            ],
                          },
                        ],
                        [TEST_SYNTHETIC_ALL_OF_FLAG]: true,
                      },
                      {
                        type: 'string',
                        minLength: 42,
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          Ref: null as any,
          AnotherRef: null as any,
        },
      },
    }
    expected.components.schemas.Ref = expected.paths['/path'].post.requestBody.content['application/json'].schema.allOf[0].allOf[1] as any
    expected.components.schemas.AnotherRef = expected.components.schemas.Ref.allOf[0].allOf[1]
    expect(result).toEqual(expected)
  })

  it('origins are not overridden', () => {
    const ORIGIN_FOR_DEFAULTS: OriginLeafs[number] = { parent: undefined, value: 'come-from-defaults' }
    const data = {
      openapi: '3.0.1',
      components: {
        schemas: {
          'EmptySchema': {
            description: 'description',
            [TEST_ORIGINS_FLAG]: createSimpleOriginsMetaRecord('description'),
          },
          [TEST_ORIGINS_FLAG]: createSimpleOriginsMetaRecord('EmptySchema'),
        },
        [TEST_ORIGINS_FLAG]: createSimpleOriginsMetaRecord('schemas'),
      },
      [TEST_ORIGINS_FLAG]: {
        ...createSimpleOriginsMetaRecord('openapi'),
        ...createSimpleOriginsMetaRecord('components'),
      },
    }
    const result = normalize(data, {
      originsFlag: TEST_ORIGINS_FLAG,
      originsAlreadyDefined: true,
      unify: true,
      createOriginsForDefaults: (() => [ORIGIN_FOR_DEFAULTS]),
    })
    const resultWithHmr = convertOriginToHumanReadable(result, TEST_ORIGINS_FLAG)
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'EmptySchema', TEST_ORIGINS_FLAG, 'description'], ['description'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', TEST_ORIGINS_FLAG, 'EmptySchema'], ['EmptySchema'])
    expect(resultWithHmr).toHaveProperty(['components', TEST_ORIGINS_FLAG, 'schemas'], ['schemas'])
    expect(resultWithHmr).toHaveProperty([TEST_ORIGINS_FLAG, 'openapi'], ['openapi'])
    expect(resultWithHmr).toHaveProperty([TEST_ORIGINS_FLAG, 'components'], ['components'])

    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'EmptySchema', TEST_ORIGINS_FLAG, 'anyOf'], [ORIGIN_FOR_DEFAULTS.value])
  })

  it('should not fail if flags are contradictory', () => {
    const data = {
      openapi: '3.0.1',
      components: {
        schemas: {
          'EmptySchema': {
            description: 'description',
          },
        },
      },
    }

    const createOriginsForDefaults = jest.fn().mockReturnValue([])

    const result = normalize(data, {
      originsFlag: undefined,
      unify: true,
      originsAlreadyDefined: true,
      createOriginsForDefaults,
    })

    expect(createOriginsForDefaults).toHaveBeenCalledWith([])
    expect(isObject(result)).toBeTruthy()
  })

  it('should calculate origins', () => {
    const data = {
      openapi: '3.0.1',
      components: {
        schemas: {
          'EmptySchema': {
            description: 'description',
          },
        },
      },
    }
    const result = normalize(data, { originsFlag: TEST_ORIGINS_FLAG, resolveRef: false, unify: true })
    const resultWithHmr = convertOriginToHumanReadable(result, TEST_ORIGINS_FLAG)
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', 'EmptySchema', TEST_ORIGINS_FLAG, 'description'], ['components/schemas/EmptySchema/description'])
    expect(resultWithHmr).toHaveProperty(['components', 'schemas', TEST_ORIGINS_FLAG, 'EmptySchema'], ['components/schemas/EmptySchema'])
  })

  it('should remove manually defined origins', () => {
    const OPTIONS: NormalizeOptions = {
      originsFlag: TEST_ORIGINS_FLAG,
      originsAlreadyDefined: false,
      unify: true,
    }
    const data = {
      openapi: '3.0.1',
      components: {
        schemas: {
          'EmptySchema': {
            description: 'description',
            [TEST_ORIGINS_FLAG]: createSimpleOriginsMetaRecord('description'),
          },
        },
      },
    }
    const result = denormalize(normalize(data, OPTIONS), OPTIONS)
    const resultWithHmr = convertOriginToHumanReadable(result, TEST_ORIGINS_FLAG)
    expect(resultWithHmr).not.toHaveProperty(['components', 'schemas', 'EmptySchema', TEST_ORIGINS_FLAG])
    expect(resultWithHmr).not.toHaveProperty(['components', 'schemas', TEST_ORIGINS_FLAG])
    expect(resultWithHmr).not.toHaveProperty(['components', TEST_ORIGINS_FLAG])
    expect(resultWithHmr).not.toHaveProperty([TEST_ORIGINS_FLAG])
  })
})
