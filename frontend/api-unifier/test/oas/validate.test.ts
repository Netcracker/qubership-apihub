import { syncClone } from '@netcracker/qubership-apihub-json-crawl'
import source30x from '../resources/openapi30x.json'
import source31x from '../resources/openapi31x.json'
import { validate } from '../../src/validate'
import { OpenAPIV3 } from 'openapi-types'

const JSON_SCHEMA_FULLY_CYCLED: Record<PropertyKey, unknown> = {
  type: 'object',
  title: 'str',
  description: 'str',
  format: 'str',
  default: 42,
  multipleOf: 42,
  maximum: 42,
  exclusiveMaximum: 42,
  minimum: 42,
  exclusiveMinimum: 42,
  maxLength: 42,
  minLength: 42,
  pattern: 'str',
  maxItems: 42,
  minItems: 42,
  uniqueItems: true,
  maxProperties: 42,
  minProperties: 42,
  required: ['str'],
  enum: ['str'],
  readOnly: true,
  writeOnly: true,
  examples: ['str'],
  deprecated: true,
  $ref: 'str',
  contentMediaType: 'str',
  const: 42,
  get items() {return JSON_SCHEMA_FULLY_CYCLED},
  get additionalItems() {return JSON_SCHEMA_FULLY_CYCLED},
  properties: {
    get something() {return JSON_SCHEMA_FULLY_CYCLED},
  },
  additionalProperties: {
    get something() {return JSON_SCHEMA_FULLY_CYCLED},
  },
  patternProperties: {
    get something() {return JSON_SCHEMA_FULLY_CYCLED},
  },
  get allOf() {return [JSON_SCHEMA_FULLY_CYCLED]},
  get oneOf() {return [JSON_SCHEMA_FULLY_CYCLED]},
  get anyOf() {return [JSON_SCHEMA_FULLY_CYCLED]},
  get not() {return JSON_SCHEMA_FULLY_CYCLED},
  definitions: {
    get something() {return JSON_SCHEMA_FULLY_CYCLED},
  },
  get propertyNames() {return JSON_SCHEMA_FULLY_CYCLED},
  get contain() {return JSON_SCHEMA_FULLY_CYCLED},
  dependencies: {
    get something() {return JSON_SCHEMA_FULLY_CYCLED},
  },
  defs: {
    get something() {return JSON_SCHEMA_FULLY_CYCLED},
  },
}

const OPEN_API_JSON_SCHEMA_FULLY_CYCLED: Record<PropertyKey, unknown> = {
  type: 'object',
  title: 'str',
  description: 'str',
  format: 'str',
  default: 42,
  multipleOf: 42,
  maximum: 42,
  minimum: 42,
  maxLength: 42,
  minLength: 42,
  pattern: 'str',
  maxItems: 42,
  minItems: 42,
  uniqueItems: true,
  maxProperties: 42,
  minProperties: 42,
  required: ['str'],
  enum: ['str'],
  readOnly: true,
  writeOnly: true,
  deprecated: true,
  $ref: 'str',
  example: 'str',
  examples: ['str'],
  nullable: true,
  exclusiveMaximum: true,
  exclusiveMinimum: true,
  get items() {return OPEN_API_JSON_SCHEMA_FULLY_CYCLED},
  get additionalItems() {return OPEN_API_JSON_SCHEMA_FULLY_CYCLED},
  properties: {
    get something() {return OPEN_API_JSON_SCHEMA_FULLY_CYCLED},
  },
  additionalProperties: {
    get something() {return OPEN_API_JSON_SCHEMA_FULLY_CYCLED},
  },
  get allOf() {return [OPEN_API_JSON_SCHEMA_FULLY_CYCLED]},
  get oneOf() {return [OPEN_API_JSON_SCHEMA_FULLY_CYCLED]},
  get anyOf() {return [OPEN_API_JSON_SCHEMA_FULLY_CYCLED]},
  get not() {return OPEN_API_JSON_SCHEMA_FULLY_CYCLED},
  definitions: {
    get something() {return OPEN_API_JSON_SCHEMA_FULLY_CYCLED},
  },
}

