import { calculateDeprecatedItems } from '../../src/deprecated-items'
import { createOasWithDeprecatedCandidates, OasDeprecatedMeta, TEST_ORIGINS_FLAG } from '../helpers'
import { normalize } from '../../src'
import { OpenAPIV3 } from 'openapi-types'
import ObjectContaining = jasmine.ObjectContaining

describe('Description for deprecated items test', () => {
  test('description for parameters object', async () => {
    const source = createOasWithDeprecatedCandidates({
      path: {
        '/path1': {
          get: {
            parameters: [
              {
                name: 'inline param',
                in: 'path',
                deprecated: true
              },
              {
                $ref: '#/components/parameters/parameter1'
              }
            ],
            responses: {}
          }
        }
      },
      parameter: {
        name: 'ref param',
        in: 'path',
        deprecated: true,
      },
    })

    const normalizedDocument = normalize(source, { originsFlag: TEST_ORIGINS_FLAG })
    const deprecatedItems = calculateDeprecatedItems(normalizedDocument, TEST_ORIGINS_FLAG)

    expect(deprecatedItems[0]).toEqual(deprecatedItemDescriptionMatcher('[Deprecated] path parameter \'inline param\''))
    expect(deprecatedItems[1]).toEqual(deprecatedItemDescriptionMatcher('[Deprecated] path parameter \'components.parameters.parameter1\''))
  })

  test('description for headers object', async () => {
    const source = createOasWithDeprecatedCandidates({
      path: {
        '/path1': {
          get: {
            responses: {
              200: {
                description: 'Successful response',
                headers: {
                  InlineHeader: {
                    description: 'Inline deprecated header',
                    deprecated: true
                  },
                  RefHeader: {
                    $ref: '#/components/headers/HeaderRef'
                  }
                }
              },
              201: {
                description: 'Response description',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object'
                    },
                    encoding: {
                      'profileImage': {
                        contentType: 'image/png',
                        headers: {
                          'X-Rate-Limit': {
                            deprecated: true,
                            schema: {
                              type: 'integer'
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
          },
          post: {
            responses: {
              '201': {
                $ref: '#/components/responses/ResponseRef'
              }
            },
            requestBody: {
              content: {
                'multipart/form-data': {
                  schema: {
                    type: 'object'
                  },
                  encoding: {
                    'profileImage': {
                      contentType: 'image/png',
                      headers: {
                        'X-Rate-Limit': {
                          deprecated: true,
                          schema: {
                            type: 'integer'
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      response: {
        description: 'not found',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {}
            },
            encoding: {
              'profileImage': {
                contentType: 'image/png',
                headers: {
                  'X-Rate-Limit': {
                    deprecated: true,
                    schema: {
                      type: 'integer'
                    }
                  }
                }
              }
            }
          }
        }
      },
      header: {
        description: 'Ref deprecated header',
        deprecated: true,
      }
    })

    const normalizedDocument = normalize(source, { originsFlag: TEST_ORIGINS_FLAG })
    const deprecatedItems = calculateDeprecatedItems(normalizedDocument, TEST_ORIGINS_FLAG)

    expect(deprecatedItems[0]).toEqual(deprecatedItemDescriptionMatcher('[Deprecated] header \'InlineHeader\' in response \'200\''))
    expect(deprecatedItems[1]).toEqual(deprecatedItemDescriptionMatcher('[Deprecated] header \'X-Rate-Limit\' in encoding \'profileImage\' in response \'201\' (application/json)'))
    expect(deprecatedItems[2]).toEqual(deprecatedItemDescriptionMatcher('[Deprecated] header \'X-Rate-Limit\' in encoding \'profileImage\' in request body (multipart/form-data)'))
    expect(deprecatedItems[3]).toEqual(deprecatedItemDescriptionMatcher('[Deprecated] header \'components.headers.header1\''))
    expect(deprecatedItems[4]).toEqual(deprecatedItemDescriptionMatcher('[Deprecated] header in \'components.responses.response1.content.application/json.encoding.profileImage.headers.X-Rate-Limit\''))
  })

  test('description for operation', async () => {
    const source = createOasWithDeprecatedCandidates({
      path: {
        '/api/v1/addressManagement/address': {
          get: {
            deprecated: true,
            responses: {}
          }
        }
      }
    })

    const normalizedDocument = normalize(source, { originsFlag: TEST_ORIGINS_FLAG })
    const deprecatedItems = calculateDeprecatedItems(normalizedDocument, TEST_ORIGINS_FLAG)

    expect(deprecatedItems[0]).toEqual(deprecatedItemDescriptionMatcher('[Deprecated] operation GET /api/v1/addressManagement/address'))
  })

  test('description for schema object', async () => {
    const source = createOasWithDeprecatedCandidates({
      path: {
        '/path1': {
          get: {
            parameters: [
              {
                name: 'param1',
                in: 'query',
                schema: {
                  type: 'string',
                  deprecated: true
                }
              },
              {
                $ref: '#/components/parameters/Parameter'
              },
              {
                name: 'petId',
                in: 'path',
                required: true,
                schema: {
                  $ref: '#/components/schemas/CommonDeprecatedSchema'
                }
              }
            ],
            responses: {
              200: {
                $ref: '#/components/responses/ResponseRef'
              },
              403: {
                description: 'Forbidden',
                headers: {
                  'InlineHeader': {
                    schema: {
                      description: 'inline header schema',
                      deprecated: true
                    }
                  },
                  'RefHeader': {
                    $ref: '#/components/headers/HeaderRef'
                  }
                },
                content: {
                  'application/json': {
                    schema: {
                      type: 'string',
                      deprecated: true,
                    },
                    examples: {},
                  }
                }
              }
            },
            requestBody: {
              content: {
                'application/x-www-form-urlencoded': {
                  schema: {
                    deprecated: true,
                    description: 'schema in request body'
                  }
                }
              }
            }
          },
          post: {
            requestBody: {
              $ref: '#/components/requestBodies/RequestBody'
            },
            responses: {}
          }
        }
      },
      schema: {
        properties: {
          petId: {
            description: 'CommonDeprecatedSchema description',
            type: 'string',
            deprecated: true,
          }
        }
      },
      parameter: {
        name: 'ref param',
        in: 'query',
        schema: {
          type: 'string',
          deprecated: true
        },
      },
      response: {
        description: 'response ref description',
        content: {
          'application/json': {
            schema: {
              description: 'schema in response ref',
              deprecated: true,
            }
          }
        }
      },
      requestBody: {
        content: {
          'text/plain': {
            schema: {
              type: 'string',
              deprecated: true,
            }
          }
        }
      },
      header: {
        schema: {
          description: 'Ref deprecated header',
          deprecated: true,
        }
      }
    })

    const normalizedDocument = normalize(source, { originsFlag: TEST_ORIGINS_FLAG })
    const deprecatedItems = calculateDeprecatedItems(normalizedDocument, TEST_ORIGINS_FLAG)

    expect(deprecatedItems[0]).toEqual(deprecatedItemDescriptionMatcher('[Deprecated] schema in query parameter \'param1\''))
    expect(deprecatedItems[1]).toEqual(deprecatedItemDescriptionMatcher('[Deprecated] schema in header \'InlineHeader\' in response \'403\''))
    expect(deprecatedItems[2]).toEqual(deprecatedItemDescriptionMatcher('[Deprecated] schema in response \'403\' (application/json)'))
    expect(deprecatedItems[3]).toEqual(deprecatedItemDescriptionMatcher('[Deprecated] schema in request body (application/x-www-form-urlencoded)'))
    expect(deprecatedItems[4]).toEqual(deprecatedItemDescriptionMatcher('[Deprecated] schema in \'components.schemas.Single.properties.petId\''))
    expect(deprecatedItems[5]).toEqual(deprecatedItemDescriptionMatcher('[Deprecated] schema in \'components.parameters.parameter1.schema\''))
    expect(deprecatedItems[6]).toEqual(deprecatedItemDescriptionMatcher('[Deprecated] schema in \'components.headers.header1.schema\''))
    expect(deprecatedItems[7]).toEqual(deprecatedItemDescriptionMatcher('[Deprecated] schema in \'components.responses.response1.content.application/json.schema\''))
    expect(deprecatedItems[8]).toEqual(deprecatedItemDescriptionMatcher('[Deprecated] schema in \'components.requestBodies.request1.content.text/plain.schema\''))
  })
})

describe('Deprecated items test', () => {
  test('should find only one declarative deprecated item', () => {
    const DEPRECATED_SCHEMA: OpenAPIV3.SchemaObject & OasDeprecatedMeta = {
      type: 'string',
      deprecated: true,
      'x-deprecated-meta': 'Deprecated schema meta info',
    }

    const source = createOasWithDeprecatedCandidates({
      schema: { DEPRECATED_SCHEMA },
      header: {
        description: 'Header with deprecated schema',
        schema: DEPRECATED_SCHEMA,
      },
      parameter: {
        name: 'param',
        in: 'query',
        schema: DEPRECATED_SCHEMA,
      },
      path: {
        '/users/{id}': {
          get: {
            responses: {
              '200': {
                description: 'Response object',
                content: {
                  'application/json': {
                    schema: DEPRECATED_SCHEMA
                  }
                }
              }
            }
          },
          post: {
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: DEPRECATED_SCHEMA
                }
              }
            },
            responses: {
              '201': {
                description: 'Response object',
                content: {
                  'application/json': {
                    schema: DEPRECATED_SCHEMA
                  }
                }
              }
            }
          }
        }
      },
    })

    const normalizedDocument = normalize(source, { originsFlag: TEST_ORIGINS_FLAG })
    const deprecatedItems = calculateDeprecatedItems(normalizedDocument, TEST_ORIGINS_FLAG)

    expect(deprecatedItems.length).toBe(1)
  })

  test('should be deprecated reason', () => {
    const DEPRECATED_SCHEMA_WITH_CORRECT_META: OpenAPIV3.SchemaObject & OasDeprecatedMeta = {
      type: 'string',
      deprecated: true,
      'x-deprecated-meta': 'Deprecated schema meta info',
    }
    const DEPRECATED_SCHEMA_WITH_INCORRECT_META: OpenAPIV3.SchemaObject & OasDeprecatedMeta = {
      type: 'number',
      deprecated: true,
      'x-deprecated-meta': { // only string should be accepted
        reason: 'Deprecated schema meta info',
      },
    }

    const source = createOasWithDeprecatedCandidates({
      path: {
        '/users/{id}': {
          get: {
            responses: {
              '200': {
                description: 'Response object',
                content: {
                  'application/json': {
                    schema: DEPRECATED_SCHEMA_WITH_CORRECT_META
                  }
                }
              }
            }
          },
          post: {
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: DEPRECATED_SCHEMA_WITH_INCORRECT_META
                }
              }
            },
            responses: {},
          }
        }
      },
    })

    const normalizedDocument = normalize(source, { originsFlag: TEST_ORIGINS_FLAG })
    const deprecatedItems = calculateDeprecatedItems(normalizedDocument, TEST_ORIGINS_FLAG)

    expect(deprecatedItems.length).toBe(2)
    expect(deprecatedItems[0].deprecatedReason).toBe('Deprecated schema meta info')
    expect(deprecatedItems[1].deprecatedReason).toBe(undefined)
  })
})

export function deprecatedItemDescriptionMatcher(
  description: string,
): Matcher {
  return expect.objectContaining({
    description: description,
  })
}

type Matcher = ObjectContaining

