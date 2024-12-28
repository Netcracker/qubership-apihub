import { normalize } from '../../src'
import source31x from '../resources/openapi31x.json'
import source30x from '../resources/openapi30x.json'
import { JsonPath } from '@netcracker/qubership-apihub-json-crawl'
import { ErrorMessage } from '../../src/errors'

interface Error {
  readonly message: string,
  readonly path: JsonPath,
  readonly ref: unknown
}

describe('merge allof in openapi schema', function () {
  const documentFragment = {
    openapi: '3.1.0',
    paths: {
      'humans': {
        get: {
          responses: {
            '200': {
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: {
                      $ref: '#/components/schemas/Human',
                      description: 'Human',
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  }
  const documentSource = {
    openapi: '3.1.0',
    components: {
      schemas: {
        Human: {
          type: 'object',
          properties: {
            location: {
              $ref: '#/components/schemas/Location',
              description: 'Human Location',
            },
          },
        },
        Location: {
          type: 'object',
          description: 'Just Location',
          allOf: [
            {
              properties: {
                ownedBy: {
                  $ref: '#/components/schemas/Human',
                  description: 'Human who owned Location',
                },
              },
            },
            {
              properties: {
                name: {
                  type: 'string',
                },
              },
            },
          ],
        },
      },
    },
  }
  it('openapi 3.1 specific', function () {
    const result = normalize(documentFragment, {
      source: documentSource,
      onMergeError: () => {throw new Error('Should never happened')},
    })
    const expected = {
      openapi: '3.1.0',
      paths: {
        'humans': {
          get: {
            responses: {
              '200': {
                content: {
                  'application/json': {
                    schema: {
                      type: 'array',
                      items: {
                        type: 'object',
                        description: 'Human',
                        properties: {
                          location: {
                            type: 'object',
                            description: 'Human Location',
                            properties: {
                              ownedBy: {
                                type: 'object',
                                description: 'Human who owned Location',
                                properties: {
                                  location: null as any,//ref
                                },
                              },
                              name: {
                                type: 'string',
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
          },
        },
      },
    }
    expected.paths.humans.get.responses['200'].content['application/json'].schema.items.properties.location.properties.ownedBy.properties.location =
      expected.paths.humans.get.responses['200'].content['application/json'].schema.items.properties.location
    expect(result).toEqual(expected)
  })

  it('openapi 3.1 specific with wrong version', function () {
    const errors: Error[] = []
    const result = normalize({ ...documentFragment, openapi: '3.0.0' }, {
      source: documentSource,
      onRefResolveError: (message, path, ref) => errors.push({ message, path, ref: ref }),
    })
    const expected = {
      openapi: '3.0.0',
      paths: {
        'humans': {
          get: {
            responses: {
              '200': {
                content: {
                  'application/json': {
                    schema: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          location: {
                            type: 'object',
                            description: 'Just Location',
                            properties: {
                              ownedBy: null as any,
                              name: {
                                type: 'string',
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
          },
        },
      },
    }
    expected.paths.humans.get.responses['200'].content['application/json'].schema.items.properties.location.properties.ownedBy =
      expected.paths.humans.get.responses['200'].content['application/json'].schema.items
    expect(result).toEqual(expected)
    expect(errors).toEqual([
      {
        message: ErrorMessage.richRefObjectNotAllowed(),
        path: ['paths', 'humans', 'get', 'responses', '200', 'content', 'application/json', 'schema', 'items'],
        ref: '#/components/schemas/Human',
      },
      {
        message: ErrorMessage.richRefObjectNotAllowed(),
        path: ['paths', 'humans', 'get', 'responses', '200', 'content', 'application/json', 'schema', 'items', 'properties', 'location'],
        ref: '#/components/schemas/Location',
      },
      {
        message: ErrorMessage.richRefObjectNotAllowed(),
        path: ['paths', 'humans', 'get', 'responses', '200', 'content', 'application/json', 'schema', 'items', 'properties', 'location', 'allOf', 0, 'properties', 'ownedBy'],
        ref: '#/components/schemas/Human',
      },
    ] as Error[])
  })
  it('merges schema in openapi 3.0.x', () => {
    const result = normalize(source30x)

    const expected = {
      openapi: '3.0.2',
      paths: {
        '/pets': {
          patch: {
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    oneOf: [] as any,//ref
                    discriminator: {
                      propertyName: 'pet_type',
                    },
                  },
                },
              },
            },
            responses: {
              '200': {
                description: 'Updated',
              },
            },
          },
        },
      },
      components: {
        schemas: {
          Pet: {
            type: 'object',
            required: [
              'pet_type',
            ],
            properties: {
              pet_type: {
                type: 'string',
              },
            },
            discriminator: {
              propertyName: 'pet_type',
            },
          },
          Dog: {
            type: 'object',
            required: [
              'pet_type',
            ],
            properties: {
              pet_type: {
                type: 'string',
              },
              bark: {
                type: 'boolean',
              },
              breed: {
                type: 'string',
                enum: [
                  'Dingo',
                  'Husky',
                  'Retriever',
                  'Shepherd',
                ],
              },
            },
            discriminator: {
              propertyName: 'pet_type',
            },
          },
          Cat: {
            type: 'object',
            required: [
              'pet_type',
            ],
            properties: {
              pet_type: {
                type: 'string',
              },
              hunts: {
                type: 'boolean',
              },
              age: {
                type: 'integer',
              },
            },
            discriminator: {
              propertyName: 'pet_type',
            },
          },
        },
      },
    }
    expected.paths['/pets'].patch.requestBody.content['application/json'].schema.oneOf = [
      expected.components.schemas.Cat,
      expected.components.schemas.Dog,
    ]
    expect(result).toEqual(expected)
  })

  it('merges schema in openapi 3.1.x', () => {
    const result = normalize(source31x)

    const expected = {
      openapi: '3.1.0',
      paths: {
        '/pets': {
          patch: {
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    oneOf: [] as any,//ref
                  },
                },
              },
            },
            responses: {
              '200': {
                description: 'Updated',
              },
            },
          },
        },
      },
      components: {
        schemas: {
          Pet: {
            type: 'object',
            required: [
              'pet_type',
            ],
            properties: {
              pet_type: {
                type: 'string',
              },
            },
            discriminator: {
              propertyName: 'pet_type',
            },
          },
          Dog: {
            type: 'object',
            required: [
              'pet_type',
            ],
            properties: {
              pet_type: {
                type: 'string',
              },
              bark: {
                type: 'boolean',
              },
              breed: {
                type: 'string',
                enum: [
                  'Dingo',
                  'Husky',
                  'Retriever',
                  'Shepherd',
                ],
              },
            },
            discriminator: {
              propertyName: 'pet_type',
            },
          },
          Cat: {
            type: 'object',
            required: [
              'pet_type',
            ],
            properties: {
              pet_type: {
                type: 'string',
              },
              hunts: {
                type: 'boolean',
              },
              age: {
                type: 'integer',
              },
            },
            discriminator: {
              propertyName: 'pet_type',
            },
          },
        },
      },
    }
    expected.paths['/pets'].patch.requestBody.content['application/json'].schema.oneOf = [
      expected.components.schemas.Cat,
      expected.components.schemas.Dog,
    ]
    expect(result).toMatchObject(expected)
  })
})

describe('open api specific', () => {
  it('combines items with custom fields', function () {
    const result = normalize({
      openapi: '3.0.1',
      components: {
        schemas: {
          Array: {
            items: {
              allOf: [
                {
                  type: 'string',
                  minLength: 1,
                  'x-tag': 'abc',
                },
                {
                  type: 'string',
                  maxLength: 5,
                  'x-tag': 'cba',
                },
              ],
            },
          },
        },
      },
    })

    expect(result).toMatchObject({
      openapi: '3.0.1',
      components: {
        schemas: {
          Array: {
            items: {
              type: 'string',
              minLength: 1,
              maxLength: 5,
              'x-tag': 'cba',
            },
          },
        },
      },
    })
  })
})
