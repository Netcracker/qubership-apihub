import { normalize, NormalizeOptions, OpenApiExtensionKey } from '../../src'

const DEFAULT_OPTIONS: NormalizeOptions = {
  resolveRef: false,
  mergeAllOf: false,
  removeOasExtensions: true,
  shouldRemoveOasExtension: () => true,
}

function createFullyCycledOpenApi(includeExtensions: (extensionKey?: OpenApiExtensionKey) => boolean, extension: unknown = 'example'): Record<PropertyKey, unknown> {
  const OPEN_API_EXTERNAL_DOCS = {
    ...(includeExtensions() ? { 'x-externalDocs-extension': extension } : {}),
    url: 'str',
    description: 'str',
  }

  const OPEN_API_JSON_SCHEMA_FULLY_CYCLED = {
    ...(includeExtensions() ? { 'x-schema-extension': extension } : {}),
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
    items: null as any,
    additionalItems: null as any,
    properties: {
      something: null as any,
    },
    additionalProperties: {
      something: null as any,
    },
    allOf: null as any,
    oneOf: null as any,
    anyOf: null as any,
    not: null as any,
    definitions: {
      something: null as any,
    },
    externalDocs: OPEN_API_EXTERNAL_DOCS,
    xml: {
      name: 'user',
      ...(includeExtensions() ? { 'x-xml-extension': extension } : {}),
    },
  }

  OPEN_API_JSON_SCHEMA_FULLY_CYCLED['items'] = OPEN_API_JSON_SCHEMA_FULLY_CYCLED
  OPEN_API_JSON_SCHEMA_FULLY_CYCLED['additionalItems'] = OPEN_API_JSON_SCHEMA_FULLY_CYCLED
  OPEN_API_JSON_SCHEMA_FULLY_CYCLED['properties']['something'] = OPEN_API_JSON_SCHEMA_FULLY_CYCLED
  OPEN_API_JSON_SCHEMA_FULLY_CYCLED['additionalProperties']['something'] = OPEN_API_JSON_SCHEMA_FULLY_CYCLED
  OPEN_API_JSON_SCHEMA_FULLY_CYCLED['allOf'] = [OPEN_API_JSON_SCHEMA_FULLY_CYCLED]
  OPEN_API_JSON_SCHEMA_FULLY_CYCLED['oneOf'] = [OPEN_API_JSON_SCHEMA_FULLY_CYCLED]
  OPEN_API_JSON_SCHEMA_FULLY_CYCLED['anyOf'] = [OPEN_API_JSON_SCHEMA_FULLY_CYCLED]
  OPEN_API_JSON_SCHEMA_FULLY_CYCLED['not'] = OPEN_API_JSON_SCHEMA_FULLY_CYCLED
  OPEN_API_JSON_SCHEMA_FULLY_CYCLED['definitions']['something'] = OPEN_API_JSON_SCHEMA_FULLY_CYCLED

  const OPEN_API_EXAMPLES = {
    something: {
      ...(includeExtensions() ? { 'x-example-extension': extension } : {}),
      description: 'str',
      value: 'str',
      summary: 'str',
      externalValue: 'str',
    },
  }
  const OPEN_API_CONTENT = {
    something: {
      ...(includeExtensions() ? { 'x-mediaType-extension': extension } : {}),
      examples: OPEN_API_EXAMPLES,
      example: 'str',
      schema: { ...OPEN_API_JSON_SCHEMA_FULLY_CYCLED },
      encoding: {
        something: {
          ...(includeExtensions() ? { 'x-encoding-extension': extension } : {}),
          contentType: 'str',
          headers: null as any,
          style: 'str',
          explode: true,
          allowReserved: true,
        },
      },
    },
  }
  const OPEN_API_HEADERS: Record<PropertyKey, unknown> = {
    something: {
      ...(includeExtensions() ? { 'x-header-extension': extension } : {}),
      description: 'str',
      examples: OPEN_API_EXAMPLES,
      required: true,
      example: 'str',
      deprecated: true,
      schema: { ...OPEN_API_JSON_SCHEMA_FULLY_CYCLED },
      allowEmptyValue: true,
      allowReserved: true,
      explode: true,
      style: 'str',
      content: OPEN_API_CONTENT,
    },
  }

  OPEN_API_CONTENT.something.encoding.something.headers = OPEN_API_HEADERS

  const OPEN_API_SERVER = {
    ...(includeExtensions() ? { 'x-server-extension': extension } : {}),
    url: 'str',
    description: 'str',
    variables: {
      something: {
        ...(includeExtensions() ? { 'x-serverVariable-extension': extension } : {}),
        default: 'str',
        description: 'str',
        enum: ['str'],
      },
    },
  }
  const OPEN_API_LINKS = {
    something: {
      ...(includeExtensions() ? { 'x-link-extension': extension } : {}),
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
  const OPEN_API_RESPONSE = {
    ...(includeExtensions('x-response-extension') ? { 'x-response-extension': extension } : {}),
    description: 'str',
    headers: OPEN_API_HEADERS,
    content: OPEN_API_CONTENT,
    links: OPEN_API_LINKS,
  }
  const OPEN_API_RESPONSES = {
    ...(includeExtensions() ? { 'x-responses-extension': extension } : {}),
    something: OPEN_API_RESPONSE,
  }
  const OPEN_API_PARAMETER = {
    ...(includeExtensions() ? { 'x-parameter-extension': extension } : {}),
    description: 'str',
    examples: OPEN_API_EXAMPLES,
    required: true,
    example: 'str',
    deprecated: true,
    schema: { ...OPEN_API_JSON_SCHEMA_FULLY_CYCLED },
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
    ...(includeExtensions() ? { 'x-requestBody-extension': extension } : {}),
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
  const OPEN_API_PATH_ITEM = {
    ...(includeExtensions() ? { 'x-pathItem-extension': extension } : {}),
    description: 'str',
    parameters: [OPEN_API_PARAMETER],
    servers: [OPEN_API_SERVER],
    get: {
      ...(includeExtensions() ? { 'x-operation-extension': extension } : {}),
      description: 'str',
      parameters: [OPEN_API_PARAMETER],
      deprecated: true,
      responses: OPEN_API_RESPONSES,
      callbacks: {
        onSomething: null as any,
      },
      requestBody: OPEN_API_REQUEST_BODY,
      summary: 'str',
      operationId: 'str',
      externalDocs: OPEN_API_EXTERNAL_DOCS,
      servers: [OPEN_API_SERVER],
      security: OPEN_API_SECURITY,
      tags: ['str'],
    },
  }
  const OPEN_API_CALLBACK = {
    ...(includeExtensions() ? { 'x-callback-extension': extension } : {}),
    '{$request.body#/callbackUrl}': OPEN_API_PATH_ITEM,
  }

  OPEN_API_PATH_ITEM.get.callbacks.onSomething = OPEN_API_CALLBACK

  const OPEN_API_PATHS = {
    ...(includeExtensions() ? { 'x-paths-extension': extension } : {}),
    '/something': OPEN_API_PATH_ITEM,
  }
  return {
    ...(includeExtensions() ? { 'x-root-extension': extension } : {}),
    openapi: '3.0.1',
    info: {
      ...(includeExtensions() ? { 'x-info-extension': extension } : {}),
      description: 'str',
      title: 'str',
      version: 'str',
      termsOfService: 'str',
      contact: {
        ...(includeExtensions() ? { 'x-contact-extension': extension } : {}),
        name: 'str',
        url: 'str',
        email: 'str',
      },
      license: {
        ...(includeExtensions() ? { 'x-license-extension': extension } : {}),
        name: 'str',
        url: 'str',
      },
    },
    tags: [
      {
        ...(includeExtensions('x-tag-extension') ? { 'x-tag-extension': extension } : {}),
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
      ...(includeExtensions() ? { 'x-components-extension': extension } : {}),
      schemas: {
        something: { ...OPEN_API_JSON_SCHEMA_FULLY_CYCLED },
      },
      responses: {
        something: OPEN_API_RESPONSE,
      },
      examples: OPEN_API_EXAMPLES,
      headers: OPEN_API_HEADERS,
      links: OPEN_API_LINKS,
      callbacks: {
        onSomething: OPEN_API_CALLBACK,
      },
      securitySchemes: {
        http: {
          ...(includeExtensions() ? { 'x-httpSecurityScheme-extension': extension } : {}),
          type: 'http',
          description: 'str',
          scheme: 'str',
          bearerFormat: 'str',
        },
        apiKey: {
          ...(includeExtensions() ? { 'x-securityScheme-extension': extension } : {}),
          type: 'apiKey',
          description: 'str',
          name: 'str',
          in: 'str',
        },
        oauth2: {
          ...(includeExtensions() ? { 'x-oauth2SecurityScheme-extension': extension } : {}),
          type: 'oauth2',
          description: 'str',
          flows: {
            ...(includeExtensions() ? { 'x-oauthFlows-extension': extension } : {}),
            implicit: {
              ...(includeExtensions() ? { 'x-oauthImplicitFlow-extension': extension } : {}),
              authorizationUrl: 'str',
              refreshUrl: 'str',
              scopes: {
                something: 'str',
              },
            },
            password: {
              ...(includeExtensions() ? { 'x-oauthPasswordFlow-extension': extension } : {}),
              tokenUrl: 'str',
              refreshUrl: 'str',
              scopes: {
                something: 'str',
              },
            },
            authorizationCode: {
              ...(includeExtensions() ? { 'x-oauthAuthorizationCodeFlow-extension': extension } : {}),
              refreshUrl: 'str',
              authorizationUrl: 'str',
              tokenUrl: 'str',
              scopes: {
                something: 'str',
              },
            },
            clientCredentials: {
              ...(includeExtensions('x-oauthClientCredentialsFlow-extension') ? { 'x-oauthClientCredentialsFlow-extension': extension } : {}),
              refreshUrl: 'str',
              tokenUrl: 'str',
              scopes: {
                something: 'str',
              },
            },
          },
        },
        openIdConnect: {
          ...(includeExtensions() ? { 'x-openIdConnectSecurityScheme-extension': extension } : {}),
          type: 'openIdConnect',
          description: 'str',
          openIdConnectUrl: 'str',
        },
      },
      parameters: OPEN_API_PARAMETERS,
      requestBodies: OPEN_API_REQUEST_BODIES,
    },
    paths: OPEN_API_PATHS,
  }
}

describe('remove OAS extensions', () => {
  it('removes OAS extensions', () => {
    const normalizedSchema = normalize(createFullyCycledOpenApi(() => true), DEFAULT_OPTIONS)
    expect(normalizedSchema).toEqual(createFullyCycledOpenApi(() => false))
  })

  it('removes array OAS extensions', () => {
    const normalizedSchema = normalize(createFullyCycledOpenApi(() => true, ['extension1', 'extension2', 'extension3']), DEFAULT_OPTIONS)
    expect(normalizedSchema).toEqual(createFullyCycledOpenApi(() => false))
  })

  it('removes object OAS extensions', () => {
    const normalizedSchema = normalize(createFullyCycledOpenApi(() => true, { 'x-extension': { 'x-extension': 'example' } }), DEFAULT_OPTIONS)
    expect(normalizedSchema).toEqual(createFullyCycledOpenApi(() => false))
  })

  it('does not remove allowed OAS extensions', () => {
    const allowedExtensions: OpenApiExtensionKey[] = [
      'x-response-extension',
      'x-oauthClientCredentialsFlow-extension',
      'x-tag-extension',
    ]
    const normalizedSchema = normalize(
      createFullyCycledOpenApi(() => true),
      { ...DEFAULT_OPTIONS, shouldRemoveOasExtension: (key) => !allowedExtensions.includes(key) },
    )
    expect(normalizedSchema).toEqual(createFullyCycledOpenApi((key) =>
      Boolean(key && allowedExtensions.includes(key)),
    ))
  })
})
