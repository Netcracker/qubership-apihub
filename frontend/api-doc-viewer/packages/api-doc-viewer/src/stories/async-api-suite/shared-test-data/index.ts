export const EXTENSIONS: Record<string, unknown> = {
  'x-first': 'first',
  'x-second': [1, 2, 3],
  'x-third': {
    fourth: 'fourth',
  },
}

export const BINDING_WITH_PRIMITIVE_PROPS = {
  bindingVersion: "0.5.0",
  num: 123,
  str: "string",
}

export const BINDING_WITH_OBJECT_PROPS = {
  bindingVersion: "0.5.0",
  obj: { str: "string value" },
  complexObj: {
    nestedObj: { num: 2222 }
  },
}

export const BINDING_WITH_SCHEMA_PROPS = {
  bindingVersion: "0.5.0",
  notSchema: true,
  stringSch: {
    type: 'string',
    description: 'String schema',
    minLength: 1,
    maxLength: 10
  },
  objectSch: {
    type: 'object',
    properties: {
      str: {
        type: 'string',
        description: 'Object string property',
        enum: ['aaa', 'bbb', 'ccc'],
      }
    }
  },
}

export const BINDINGS_WITH_SCHEMA_FOO_REF = {
  kafka: {
    bindingVersion: "0.5.0",
    foo: {
      $ref: '#/components/schemas/foo'
    }
  }
}

export const CIRCULAR_SCHEMA_KIND_A = {
  foo: {
    properties: {
      bar: {
        properties: {
          foo: { $ref: '#/components/schemas/foo' },
        },
      },
    },
  },
}

export const CIRCULAR_SCHEMA_KIND_B = {
  foo: {
    properties: {
      bar: { $ref: '#/components/schemas/bar' },
    },
  },
  bar: {
    properties: {
      foo: { $ref: '#/components/schemas/foo' },
    },
  },
  summary: {
    items: [
      { $ref: '#/components/schemas/foo' },
      { $ref: '#/components/schemas/bar' },
    ],
  },
}

export const JSON_SCHEMA_IN_EXTENSIONS = {
  'x-json-schema': {
    type: 'string',
    description: 'Json Schema in extensions',
  }
}

export const TEST_REFERENCE_NAME_PROPERTY = Symbol('test-reference-name-property')