const OPEN_API_EXTERNAL_DOCS = {
  url: 'str',
  description: 'str',
}
const OPEN_API_EXAMPLES = {
  something: {
    description: 'str',
    value: 'str',
    summary: 'str',
    externalValue: 'str',
  },
}
const OPEN_API_CONTENT = {
  something: {
    examples: OPEN_API_EXAMPLES,
    example: 'str',
    schema: OPEN_API_JSON_SCHEMA_FULLY_CYCLED,
    encoding: {
      something: {
        contentType: 'str',
        get headers() {return OPEN_API_HEADERS},
        style: 'str',
        explode: true,
        allowReserved: true,
      },
    },
  },
}
const OPEN_API_HEADERS = {
  something: {
    description: 'str',
    examples: OPEN_API_EXAMPLES,
    required: true,
    example: 'str',
    deprecated: true,
    schema: OPEN_API_JSON_SCHEMA_FULLY_CYCLED,
    allowEmptyValue: true,
    allowReserved: true,
    explode: true,
    style: 'str',
    content: OPEN_API_CONTENT,
  },
}
const OPEN_API_SERVER = {
  url: 'str',
  description: 'str',
  variables: {
    something: {
      default: 'str',
      description: 'str',
      enum: ['str'],
    },
  },
}
const OPEN_API_LINKS = {
  something: {
    description: 'str',
    operationId: 'str',
    operationRef: 'str',
    server: OPEN_API_SERVER,
    parameters: {
      something: 'str',
    },
    requestBody: 'str',
  },
}
const OPEN_API_RESPONSES = {
  something: {
    description: 'str',
    headers: OPEN_API_HEADERS,
    content: OPEN_API_CONTENT,
    links: OPEN_API_LINKS,
  },
}
const OPEN_API_PARAMETER = {
  description: 'str',
  examples: OPEN_API_EXAMPLES,
  required: true,
  example: 'str',
  deprecated: true,
  schema: OPEN_API_JSON_SCHEMA_FULLY_CYCLED,
  allowEmptyValue: true,
  allowReserved: true,
  explode: true,
  style: 'str',
  content: OPEN_API_CONTENT,
  name: 'str',
  in: 'str',
}
const OPEN_API_PARAMETERS = {
  something: OPEN_API_PARAMETER,
}
const OPEN_API_REQUEST_BODY = {
  description: 'str',
  content: OPEN_API_CONTENT,
  required: true,
}
const OPEN_API_REQUEST_BODIES = {
  something: OPEN_API_REQUEST_BODY,
}
const OPEN_API_SECURITY = [
  {
    something: ['str'],
  },
]
const FULLY_CYCLED_OPEN_API: OpenAPIV3.Document = {
  openapi: '3.0.1',
  info: {
    description: 'str',
    title: 'str',
    version: 'str',
    termsOfService: 'str',
    contact: {
      name: 'str',
      url: 'str',
      email: 'str',
    },
    license: {
      name: 'str',
      url: 'str',
    },
  },
  tags: [
    {
      name: 'str',
      description: 'str',
      externalDocs: OPEN_API_EXTERNAL_DOCS,
    },
  ],
  externalDocs: OPEN_API_EXTERNAL_DOCS,
  servers: [
    OPEN_API_SERVER,
  ],
  security: OPEN_API_SECURITY,
  components: {
    schemas: {
      something: OPEN_API_JSON_SCHEMA_FULLY_CYCLED,
    },
    responses: OPEN_API_RESPONSES,
    examples: OPEN_API_EXAMPLES,
    headers: OPEN_API_HEADERS,
    links: OPEN_API_LINKS,
    securitySchemes: {
      http: {
        type: 'http',
        description: 'str',
        scheme: 'str',
        bearerFormat: 'str',
      },
      apiKey: {
        type: 'apiKey',
        description: 'str',
        name: 'str',
        in: 'str',
      },
      oauth2: {
        type: 'oauth2',
        description: 'str',
        flows: {
          implicit: {
            authorizationUrl: 'str',
            refreshUrl: 'str',
            scopes: {
              something: 'str',
            },
          },
          password: {
            tokenUrl: 'str',
            refreshUrl: 'str',
            scopes: {
              something: 'str',
            },
          },
          authorizationCode: {
            refreshUrl: 'str',
            authorizationUrl: 'str',
            tokenUrl: 'str',
            scopes: {
              something: 'str',
            },
          },
          clientCredentials: {
            refreshUrl: 'str',
            tokenUrl: 'str',
            scopes: {
              something: 'str',
            },
          },
        },
      },
      openIdConnect: {
        type: 'openIdConnect',
        description: 'str',
        openIdConnectUrl: 'str',
      },
    },
    parameters: OPEN_API_PARAMETERS,
    requestBodies: OPEN_API_REQUEST_BODIES,
  },
  paths: {
    something: {
      description: 'str',
      parameters: [OPEN_API_PARAMETER],
      get: {
        description: 'str',
        parameters: [OPEN_API_PARAMETER],
        deprecated: true,
        responses: OPEN_API_RESPONSES,
        requestBody: OPEN_API_REQUEST_BODY,
        summary: 'str',
        operationId: 'str',
        externalDocs: OPEN_API_EXTERNAL_DOCS,
        servers: [OPEN_API_SERVER],
        security: OPEN_API_SECURITY,
        tags: ['str'],
      },
    },
  },
}

