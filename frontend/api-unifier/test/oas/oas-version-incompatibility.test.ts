import { JSON_SCHEMA_PROPERTY_NULLABLE, normalize } from '../../src'

const schemaPath = ['paths', '/example', 'post', 'responses', '200', 'content', 'application/json', 'schema']

const defaultNormalize = (value: unknown) => normalize(value, {
  validate: true,
  unify: true,
  liftCombiners: true,
})

const ANY_MATCHER = {
  anyOf: expect.arrayContaining([
    expect.objectContaining({ type: 'boolean' }),
    expect.objectContaining({ type: 'string' }),
    expect.objectContaining({ type: 'number' }),
    expect.objectContaining({ type: 'integer' }),
    expect.objectContaining({ type: 'object' }),
    expect.objectContaining({ type: 'array' }),
  ]),
}

describe('OAS 3.0 features not supported in OAS 3.1', () => {
  it('ignores nullable for schemas in 3.1', () => {
    const data = {
      'openapi': '3.1.0',
      'paths': {
        '/example': {
          'post': {
            'responses': {
              '200': {
                'description': 'OK',
                'content': {
                  'application/json': {
                    'schema': {
                      'nullable': true,
                      'type': 'string',
                    },
                  },
                },
              },
            },
          },
        },
      },
    }

    const result = defaultNormalize(data)

    expect(result).not.toHaveProperty([...schemaPath, 'type', JSON_SCHEMA_PROPERTY_NULLABLE])
  })
})

describe('OAS 3.1 features not supported in OAS 3.0', () => {
  it('does not support array of types', () => {
    const data = {
      'openapi': '3.0.0',
      'paths': {
        '/example': {
          'post': {
            'responses': {
              '200': {
                'description': 'OK',
                'content': {
                  'application/json': {
                    'schema': {
                      'type': ['string'],
                    },
                  },
                },
              },
            },
          },
        },
      },
    }

    const result = defaultNormalize(data)

    expect(result).toHaveProperty([...schemaPath], ANY_MATCHER)
  })

  it('does not support "null" type', () => {
    const data = {
      'openapi': '3.0.0',
      'paths': {
        '/example': {
          'post': {
            'responses': {
              '200': {
                'description': 'OK',
                'content': {
                  'application/json': {
                    'schema': {
                      'type': 'null',
                    },
                  },
                },
              },
            },
          },
        },
      },
    }

    const result = defaultNormalize(data)

    expect(result).toHaveProperty([...schemaPath], ANY_MATCHER)
  })

  it('empty schema does not match null type', () => {
    const data = {
      'openapi': '3.0.0',
      'paths': {
        '/example': {
          'post': {
            'responses': {
              '200': {
                'description': 'OK',
                'content': {
                  'application/json': {
                    'schema': {},
                  },
                },
              },
            },
          },
        },
      },
    }

    const result = defaultNormalize(data)

    expect(result).not.toHaveProperty([...schemaPath], {anyOf: expect.arrayContaining([expect.objectContaining({ type: 'null' })])})
  })
})
