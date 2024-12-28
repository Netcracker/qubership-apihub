import { normalize } from '../../src'
import 'jest-extended'

const ANYTHING = expect.objectContaining({ anyOf: expect.toBeArray() })
const NOTHING = expect.objectContaining({ not: ANYTHING })

describe('properties', function () {
  describe('additionalProperties', function () {
    it('allows no extra properties if additionalProperties is false', function () {
      const result = normalize({
        allOf: [{
          additionalProperties: true,
        }, {
          additionalProperties: false,
        }],
      })

      expect(result).toEqual({
        additionalProperties: false,
      })
    })

    it('allows extra properties if additionalProperties are true', function () {
      const result = normalize({
        allOf: [{
          additionalProperties: true,
        }, {
          additionalProperties: true,
        }],
      })

      expect(result).toEqual({
        additionalProperties: true,
      })
    })

    it('allows only intersecting properties', function () {
      const result = normalize({
        allOf: [{
          properties: {
            foo: { type: 'boolean' },
          },
          additionalProperties: true,
        }, {
          properties: {
            bar: { type: 'boolean' },
          },
          additionalProperties: false,
        }],
      })

      expect(result).toEqual({
        properties: {
          bar: { type: 'boolean' },
          foo: NOTHING,
        },
        additionalProperties: false,
      })
    })

    it('allows intersecting patternproperties', function () {
      const result = normalize({
        allOf: [{
          properties: {
            foo: { type: 'boolean' },
            foo123: { type: 'boolean' },
          },
          additionalProperties: true,
        }, {
          properties: {
            bar: { type: 'boolean' },
          },
          patternProperties: {
            '.+\\d+$': { type: 'boolean' },
          },
          additionalProperties: false,
        }],
      })

      expect(result).toEqual({
        properties: {
          foo: NOTHING,
          bar: { type: 'boolean' },
          foo123: { type: 'boolean' },
        },
        patternProperties: {
          '.+\\d+$': { type: 'boolean' },
        },
        additionalProperties: false,
      })
    })

    it('disallows all except matching patternProperties if both false. case 1', function () {
      const result = normalize({
        allOf: [{
          properties: {
            foo: { type: 'boolean' },
            foo123: { type: 'boolean' },
          },
          additionalProperties: false,
        }, {
          properties: {
            bar: { type: 'boolean' },
          },
          patternProperties: {
            '.+\\d+$': { type: 'boolean' },
          },
          additionalProperties: false,
        }],
      })

      expect(result).toEqual({
        properties: {
          foo123: { type: 'boolean' },
          foo: NOTHING,
          bar: NOTHING,
        },
        additionalProperties: false,
        patternProperties: {
          '.+\\d+$': { type: 'boolean' },
        },
      })
    })

    it('disallows all except matching patternProperties if both false. case 2', function () {
      const result = normalize({
        allOf: [{
          properties: {
            foo: { type: 'boolean' },
            foo123: { type: 'boolean' },
          },
          patternProperties: {
            '.+\\d+$': { type: 'string' },
          },
          additionalProperties: false,
        }, {
          properties: {
            bar: { type: 'boolean' },
            bar123: { type: 'boolean' },
          },
          patternProperties: {
            '.+\\d+$': { type: 'string' },
          },
          additionalProperties: false,
        }],
      })

      expect(result).toEqual({
        properties: {
          foo: NOTHING,
          foo123: NOTHING,
          bar: NOTHING,
          bar123: NOTHING,
        },
        patternProperties: {
          '.+\\d+$': { type: 'string' },
        },
        additionalProperties: false,
      })
    })

    it('disallows all except matching patternProperties if both false. case 3', function () {
      const schema = {
        allOf: [{
          type: 'object',
          properties: {
            foo: { type: 'boolean' },
            foo123: { type: 'boolean' },
          },
          patternProperties: {
            '^bar': { type: 'boolean' },
          },
          additionalProperties: false,
        }, {
          type: 'object',
          properties: {
            bar: { type: 'boolean' },
            bar123: { type: 'boolean' },
          },
          patternProperties: {
            '.+\\d+$': { type: 'boolean' },
          },
          additionalProperties: false,
        }],
      }
      const result = normalize(schema)
      expect(result).not.toEqual(schema)

      expect(result).toEqual({
        type: 'object',
        properties: {
          foo: NOTHING,
          foo123: { type: 'boolean' },
          bar: { type: 'boolean' },
          bar123: { type: 'boolean' },
        },
        additionalProperties: false,
        patternProperties: {
          '^bar': { type: 'boolean' },
          '.+\\d+$': { type: 'boolean' },
        },
      })
    })

    it('disallows all except matching patternProperties if both true', function () {
      const schema = {
        allOf: [{
          type: 'object',
          properties: {
            foo: { type: 'boolean' },
            foo123: { type: 'boolean' },
          },
          patternProperties: {
            '^bar': { type: 'boolean' },
          },
        }, {
          type: 'object',
          properties: {
            bar: { type: 'boolean' },
            bar123: { type: 'boolean' },
          },
          patternProperties: {
            '.+\\d+$': { type: 'boolean' },
          },
        }],
      }

      const result = normalize(schema)
      expect(result).not.toEqual(schema)

      expect(result).toEqual({
        type: 'object',
        properties: {
          foo: NOTHING,
          foo123: { type: 'boolean' },
          bar: { type: 'boolean' },
          bar123: { type: 'boolean' },
        },
        patternProperties: {
          '^bar': { type: 'boolean' },
          '.+\\d+$': { type: 'boolean' },
        },
      })
    })

    it('disallows all except matching patternProperties if one false', function () {
      const schema = {
        allOf: [{
          type: 'object',
          properties: {
            foo: { type: 'boolean' },
            foo123: { type: 'boolean' },
          },
        }, {
          type: 'object',
          properties: {
            bar: { type: 'boolean' },
            bar123: { type: 'boolean' },
          },
          patternProperties: {
            '.+\\d+$': { type: 'boolean' },
          },
          additionalProperties: false,
        }],
      }

      const result = normalize(schema)
      expect(result).not.toEqual(schema)

      expect(result).toEqual({
        type: 'object',
        properties: {
          foo: NOTHING,
          foo123: { type: 'boolean' },
          bar: { type: 'boolean' },
          bar123: { type: 'boolean' },
        },
        patternProperties: {
          '.+\\d+$': { type: 'boolean' },
        },
        additionalProperties: false,
      })
    })

    it('disallows all if no patternProperties and if both false', function () {
      const result = normalize({
        allOf: [{
          properties: {
            foo: { type: 'boolean' },
            foo123: { type: 'boolean' },
          },
          additionalProperties: false,
        }, {
          properties: {
            bar: { type: 'boolean' },
          },
          additionalProperties: false,
        }],
      })

      expect(result).toEqual({
        properties: {
          foo: NOTHING,
          foo123: NOTHING,
          bar: NOTHING,
        },
        additionalProperties: false,
      })
    })

    it('applies additionalProperties to other schemas properties if they have any', function () {
      const result = normalize({
        properties: {
          common: { type: 'string' },
          root: { type: ['string', 'integer', 'null'] },
        },
        additionalProperties: false,
        allOf: [{
          properties: {
            common: {
              type: 'string',
            },
            allof1: {},
          },
          additionalProperties: {
            type: [
              'string', 'null',
            ],
            maxLength: 10,
          },
        }, {
          properties: {
            common: {
              minLength: 1,
            },
            allof2: {},
          },
          additionalProperties: {
            type: [
              'string', 'integer', 'null',
            ],
            maxLength: 8,
          },
        }, {
          properties: {
            common: {
              minLength: 6,
            },
            allof3: {},
          },
        }],
      })

      expect(result).toEqual({
        properties: {
          common: {
            type: 'string',
            minLength: 6,
          },
          root: {
            type: expect.toIncludeSameMembers([
              'string', 'null',
            ]),
            maxLength: 8,
          },
          allof1: { maxLength: 8, not: ANYTHING },
          allof2: { maxLength: 10, not: ANYTHING },
          allof3: { maxLength: 8, not: ANYTHING },
        },
        additionalProperties: {
          maxLength: 8,
          not: ANYTHING,
        },
      })
    })

    it('considers patternProperties before merging additionalProperties to other schemas properties if they have any', function () {
      const result = normalize({
        properties: {
          common: { type: 'string' },
          root: { type: 'string' },
        },
        patternProperties: {
          '.+\\d{2,}$': {
            minLength: 7,
          },
        },
        additionalProperties: false,
        allOf: [{
          properties: {
            common: {
              type: 'string',
            },
            allof1: { type: 'string' },
          },
          additionalProperties: {
            type: [
              'string', 'null', 'integer',
            ],
            maxLength: 10,
          },
        }, {
          properties: {
            common: {
              minLength: 1,
            },
            allof2: { type: 'string' },
            allowed123: {
              type: 'string',
            },
          },
          patternProperties: {
            '.+\\d{2,}$': {
              minLength: 9,
            },
          },
          additionalProperties: {
            type: [
              'string', 'integer', 'null',
            ],
            maxLength: 8,
          },
        }, {
          properties: {
            common: {
              minLength: 6,
            },
            allof3: { type: 'string' },
            allowed456: {
              type: 'integer',
            },
          },
        }],
      })

      expect(result).toEqual({
        properties: {
          common: { type: 'string', minLength: 6 },
          allowed123: { type: 'string', minLength: 7, maxLength: 10 },
          allowed456: { type: 'integer', minLength: 9, maxLength: 10 },
          allof1: { maxLength: 8, not: ANYTHING },
          allof2: { maxLength: 10, not: ANYTHING },
          allof3: { maxLength: 8, not: ANYTHING },
          root: { maxLength: 8, not: ANYTHING },
        },
        patternProperties: {
          '.+\\d{2,}$': {
            minLength: 9,
          },
        },
        additionalProperties: {
          maxLength: 8,
          not: ANYTHING,
        },
      })
    })

    it('combines additionalProperties when schemas', function () {
      const result = normalize({
        additionalProperties: true,
        allOf: [{
          additionalProperties: {
            type: [
              'string', 'null',
            ],
            maxLength: 10,
          },
        }, {
          additionalProperties: {
            type: [
              'string', 'integer', 'null',
            ],
            maxLength: 8,
          },
        }],
      })

      expect(result).toEqual({
        additionalProperties: {
          type: [
            'string', 'null',
          ],
          maxLength: 8,
        },
      })
    })
  })

  describe('patternProperties', function () {
    it('merges simliar schemas', function () {
      const result = normalize({
        patternProperties: {
          '^\\$.+': {
            type: [
              'string', 'null', 'integer',
            ],
            allOf: [{
              minimum: 5,
            }],
          },
        },
        allOf: [{
          patternProperties: {
            '^\\$.+': {
              type: [
                'string', 'null',
              ],
              allOf: [{
                minimum: 7,
              }],
            },
            '.*': {
              type: 'null',
            },
          },
        }],
      })

      expect(result).toEqual({
        patternProperties: {
          '^\\$.+': {
            type: [
              'string', 'null',
            ],
            minimum: 7,
          },
          '.*': {
            type: 'null',
          },
        },
      })
    })
  })

  describe('when patternProperties present', function () {
    it('merges patternproperties', function () {
      const result = normalize({
        allOf: [{
          patternProperties: {
            '.*': {
              type: 'string',
              minLength: 5,
            },
          },
        }, {
          patternProperties: {
            '.*': {
              type: 'string',
              minLength: 7,
            },
          },
        }],
      })

      expect(result).toEqual({
        patternProperties: {
          '.*': {
            type: 'string',
            minLength: 7,
          },
        },
      })
    })

    it('merges with properties if matching property name', function () {
      const schema = {
        allOf: [{
          type: 'object',
          properties: {
            name: {
              type: 'string',
              minLength: 1,
            },
          },
          patternProperties: {
            _long$: {
              type: 'string',
              minLength: 7,
            },
          },
        }, {
          type: 'object',
          properties: {
            foo_long: {
              type: 'string',
              minLength: 9,
            },
          },
          patternProperties: {
            '^name.*': {
              type: 'string',
              minLength: 8,
            },
          },
        }],
      }

      const result = normalize(schema)

      expect(result).not.toEqual(schema)

      expect(result).toEqual({
        type: 'object',
        properties: {
          foo_long: {
            type: 'string',
            minLength: 9,
          },
          name: {
            type: 'string',
            minLength: 8,
          },
        },
        patternProperties: {
          _long$: {
            type: 'string',
            minLength: 7,
          },
          '^name.*': {
            type: 'string',
            minLength: 8,
          },
        },
      })
    })
  })
})