function changeDeepValueTypes(data: unknown): Record<PropertyKey, unknown> {
  return syncClone(data, ({ key, value }) => {
    if (!value) {
      return { done: true }
    }
    switch (typeof value) {
      case 'string':
      case 'number':
      case 'boolean':
        return { value: () => {} }
      case 'object': {
        if (key !== undefined && (value === JSON_SCHEMA_FULLY_CYCLED || Object.keys(value).length === 0)) {
          return { value: () => {} }
        }
      }
    }
  }) as Record<PropertyKey, unknown>
}

function changeRootValueTypes(data: unknown): Record<PropertyKey, unknown> {
  return syncClone(data, ({ key, value }) => {
    if (!value) {
      return { done: true }
    }
    switch (typeof value) {
      case 'string':
      case 'number':
      case 'boolean':
        return { value: () => {} }
      case 'object': {
        if (key !== undefined) {
          return { value: () => {} }
        }
      }
    }
  }) as Record<PropertyKey, unknown>
}

describe('validate', () => {

  it('valid jsonschema', () => {
    const errors: string[] = []
    const result = validate({
      superType: 'meta',
      type: 'meta',
    }, { validate: true, onValidateError: message => errors.push(message) })
    expect(result).toEqual({})
    expect(errors).toMatchObject([
      expect.stringMatching(/unexpected/),
      expect.stringMatching(/match/),
    ])
  })

  it('valid jsonschema', () => {
    const result = validate(JSON_SCHEMA_FULLY_CYCLED, { validate: true })
    expect(result).toEqual(JSON_SCHEMA_FULLY_CYCLED)
  })

  it('invalid jsonschema. deep', () => {
    const invalidInDeep = changeDeepValueTypes(JSON_SCHEMA_FULLY_CYCLED)
    const result = validate(invalidInDeep, { validate: true })
    expect(result).toEqual({
      properties: {},
      additionalProperties: {},
      patternProperties: {},
      allOf: [],
      oneOf: [],
      anyOf: [],
      definitions: {},
      defs: {},
      dependencies: {},
      enum: [],
      examples: [],
      required: [],
    })
  })

  it('type=null non allowed on openapi 3.0', () => {
    const result = validate({
      openapi: '3.0.1',
      components: {
        schemas: {
          null: {
            oneOf: [
              { type: 'null' },
              { type: 'string' },
            ],
          },
        },
      },
    }, { validate: true })
    expect(result).toEqual(
      {
        openapi: '3.0.1',
        components: {
          schemas: {
            null: {
              oneOf: [
                {},
                { type: 'string' },
              ],
            },
          },
        },
      },
    )
  })

  it('invalid jsonschema. root', () => {
    const invalidInRoot = changeRootValueTypes(JSON_SCHEMA_FULLY_CYCLED)
    const result = validate(invalidInRoot, { validate: true })
    expect(result).toEqual({})
  })

  it('openapi 3.0. valid', () => {
    const result = validate(FULLY_CYCLED_OPEN_API, { validate: true })
    expect(result).toEqual(FULLY_CYCLED_OPEN_API)
  })

  it('openapi 3.0. invalid. deep', () => {
    const invalid = {
      ...changeDeepValueTypes(source30x),
      openapi: '3.0.2',
    }
    const result = validate(invalid, { validate: true })
    expect(result).toEqual({
      openapi: '3.0.2',
      paths: {
        '/pets': {
          patch: {
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    oneOf: [
                      {},
                      {},
                    ],
                    discriminator: {},
                  },
                },
              },
            },
            responses: {
              200: {},
            },
          },
        },
      },
      components: {
        schemas: {
          Pet: {
            required: [],
            properties: {
              'pet_type': {},
            },
            discriminator: {},
          },
          Dog: {
            allOf: [
              {},
              {
                properties: {
                  bark: {},
                  breed: {
                    enum: [],
                  },
                },
              },
            ],
          },
          Cat: {
            allOf: [
              {},
              {
                properties: {
                  hunts: {},
                  age: {},
                },
              },
            ],
          },
        },
      },
    })
  })

  it('openapi 3.0. invalid. root', () => {
    const invalid = {
      ...changeRootValueTypes(source30x),
      openapi: '3.0.2',
    }
    const result = validate(invalid, { validate: true })
    expect(result).toEqual({ openapi: '3.0.2' })
  })

  it('openapi 3.1. valid', () => {
    const result = validate(source31x, { validate: true })
    expect(result).toEqual(source31x)
  })

  it('filter symbols', () => {
    const ignoreMe = Symbol('ignore-me')
    const removeMe = Symbol('remove-me')
    const result = validate({
      title: 'Title',
      [ignoreMe]: {
        title: 'Ignore Title',
      },
      [removeMe]: {
        title: 'Remove Title',
      },
    }, { validate: true, syntheticTitleFlag: ignoreMe })
    expect(result).toEqual({
      title: 'Title',
      [ignoreMe]: {
        title: 'Ignore Title',
      },
    })
  })
})