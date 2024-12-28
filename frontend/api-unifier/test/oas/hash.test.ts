import { normalize, NormalizeOptions, setJsoProperty } from '../../src'
import {
  checkHashesEqualByPath,
  checkHashesNotEqualByPath,
  countUniqueHashes,
  createOas,
  createOasWithParameters,
  TEST_HASH_FLAG,
  TEST_ORIGINS_FLAG,
  TEST_PARAMETER_NAME,
  TEST_SCHEMA_NAME,
} from '../helpers'

import petstore from '../resources/petstore.json'

const DEFAULT_OPTIONS: NormalizeOptions = {
  hashFlag: TEST_HASH_FLAG,
}

describe('hash', () => {
  it('title does not affect hash', () => {
    const data1 = createOas({
      title: 'Some Schema 1',
      type: 'string',
    })
    const data2 = createOas({
      title: 'Some Schema 2',
      type: 'string',
    })

    const result1 = normalize(data1, DEFAULT_OPTIONS)
    const result2 = normalize(data2, DEFAULT_OPTIONS)
    checkHashesEqualByPath(result1, result2, ['components', 'schemas', TEST_SCHEMA_NAME])
  })

  it('type affects hash', () => {
    const data1 = createOas({ type: 'string' })
    const data2 = createOas({ type: 'number' })

    const result1 = normalize(data1, DEFAULT_OPTIONS)
    const result2 = normalize(data2, DEFAULT_OPTIONS)
    checkHashesNotEqualByPath(result1, result2, ['components', 'schemas', TEST_SCHEMA_NAME])
  })

  it('format affects hash', () => {
    const data1 = createOas({ format: 'uri' })
    const data2 = createOas({ format: 'ip' })

    const result1 = normalize(data1, DEFAULT_OPTIONS)
    const result2 = normalize(data2, DEFAULT_OPTIONS)
    checkHashesNotEqualByPath(result1, result2, ['components', 'schemas', TEST_SCHEMA_NAME])
  })

  it('default affects hash', () => {
    const data1 = createOas({ default: 'first sample' })
    const data2 = createOas({ default: 'last sample' })

    const result1 = normalize(data1, DEFAULT_OPTIONS)
    const result2 = normalize(data2, DEFAULT_OPTIONS)
    checkHashesNotEqualByPath(result1, result2, ['components', 'schemas', TEST_SCHEMA_NAME])
  })

  it('multipleOf affects hash', () => {
    const data1 = createOas({ multipleOf: 2 })
    const data2 = createOas({ multipleOf: 3 })

    const result1 = normalize(data1, DEFAULT_OPTIONS)
    const result2 = normalize(data2, DEFAULT_OPTIONS)
    checkHashesNotEqualByPath(result1, result2, ['components', 'schemas', TEST_SCHEMA_NAME])
  })

  it('maximum affects hash', () => {
    const data1 = createOas({ maximum: 2 })
    const data2 = createOas({ maximum: 3 })

    const result1 = normalize(data1, DEFAULT_OPTIONS)
    const result2 = normalize(data2, DEFAULT_OPTIONS)
    checkHashesNotEqualByPath(result1, result2, ['components', 'schemas', TEST_SCHEMA_NAME])
  })

  it('exclusiveMaximum affects hash', () => {
    const data1 = createOas({ exclusiveMaximum: true })
    const data2 = createOas({ exclusiveMaximum: false })

    const result1 = normalize(data1, DEFAULT_OPTIONS)
    const result2 = normalize(data2, DEFAULT_OPTIONS)
    checkHashesNotEqualByPath(result1, result2, ['components', 'schemas', TEST_SCHEMA_NAME])
  })

  it('minimum affects hash', () => {
    const data1 = createOas({ minimum: 2 })
    const data2 = createOas({ minimum: 3 })

    const result1 = normalize(data1, DEFAULT_OPTIONS)
    const result2 = normalize(data2, DEFAULT_OPTIONS)
    checkHashesNotEqualByPath(result1, result2, ['components', 'schemas', TEST_SCHEMA_NAME])
  })

  it('exclusiveMinimum affects hash', () => {
    const data1 = createOas({ exclusiveMinimum: true })
    const data2 = createOas({ exclusiveMinimum: false })

    const result1 = normalize(data1, DEFAULT_OPTIONS)
    const result2 = normalize(data2, DEFAULT_OPTIONS)
    checkHashesNotEqualByPath(result1, result2, ['components', 'schemas', TEST_SCHEMA_NAME])
  })

  it('maxLength affects hash', () => {
    const data1 = createOas({ maxLength: 5 })
    const data2 = createOas({ maxLength: 10 })

    const result1 = normalize(data1, DEFAULT_OPTIONS)
    const result2 = normalize(data2, DEFAULT_OPTIONS)
    checkHashesNotEqualByPath(result1, result2, ['components', 'schemas', TEST_SCHEMA_NAME])
  })

  it('minLength affects hash', () => {
    const data1 = createOas({ minLength: 5 })
    const data2 = createOas({ minLength: 10 })

    const result1 = normalize(data1, DEFAULT_OPTIONS)
    const result2 = normalize(data2, DEFAULT_OPTIONS)
    checkHashesNotEqualByPath(result1, result2, ['components', 'schemas', TEST_SCHEMA_NAME])
  })

  it('pattern affects hash', () => {
    const data1 = createOas({ pattern: 'qwe' })
    const data2 = createOas({ pattern: 'asd' })

    const result1 = normalize(data1, DEFAULT_OPTIONS)
    const result2 = normalize(data2, DEFAULT_OPTIONS)
    checkHashesNotEqualByPath(result1, result2, ['components', 'schemas', TEST_SCHEMA_NAME])
  })

  it('maxItems affects hash', () => {
    const data1 = createOas({ maxItems: 10 })
    const data2 = createOas({ maxItems: 5 })

    const result1 = normalize(data1, DEFAULT_OPTIONS)
    const result2 = normalize(data2, DEFAULT_OPTIONS)
    checkHashesNotEqualByPath(result1, result2, ['components', 'schemas', TEST_SCHEMA_NAME])
  })

  it('minItems affects hash', () => {
    const data1 = createOas({ minItems: 10 })
    const data2 = createOas({ minItems: 5 })

    const result1 = normalize(data1, DEFAULT_OPTIONS)
    const result2 = normalize(data2, DEFAULT_OPTIONS)
    checkHashesNotEqualByPath(result1, result2, ['components', 'schemas', TEST_SCHEMA_NAME])
  })

  it('uniqueItems affects hash', () => {
    const data1 = createOas({ uniqueItems: true })
    const data2 = createOas({ uniqueItems: false })

    const result1 = normalize(data1, DEFAULT_OPTIONS)
    const result2 = normalize(data2, DEFAULT_OPTIONS)
    checkHashesNotEqualByPath(result1, result2, ['components', 'schemas', TEST_SCHEMA_NAME])
  })

  it('maxProperties affects hash', () => {
    const data1 = createOas({ maxProperties: 10 })
    const data2 = createOas({ maxProperties: 5 })

    const result1 = normalize(data1, DEFAULT_OPTIONS)
    const result2 = normalize(data2, DEFAULT_OPTIONS)
    checkHashesNotEqualByPath(result1, result2, ['components', 'schemas', TEST_SCHEMA_NAME])
  })

  it('minProperties affects hash', () => {
    const data1 = createOas({ minProperties: 10 })
    const data2 = createOas({ minProperties: 5 })

    const result1 = normalize(data1, DEFAULT_OPTIONS)
    const result2 = normalize(data2, DEFAULT_OPTIONS)
    checkHashesNotEqualByPath(result1, result2, ['components', 'schemas', TEST_SCHEMA_NAME])
  })

  it('item type in items array affects hash (openapi 3.1.0)', () => {
    const data1 = createOas({
      type: 'object',
      items: [{
        type: 'number',
      }],
    }, '3.1.0')

    const data2 = createOas({
      type: 'object',
      items: [{
        type: 'string',
      }],
    }, '3.1.0')

    const result1 = normalize(data1, DEFAULT_OPTIONS)
    const result2 = normalize(data2, DEFAULT_OPTIONS)
    checkHashesNotEqualByPath(result1, result2, ['components', 'schemas', TEST_SCHEMA_NAME])
  })

  it('item title in items array does not affect hash (openapi 3.1.0)', () => {
    const data1 = createOas({
      type: 'object',
      items: [{
        title: 'Some Schema 1',
        type: 'string',
      }],
    }, '3.1.0')

    const data2 = createOas({
      type: 'object',
      items: [{
        title: 'Some Schema 2',
        type: 'string',
      }],
    }, '3.1.0')

    const result1 = normalize(data1, DEFAULT_OPTIONS)
    const result2 = normalize(data2, DEFAULT_OPTIONS)
    checkHashesEqualByPath(result1, result2, ['components', 'schemas', TEST_SCHEMA_NAME])
  })

  it('item type in items object affects hash (openapi 3.1.0)', () => {
    const data1 = createOas({
      type: 'object',
      items: {
        type: 'number',
      },
    }, '3.1.0')

    const data2 = createOas({
      type: 'object',
      items: {
        type: 'string',
      },
    }, '3.1.0')

    const result1 = normalize(data1, DEFAULT_OPTIONS)
    const result2 = normalize(data2, DEFAULT_OPTIONS)
    checkHashesNotEqualByPath(result1, result2, ['components', 'schemas', TEST_SCHEMA_NAME])
  })

  it('item title in items object does not affect hash (openapi 3.1.0)', () => {
    const data1 = createOas({
      type: 'object',
      items: {
        title: 'Some Schema 1',
        type: 'string',
      },
    }, '3.1.0')

    const data2 = createOas({
      type: 'object',
      items: {
        title: 'Some Schema 2',
        type: 'string',
      },
    }, '3.1.0')

    const result1 = normalize(data1, DEFAULT_OPTIONS)
    const result2 = normalize(data2, DEFAULT_OPTIONS)
    checkHashesEqualByPath(result1, result2, ['components', 'schemas', TEST_SCHEMA_NAME])
  })

  it('other item fields do not affect hash (openapi 3.1.0)', () => {
    const data1 = createOas({
      type: 'object',
      items: {
        type: 'number',
        minimum: 2,
        default: 0,
      },
    }, '3.1.0')

    const data2 = createOas({
      type: 'object',
      items: {
        type: 'number',
        minimum: 3,
        default: 5,
      },
    }, '3.1.0')

    const result1 = normalize(data1, DEFAULT_OPTIONS)
    const result2 = normalize(data2, DEFAULT_OPTIONS)
    checkHashesEqualByPath(result1, result2, ['components', 'schemas', TEST_SCHEMA_NAME])
  })

  it('item type in items object affects hash (openapi 3.0.0)', () => {
    const data1 = createOas({
      type: 'object',
      items: {
        type: 'number',
      },
    }, '3.0.0')

    const data2 = createOas({
      type: 'object',
      items: {
        type: 'string',
      },
    }, '3.0.0')

    const result1 = normalize(data1, DEFAULT_OPTIONS)
    const result2 = normalize(data2, DEFAULT_OPTIONS)
    checkHashesNotEqualByPath(result1, result2, ['components', 'schemas', TEST_SCHEMA_NAME])
  })

  it('item title in items object does not affect hash (openapi 3.0.0)', () => {
    const data1 = createOas({
      type: 'object',
      items: {
        title: 'Some Schema 1',
        type: 'string',
      },
    }, '3.0.0')

    const data2 = createOas({
      type: 'object',
      items: {
        title: 'Some Schema 2',
        type: 'string',
      },
    }, '3.0.0')

    const result1 = normalize(data1, DEFAULT_OPTIONS)
    const result2 = normalize(data2, DEFAULT_OPTIONS)
    checkHashesEqualByPath(result1, result2, ['components', 'schemas', TEST_SCHEMA_NAME])
  })

  it('other item fields do not affect hash (openapi 3.0.0)', () => {
    const data1 = createOas({
      type: 'object',
      items: {
        type: 'number',
        minimum: 2,
        default: 0,
      },
    }, '3.0.0')

    const data2 = createOas({
      type: 'object',
      items: {
        type: 'number',
        minimum: 3,
        default: 5,
      },
    }, '3.0.0')

    const result1 = normalize(data1, DEFAULT_OPTIONS)
    const result2 = normalize(data2, DEFAULT_OPTIONS)
    checkHashesEqualByPath(result1, result2, ['components', 'schemas', TEST_SCHEMA_NAME])
  })

  it('additionalItems type affects hash (openapi 3.1.0)', () => {
    const data1 = createOas({
      type: 'object',
      additionalItems: {
        type: 'number',
      },
    }, '3.1.0')

    const data2 = createOas({
      type: 'object',
      additionalItems: {
        type: 'string',
      },
    }, '3.1.0')

    const result1 = normalize(data1, DEFAULT_OPTIONS)
    const result2 = normalize(data2, DEFAULT_OPTIONS)
    checkHashesNotEqualByPath(result1, result2, ['components', 'schemas', TEST_SCHEMA_NAME])
  })

  it('additionalItems title does not affect hash (openapi 3.1.0)', () => {
    const data1 = createOas({
      type: 'object',
      additionalItems: {
        title: 'Some Schema 1',
        type: 'string',
      },
    }, '3.1.0')

    const data2 = createOas({
      type: 'object',
      additionalItems: {
        title: 'Some Schema 2',
        type: 'string',
      },
    }, '3.1.0')

    const result1 = normalize(data1, DEFAULT_OPTIONS)
    const result2 = normalize(data2, DEFAULT_OPTIONS)
    checkHashesEqualByPath(result1, result2, ['components', 'schemas', TEST_SCHEMA_NAME])
  })

  it('boolean additionalItems affects hash (openapi 3.1.0)', () => {
    const data1 = createOas({
      type: 'object',
      additionalItems: true,
    }, '3.1.0')

    const data2 = createOas({
      type: 'object',
      additionalItems: false,
    }, '3.1.0')

    const result1 = normalize(data1, DEFAULT_OPTIONS)
    const result2 = normalize(data2, DEFAULT_OPTIONS)
    checkHashesNotEqualByPath(result1, result2, ['components', 'schemas', TEST_SCHEMA_NAME])
  })

  it('none of the additionalItems properties affect hash (openapi 3.0.0)', () => {
    const data1 = createOas({
      type: 'object',
      additionalItems: {
        title: 'Some Schema 1',
        type: 'string',
        uniqueItems: true,
      },
    }, '3.0.0')

    const data2 = createOas({
      type: 'object',
      additionalItems: {
        title: 'Some Schema 2',
        type: 'number',
        uniqueItems: false,
      },
    }, '3.0.0')

    const result1 = normalize(data1, DEFAULT_OPTIONS)
    const result2 = normalize(data2, DEFAULT_OPTIONS)
    checkHashesEqualByPath(result1, result2, ['components', 'schemas', TEST_SCHEMA_NAME])
  })

  it('required affects hash', () => {
    const data1 = createOas({ required: ['prop2', 'prop1'] })
    const data2 = createOas({ required: ['prop3'] })

    const result1 = normalize(data1, DEFAULT_OPTIONS)
    const result2 = normalize(data2, DEFAULT_OPTIONS)
    checkHashesNotEqualByPath(result1, result2, ['components', 'schemas', TEST_SCHEMA_NAME])
  })

  it('required order does not affect hash', () => {
    const data1 = createOas({ required: ['prop1', 'prop2', 'prop3'] })
    const data2 = createOas({ required: ['prop3', 'prop2', 'prop1'] })

    const result1 = normalize(data1, DEFAULT_OPTIONS)
    const result2 = normalize(data2, DEFAULT_OPTIONS)
    checkHashesEqualByPath(result1, result2, ['components', 'schemas', TEST_SCHEMA_NAME])
  })

  it('enum affects hash', () => {
    const data1 = createOas({ enum: ['Husky', 'Retriever'] })
    const data2 = createOas({ enum: ['Dingo'] })

    const result1 = normalize(data1, DEFAULT_OPTIONS)
    const result2 = normalize(data2, DEFAULT_OPTIONS)
    checkHashesNotEqualByPath(result1, result2, ['components', 'schemas', TEST_SCHEMA_NAME])
  })

  it('enum order does not affect hash', () => {
    const data1 = createOas({ enum: ['Husky', 'Retriever', 'Dingo', 'Shepherd'] })
    const data2 = createOas({ enum: ['Shepherd', 'Dingo', 'Retriever', 'Husky'] })

    const result1 = normalize(data1, DEFAULT_OPTIONS)
    const result2 = normalize(data2, DEFAULT_OPTIONS)
    checkHashesEqualByPath(result1, result2, ['components', 'schemas', TEST_SCHEMA_NAME])
  })

  it('property type affects hash', () => {
    const data1 = createOas({
      type: 'object',
      properties: {
        foo: {
          type: 'number',
        },
      },
    })

    const data2 = createOas({
      type: 'object',
      properties: {
        foo: {
          type: 'string',
        },
      },
    })

    const result1 = normalize(data1, DEFAULT_OPTIONS)
    const result2 = normalize(data2, DEFAULT_OPTIONS)
    checkHashesNotEqualByPath(result1, result2, ['components', 'schemas', TEST_SCHEMA_NAME])
  })

  it('property title does not affect hash', () => {
    const data1 = createOas({
      type: 'object',
      properties: {
        foo: {
          title: 'Some Schema 1',
          type: 'string',
        },
      },
    })

    const data2 = createOas({
      type: 'object',
      properties: {
        foo: {
          title: 'Some Schema 2',
          type: 'string',
        },
      },
    })

    const result1 = normalize(data1, DEFAULT_OPTIONS)
    const result2 = normalize(data2, DEFAULT_OPTIONS)
    checkHashesEqualByPath(result1, result2, ['components', 'schemas', TEST_SCHEMA_NAME])
  })

  it('other property fields do not affect hash', () => {
    const data1 = createOas({
      type: 'object',
      properties: {
        foo: {
          type: 'object',
          format: 'ip',
          properties: {
            foo2: { type: 'string' },
          },
        },
      },
    })

    const data2 = createOas({
      type: 'object',
      properties: {
        foo: {
          type: 'object',
          format: 'uri',
          properties: {
            foo3: { type: 'string' },
          },
        },
      },
    })

    const result1 = normalize(data1, DEFAULT_OPTIONS)
    const result2 = normalize(data2, DEFAULT_OPTIONS)
    checkHashesNotEqualByPath(result1, result2, ['components', 'schemas', TEST_SCHEMA_NAME, 'properties', 'foo'])
    checkHashesEqualByPath(result1, result2, ['components', 'schemas', TEST_SCHEMA_NAME])
  })

  it('hashes in cycled specs are calculated correctly', () => {
    const data1 = createOas({
      type: 'object',
      properties: {
        cycle: {
          type: 'object',
          properties: {
            foo2: { type: 'string' },
            recursive: {
              $ref: `#/components/schemas/${TEST_SCHEMA_NAME}/properties/cycle`,
            },
          },
        },
      },
    })

    const data2 = createOas({
      type: 'object',
      properties: {
        cycle: {
          type: 'object',
          properties: {
            foo3: { type: 'string' },
            recursive: {
              $ref: `#/components/schemas/${TEST_SCHEMA_NAME}/properties/cycle`,
            },
          },
        },
      },
    })

    const result1 = normalize(data1, DEFAULT_OPTIONS)
    const result2 = normalize(data2, DEFAULT_OPTIONS)
    checkHashesEqualByPath(result1, result1,
      ['components', 'schemas', TEST_SCHEMA_NAME, 'properties', 'cycle'],
      ['components', 'schemas', TEST_SCHEMA_NAME, 'properties', 'cycle', 'properties', 'recursive'],
    )
    checkHashesEqualByPath(result1, result2, ['components', 'schemas', TEST_SCHEMA_NAME])
  })

  it('additionalProperties type affects hash', () => {
    const data1 = createOas({
      type: 'object',
      additionalProperties: {
        type: 'number',
      },
    })

    const data2 = createOas({
      type: 'object',
      additionalProperties: {
        type: 'string',
      },
    })

    const result1 = normalize(data1, DEFAULT_OPTIONS)
    const result2 = normalize(data2, DEFAULT_OPTIONS)
    checkHashesNotEqualByPath(result1, result2, ['components', 'schemas', TEST_SCHEMA_NAME])
  })

  it('additionalProperties title does not affect hash', () => {
    const data1 = createOas({
      type: 'object',
      additionalProperties: {
        title: 'Some Schema 1',
        type: 'string',
      },
    })

    const data2 = createOas({
      type: 'object',
      additionalProperties: {
        title: 'Some Schema 2',
        type: 'string',
      },
    })

    const result1 = normalize(data1, DEFAULT_OPTIONS)
    const result2 = normalize(data2, DEFAULT_OPTIONS)
    checkHashesEqualByPath(result1, result2, ['components', 'schemas', TEST_SCHEMA_NAME])
  })

  it('other additionalProperties fields do not affect hash', () => {
    const data1 = createOas({
      type: 'object',
      additionalProperties: {
        readOnly: true,
        format: 'ip',
      },
    })

    const data2 = createOas({
      type: 'object',
      additionalProperties: {
        readOnly: false,
        format: 'uri',
      },
    })

    const result1 = normalize(data1, DEFAULT_OPTIONS)
    const result2 = normalize(data2, DEFAULT_OPTIONS)
    checkHashesEqualByPath(result1, result2, ['components', 'schemas', TEST_SCHEMA_NAME])
  })

  it('boolean additionalProperties affects hash', () => {
    const data1 = createOas({
      type: 'object',
      additionalProperties: true,
    })

    const data2 = createOas({
      type: 'object',
      additionalProperties: false,
    })

    const result1 = normalize(data1, DEFAULT_OPTIONS)
    const result2 = normalize(data2, DEFAULT_OPTIONS)
    checkHashesNotEqualByPath(result1, result2, ['components', 'schemas', TEST_SCHEMA_NAME])
  })

  it('patternProperties type affects hash (openapi 3.1.0)', () => {
    const data1 = createOas({
      type: 'object',
      patternProperties: {
        '.+\\d+$': { type: 'number' },
      },
    }, '3.1.0')

    const data2 = createOas({
      type: 'object',
      patternProperties: {
        '.+\\d+$': { type: 'string' },
      },
    }, '3.1.0')

    const result1 = normalize(data1, DEFAULT_OPTIONS)
    const result2 = normalize(data2, DEFAULT_OPTIONS)
    checkHashesNotEqualByPath(result1, result2, ['components', 'schemas', TEST_SCHEMA_NAME])
  })

  it('patternProperties title does not affect hash (openapi 3.1.0)', () => {
    const data1 = createOas({
      type: 'object',
      patternProperties: {
        '.+\\d+$': {
          title: 'Some Schema 1',
          type: 'string',
        },
      },
    }, '3.1.0')

    const data2 = createOas({
      type: 'object',
      patternProperties: {
        '.+\\d+$': {
          title: 'Some Schema 2',
          type: 'string',
        },
      },
    }, '3.1.0')

    const result1 = normalize(data1, DEFAULT_OPTIONS)
    const result2 = normalize(data2, DEFAULT_OPTIONS)
    checkHashesEqualByPath(result1, result2, ['components', 'schemas', TEST_SCHEMA_NAME])
  })

  it('none of the patternProperties properties affect hash (openapi 3.0.0)', () => {
    const data1 = createOas({
      type: 'object',
      patternProperties: {
        '.+\\d+$': {
          title: 'Some Schema 1',
          type: 'number',
        },
      },
    }, '3.0.0')

    const data2 = createOas({
      type: 'object',
      patternProperties: {
        '.+\\d+$': {
          title: 'Some Schema 2',
          type: 'string',
        },
      },
    }, '3.0.0')

    const result1 = normalize(data1, DEFAULT_OPTIONS)
    const result2 = normalize(data2, DEFAULT_OPTIONS)
    checkHashesEqualByPath(result1, result2, ['components', 'schemas', TEST_SCHEMA_NAME])
  })

  it('oneOf order does not affect hash', () => {
    const data1 = createOas({
      oneOf: [
        { type: 'integer' },
        { type: 'number' },
        { type: 'string' },
      ],
    })
    const data2 = createOas({
      oneOf: [
        { type: 'string' },
        { type: 'number' },
        { type: 'integer' },
      ],
    })

    const result1 = normalize(data1, DEFAULT_OPTIONS)
    const result2 = normalize(data2, DEFAULT_OPTIONS)
    checkHashesEqualByPath(result1, result2, ['components', 'schemas', TEST_SCHEMA_NAME])
  })

  it('oneOf title does not affect hash', () => {
    const data1 = createOas({
      oneOf: [
        {
          title: 'Something 1',
        },
      ],
    })
    const data2 = createOas({
      oneOf: [
        {
          title: 'Something 2',
        },
      ],
    })

    const result1 = normalize(data1, DEFAULT_OPTIONS)
    const result2 = normalize(data2, DEFAULT_OPTIONS)
    checkHashesEqualByPath(result1, result2, ['components', 'schemas', TEST_SCHEMA_NAME])
  })

  it('oneOf type affects hash', () => {
    const data1 = createOas({
      oneOf: [
        {
          type: 'string',
        },
      ],
    })
    const data2 = createOas({
      oneOf: [
        {
          type: 'number',
        },
      ],
    })

    const result1 = normalize(data1, DEFAULT_OPTIONS)
    const result2 = normalize(data2, DEFAULT_OPTIONS)
    checkHashesNotEqualByPath(result1, result2, ['components', 'schemas', TEST_SCHEMA_NAME])
  })

  it('oneOf readOnly field affects hash', () => {
    const data1 = createOas({
      oneOf: [
        {
          readOnly: true,
        },
      ],
    })
    const data2 = createOas({
      oneOf: [
        {
          readOnly: false,
        },
      ],
    })

    const result1 = normalize(data1, DEFAULT_OPTIONS)
    const result2 = normalize(data2, DEFAULT_OPTIONS)
    checkHashesNotEqualByPath(result1, result2, ['components', 'schemas', TEST_SCHEMA_NAME])
  })

  it('anyOf order does not affect hash', () => {
    const data1 = createOas({
      anyOf: [
        { type: 'string' },
        { type: 'number' },
        { type: 'integer' },
      ],
    })
    const data2 = createOas({
      anyOf: [
        { type: 'integer' },
        { type: 'number' },
        { type: 'string' },
      ],
    })

    const result1 = normalize(data1, DEFAULT_OPTIONS)
    const result2 = normalize(data2, DEFAULT_OPTIONS)
    checkHashesEqualByPath(result1, result2, ['components', 'schemas', TEST_SCHEMA_NAME])
  })

  it('allOf order does not affect hash', () => {
    const data1 = createOas({
      allOf: [
        { type: 'string' },
        { type: 'number' },
        { type: 'integer' },
      ],
    })
    const data2 = createOas({
      allOf: [
        { type: 'integer' },
        { type: 'number' },
        { type: 'string' },
      ],
    })

    const result1 = normalize(data1, DEFAULT_OPTIONS)
    const result2 = normalize(data2, DEFAULT_OPTIONS)
    checkHashesEqualByPath(result1, result2, ['components', 'schemas', TEST_SCHEMA_NAME])
  })

  it('allOf title does not affect hash', () => {
    const data1 = createOas({
      allOf: [
        {
          title: 'Something 1',
        },
      ],
    })
    const data2 = createOas({
      allOf: [
        {
          title: 'Something 2',
        },
      ],
    })

    const result1 = normalize(data1, DEFAULT_OPTIONS)
    const result2 = normalize(data2, DEFAULT_OPTIONS)
    checkHashesEqualByPath(result1, result2, ['components', 'schemas', TEST_SCHEMA_NAME])
  })

  it('allOf type affects hash', () => {
    const data1 = createOas({
      allOf: [
        {
          type: 'string',
        },
      ],
    })
    const data2 = createOas({
      allOf: [
        {
          type: 'number',
        },
      ],
    })

    const result1 = normalize(data1, DEFAULT_OPTIONS)
    const result2 = normalize(data2, DEFAULT_OPTIONS)
    checkHashesNotEqualByPath(result1, result2, ['components', 'schemas', TEST_SCHEMA_NAME])
  })

  it('allOf readOnly field affects hash', () => {
    const data1 = createOas({
      allOf: [
        {
          readOnly: true,
        },
      ],
    })
    const data2 = createOas({
      allOf: [
        {
          readOnly: false,
        },
      ],
    })

    const result1 = normalize(data1, DEFAULT_OPTIONS)
    const result2 = normalize(data2, DEFAULT_OPTIONS)
    checkHashesNotEqualByPath(result1, result2, ['components', 'schemas', TEST_SCHEMA_NAME])
  })

  it('not type affects hash', () => {
    const data1 = createOas({
      type: 'object',
      not: {
        type: 'number',
      },
    })

    const data2 = createOas({
      type: 'object',
      not: {
        type: 'string',
      },
    })

    const result1 = normalize(data1, DEFAULT_OPTIONS)
    const result2 = normalize(data2, DEFAULT_OPTIONS)
    checkHashesNotEqualByPath(result1, result2, ['components', 'schemas', TEST_SCHEMA_NAME])
  })

  it('not title does not affect hash', () => {
    const data1 = createOas({
      type: 'object',
      not: {
        title: 'Some Schema 1',
        type: 'string',
      },
    })

    const data2 = createOas({
      type: 'object',
      not: {
        title: 'Some Schema 2',
        type: 'string',
      },
    })

    const result1 = normalize(data1, DEFAULT_OPTIONS)
    const result2 = normalize(data2, DEFAULT_OPTIONS)
    checkHashesEqualByPath(result1, result2, ['components', 'schemas', TEST_SCHEMA_NAME])
  })

  it('definitions type affects hash', () => {
    const data1 = createOas({
      type: 'object',
      definitions: {
        test: {
          'type': 'number',
        },
      },
    })

    const data2 = createOas({
      type: 'object',
      definitions: {
        test: {
          'type': 'string',
        },
      },
    })

    const result1 = normalize(data1, DEFAULT_OPTIONS)
    const result2 = normalize(data2, DEFAULT_OPTIONS)
    checkHashesNotEqualByPath(result1, result2, ['components', 'schemas', TEST_SCHEMA_NAME])
  })

  it('definitions title does not affect hash', () => {
    const data1 = createOas({
      type: 'object',
      definitions: {
        test: {
          title: 'Some Schema 1',
        },
      },
    })

    const data2 = createOas({
      type: 'object',
      definitions: {
        test: {
          title: 'Some Schema 2',
        },
      },
    })

    const result1 = normalize(data1, DEFAULT_OPTIONS)
    const result2 = normalize(data2, DEFAULT_OPTIONS)
    checkHashesEqualByPath(result1, result2, ['components', 'schemas', TEST_SCHEMA_NAME])
  })

  it('$ref affects hash', () => {
    const data1 = createOas({
      $ref: '#/components/schemas/Test1',
    })

    const data2 = createOas({
      $ref: '#/components/schemas/Test2',
    })

    const result1 = normalize(data1, DEFAULT_OPTIONS)
    const result2 = normalize(data2, DEFAULT_OPTIONS)
    checkHashesNotEqualByPath(result1, result2, ['components', 'schemas', TEST_SCHEMA_NAME])
  })

  it('annotation severity fields do not affect hashes', () => {
    const data1 = createOas({
      description: 'description 1',
      anyOf: [
        { type: 'string' },
        { type: 'number' },
        { type: 'integer' },
      ],
      externalDocs: {
        url: 'str',
        description: 'str',
      },
      examples: [
        {
          TestComponent: {
            description: 'description',
          },
        },
      ],
    })
    const data2 = createOas({
      description: 'description 2',
      anyOf: [
        { type: 'integer' },
        { type: 'number' },
        { type: 'string' },
      ],
    })

    const result1 = normalize(data1, DEFAULT_OPTIONS)
    const result2 = normalize(data2, DEFAULT_OPTIONS)
    checkHashesEqualByPath(result1, result2, ['components', 'schemas', TEST_SCHEMA_NAME])
  })

  it('parameter name affects hash', () => {
    const data1 = createOasWithParameters({
      name: 'Cookie 1',
      in: 'cookie',
    })
    const data2 = createOasWithParameters({
      name: 'Cookie 2',
      in: 'cookie',
    })

    const result1 = normalize(data1, DEFAULT_OPTIONS)
    const result2 = normalize(data2, DEFAULT_OPTIONS)
    checkHashesNotEqualByPath(result1, result2, ['components', 'parameters', TEST_PARAMETER_NAME])
  })

  it('parameter\'s "in" field affects hash', () => {
    const data1 = createOasWithParameters({
      name: 'Cookie',
      in: 'cookie',
    })
    const data2 = createOasWithParameters({
      name: 'Cookie',
      in: 'header',
    })

    const result1 = normalize(data1, DEFAULT_OPTIONS)
    const result2 = normalize(data2, DEFAULT_OPTIONS)
    checkHashesNotEqualByPath(result1, result2, ['components', 'parameters', TEST_PARAMETER_NAME])
  })

  it('parameter\'s fields with annotation severity do not affect hashes', () => {
    const data1 = createOasWithParameters({
      name: 'Cookie',
      in: 'cookie',
      description: 'description 1',
      example: 'example',
      examples: {
        example1: {
          description: 'description',
        },
      },
    })
    const data2 = createOasWithParameters({
      name: 'Cookie',
      in: 'cookie',
      description: 'description 2',
    })

    const result1 = normalize(data1, DEFAULT_OPTIONS)
    const result2 = normalize(data2, DEFAULT_OPTIONS)
    checkHashesEqualByPath(result1, result2, ['components', 'parameters', TEST_PARAMETER_NAME])
  })

  it('parameter\'s schema type affects hash', () => {
    const data1 = createOasWithParameters({
      name: 'Cookie',
      in: 'cookie',
      schema: {
        type: 'string',
      },
    })
    const data2 = createOasWithParameters({
      name: 'Cookie',
      in: 'cookie',
      schema: {
        type: 'number',
      },
    })

    const result1 = normalize(data1, DEFAULT_OPTIONS)
    const result2 = normalize(data2, DEFAULT_OPTIONS)
    checkHashesNotEqualByPath(result1, result2, ['components', 'parameters', TEST_PARAMETER_NAME])
  })

  it('parameter\'s schema title does not affect hash', () => {
    const data1 = createOasWithParameters({
      name: 'Cookie',
      in: 'cookie',
      schema: {
        title: 'title 1',
      },
    })
    const data2 = createOasWithParameters({
      name: 'Cookie',
      in: 'cookie',
      schema: {
        title: 'title 2',
      },
    })

    const result1 = normalize(data1, DEFAULT_OPTIONS)
    const result2 = normalize(data2, DEFAULT_OPTIONS)
    checkHashesEqualByPath(result1, result2, ['components', 'parameters', TEST_PARAMETER_NAME])
  })

  it('other parameter\'s schema fields do not affect hash', () => {
    const data1 = createOasWithParameters({
      name: 'Cookie',
      in: 'cookie',
      schema: {
        format: 'uri',
        default: 'first sample',
        pattern: 'qwe',
      },
    })
    const data2 = createOasWithParameters({
      name: 'Cookie',
      in: 'cookie',
      schema: {
        format: 'ip',
        default: 'second sample',
        pattern: 'asd',
      },
    })

    const result1 = normalize(data1, DEFAULT_OPTIONS)
    const result2 = normalize(data2, DEFAULT_OPTIONS)
    checkHashesEqualByPath(result1, result2, ['components', 'parameters', TEST_PARAMETER_NAME])
  })

  it('symbol in array does not break hash calculation', () => {
    const requiredArray1 = ['prop1']
    const requiredArray2 = ['prop1']
    setJsoProperty<unknown>(requiredArray1, TEST_ORIGINS_FLAG, { type: [{ value: 'type' }] })

    const data1 = createOas({ required: requiredArray1 })
    const data2 = createOas({ required: requiredArray2 })

    const result1 = normalize(data1, DEFAULT_OPTIONS)
    const result2 = normalize(data2, DEFAULT_OPTIONS)
    checkHashesEqualByPath(result1, result2, ['components', 'schemas', TEST_SCHEMA_NAME])
  })

  it('no hash collisions', () => {
    const customOptions = { ...DEFAULT_OPTIONS }
    const result = normalize(petstore, customOptions)

    const uniqueHashesCount = countUniqueHashes(result)
    expect(uniqueHashesCount).toEqual(14)
  })
})
