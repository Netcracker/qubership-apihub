/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import fn = jest.fn
import { walkRestOperation } from './helpers'
import { PROPERTY_ALIAS_ADDITIONAL_PROPERTIES } from '../src'

describe('ApiVisitor test', () => {
  test('should crawl all schemas of operation only', () => {
    const source = {
      openapi: '3.0.0',
      paths: {
        '/api/v1/test': {
          get: {
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    description: 'Request Pet description',
                    title: 'Request Pet',
                    properties: {
                      name: {
                        type: 'string',
                        title: 'name of the pet',
                      },
                      category: {
                        $ref: '#/components/schemas/Category',
                      },
                    },
                  },
                },
              },
            },
            responses: {
              '200': {
                content: {
                  'application/json': {
                    schema: {
                      type: 'array',
                      description: 'Pet description',
                      title: 'Pet',
                      items: {
                        $ref: '#/components/schemas/Category',
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
          Category: {
            type: 'object',
            title: 'Category',
            description: 'Category description',
          },
        },
      },
    }

    const schemaStartCounter = fn()
    walkRestOperation(source, {
      schemaRootStart: () => {
        schemaStartCounter()
        return true
      },
      schemaPropertyStart: () => {
        schemaStartCounter()
        return true
      },
      combinerItemStart: () => {
        schemaStartCounter()
        return true
      },
      schemaItemsStart: () => {
        schemaStartCounter()
        return true
      },
      mediaTypeStart: () => {
        return true
      },
      requestBodyStart: () => {
        return true
      },
      responseStart: () => {
        return true
      },
    })

    expect(schemaStartCounter).toHaveBeenCalledTimes(5)
  })

  test('should handle refs', () => {
    const source = {
      openapi: '3.0.0',
      paths: {
        '/api/v1/test': {
          get: {
            responses: {
              '200': {
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/Category',
                    },
                  },
                  'application/xml': {
                    schema: {
                      $ref: '#/components/schemas/Category',
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
          Category: {
            type: 'object',
            title: 'Market',
            description: 'Category description',
          },
        },
      },
    }

    const schemaStartCounter = fn()
    const uniques: Set<unknown> = new Set()
    walkRestOperation(source, {
      schemaRootStart: ({ value }) => {
        schemaStartCounter()
        uniques.add(value)
        return true
      },
    })

    expect(schemaStartCounter).toHaveBeenCalledTimes(2)
    expect([...uniques]).toHaveLength(1)
  })

  test('should call startSchema without refs', () => {
    const source = {
      openapi: '3.0.0',
      paths: {
        '/api/v1/test': {
          get: {
            responses: {
              '200': {
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/Category',
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
          Category: {
            type: 'object',
            description: 'Category description',
          },
        },
      },
    }
    const schemaStartCounter = fn()

    walkRestOperation(source, {
      schemaRootStart: () => {
        schemaStartCounter()
        return true
      },
    })

    expect(schemaStartCounter).toHaveBeenCalledTimes(1)
  })

  test('should add default schema title', () => {
    const source = {
      openapi: '3.0.0',
      paths: {
        '/api/v1/test': {
          get: {
            responses: {
              '200': {
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/Category',
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
          Category: {
            type: 'object',
            description: 'Category description',
          },
        },
      },
    }
    let schemaTitle = ''

    walkRestOperation(source, {
      schemaRootStart: ({ value }) => {
        schemaTitle = value?.title || ''
        return true
      },
    })

    expect(schemaTitle).toEqual('Category')
  })

  test('should not crawl allOf', () => {
    const source = {
      openapi: '3.0.0',
      paths: {
        '/api/v1/test': {
          get: {
            responses: {
              '200': {
                content: {
                  'application/json': {
                    schema: {
                      allOf: [
                        {
                          $ref: '#/components/schemas/Category',
                        },
                        {
                          description: 'Response 200 schema',
                        },
                        {
                          type: 'object',
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
      components: {
        schemas: {
          Category: {
            type: 'object',
            description: 'Category description',
          },
        },
      },
    }
    let schemaTitle = ''
    let wasAllOf = false

    walkRestOperation(source, {
      schemaRootStart: ({ value }) => {
        if (value?.title) {
          schemaTitle = value.title
        }
        return true
      },
      combinerStart: () => {
        wasAllOf = true
        return true
      },
    })

    expect(schemaTitle).toEqual('Category')
    expect(wasAllOf).toBeFalsy()
  })

  test('should crawl ref schema and inline schema', () => {
    const source = {
      openapi: '3.0.0',
      paths: {
        '/api/v1/test': {
          get: {
            responses: {
              '200': {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        name: {
                          type: 'string',
                        },
                        id: {
                          $ref: '#/components/schemas/Category',
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
          Category: {
            type: 'object',
            description: 'Category description',
          },
        },
      },
    }
    const schemaCounter = fn()

    walkRestOperation(source, {
      schemaRootStart: () => {
        schemaCounter()
        return true
      },
      schemaPropertyStart: () => {
        schemaCounter()
        return true
      },
    })

    expect(schemaCounter).toHaveBeenCalledTimes(3)
  })
  test('should crawl referenced response', () => {
    const source = {
      openapi: '3.0.0',
      paths: {
        '/api/v1/test': {
          get: {
            responses: {
              '502': {
                $ref: '#/components/responses/Error400',
              },
            },
          },
        },
      },
      components: {
        schemas: {
          Category: {
            type: 'object',
            description: 'Category description',
          },
        },
        responses: {
          Error400: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: {
                      type: 'string',
                    },
                    id: {
                      $ref: '#/components/schemas/Category',
                    },
                  },
                },
              },
            },
          },
        },
      },
    }
    const mediaTypeStartCounter = fn()

    walkRestOperation(source, {
      mediaTypeStart: () => {
        mediaTypeStartCounter()
        return true
      },
    })

    expect(mediaTypeStartCounter).toHaveBeenCalledTimes(1)
  })
  test('should crawl all schema properties', () => {
    const source = {
      openapi: '3.0.0',
      paths: {
        '/api/v1/test': {
          get: {
            responses: {
              '200': {
                content: {
                  'application/json': {
                    schema: {
                      title: 'Pet',
                      type: 'object',
                      required: [
                        'customers',
                      ],
                      properties: {
                        customers: {
                          type: 'array',
                          items: {
                            $ref: '#/components/schemas/Customer',
                          },
                          description: 'Customer objects with individual value of parameters.',
                        },
                        customersCommonPart: {
                          $ref: '#/components/schemas/Customer',
                          description: 'Customer parameters which should take similar value.',
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
          Customer: {
            type: 'object',
            description: 'Customer description',
          },
        },
      },
    }
    const schemaPropertiesCounter = fn()

    walkRestOperation(source, {
      schemaRootStart: () => {
        return true
      },
      schemaPropertyStart: () => {
        schemaPropertiesCounter()
        return true
      },
    })

    expect(schemaPropertiesCounter).toHaveBeenCalledTimes(2)
  })
  test('should crawl parameters', () => {
    const source = {
      openapi: '3.0.0',
      paths: {
        '/api/v1/test': {
          get: {
            parameters: [
              {
                $ref: '#/components/parameters/some-id',
              },
              {
                $ref: '#/components/parameters/cookie',
              },
              {
                $ref: '#/components/parameters/version',
              },
              {
                name: 'id',
                'in': 'path',
                required: true,
                schema: {
                  type: 'string',
                  format: 'uuid',
                },
                example: '3163861455300018271',
              },
              {
                name: 'action',
                'in': 'query',
                required: true,
                schema: {
                  type: 'string',
                  'enum': [
                    'value1',
                    'value2',
                    'value3',
                    'value4',
                    'value5',
                    'value6',
                    'value7',
                    'value8',
                    'value9',
                    'value10',
                    'value11',
                    'value12',
                    'value13',
                    'value14',
                    'value15',
                    'value16',
                    'value17',
                    'value18',
                    'value19',
                    'value20',
                    'value21',
                  ],
                },
                example: 'value1',
              },
              {
                name: 'mode',
                'in': 'query',
                required: false,
                schema: {
                  type: 'string',
                  'enum': [
                    'mode1',
                    'mode2',
                  ],
                },
                example: 'mode1',
              },
              {
                name: 'notifications',
                'in': 'query',
                required: false,
                schema: {
                  type: 'boolean',
                  'default': false,
                },
                example: true,
              },
            ],
          },
        },
      },
      components: {
        parameters: {
          'some-id': {
            'in': 'header',
            name: 'some-ID',
            schema: {
              type: 'string',
              format: 'uuid',
            },
            required: false,
          },
          cookie: {
            name: 'Cookie',
            'in': 'header',
            required: false,
            schema: {
              type: 'string',
            },
            example: 'cookie-example',
          },
          version: {
            'in': 'header',
            name: 'version',
            required: false,
            schema: {
              type: 'string',
            },
            example: '2',
          },
        },
      },
    }
    const parametersCount = fn()

    walkRestOperation(source, {
      parameterStart: () => {
        parametersCount()
        return true
      },
    })

    expect(parametersCount).toHaveBeenCalledTimes(7)
  })
  test('should crawl schema additional properties', () => {
    const source = {
      openapi: '3.0.0',
      paths: {
        '/api/v1/test': {
          get: {
            responses: {
              '200': {
                content: {
                  'application/json': {
                    schema: {
                      title: 'Pet',
                      type: 'object',
                      additionalProperties: {
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
    }
    const schemaAdditionalPropertiesCounter = fn()

    walkRestOperation(source, {
      schemaPropertyStart: ({ propertyName }) => {
        propertyName === PROPERTY_ALIAS_ADDITIONAL_PROPERTIES && schemaAdditionalPropertiesCounter()
        return true
      },
    })

    expect(schemaAdditionalPropertiesCounter).toHaveBeenCalledTimes(1)
  })
  test('should mark self loops', () => {
    const source = {
      openapi: '3.0.0',
      paths: {
        '/api/v1/test': {
          get: {
            responses: {
              '200': {
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/Customer',
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
          Customer: {
            type: 'object',
            description: 'Category description',
            properties: {
              recurrent: {
                $ref: '#/components/schemas/Customer',
              },
            },
          },
        },
      },
    }

    let cycleFound = false
    walkRestOperation(source, {
      schemaRootStart: ({ valueAlreadyVisited }) => {
        cycleFound ||= valueAlreadyVisited
        return !valueAlreadyVisited
      },
      schemaPropertyStart: ({ valueAlreadyVisited }) => {
        cycleFound ||= valueAlreadyVisited
        return !valueAlreadyVisited
      },
    })

    expect(cycleFound).toBeTruthy()
  })

  test('should mark self loops. lazy self definition', () => {
    const source = {
      openapi: '3.0.0',
      paths: {
        '/api/v1/test': {
          get: {
            responses: {
              '200': {
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/Customer',
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
          Customer: {
            oneOf: [
              {
                allOf: [
                  {
                    $ref: '#/components/schemas/Customer',
                  },
                ],
              },
            ],
          },
        },
      },
    }

    let isCycle = false
    const schemas: Set<unknown> = new Set()
    walkRestOperation(source, {
      schemaRootStart: ({ value }) => {
        isCycle = schemas.has(value)
        schemas.add(value)
        return !isCycle
      },
      combinerItemStart: ({ value }) => {
        isCycle = schemas.has(value)
        schemas.add(value)
        return !isCycle
      },
    })

    expect(isCycle).toBeTruthy()
  })
})
