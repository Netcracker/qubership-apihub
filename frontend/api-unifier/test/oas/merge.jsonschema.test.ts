import { JSON_SCHEMA_NODE_SYNTHETIC_TYPE_NOTHING, normalize } from '../../src'
import { TEST_INLINE_REFS_FLAG } from '../helpers'
import 'jest-extended'

const NOT_ANY_MATCHER = {
  not: expect.objectContaining({
    anyOf: expect.arrayContaining([
      expect.objectContaining({ type: 'boolean' }),
      expect.objectContaining({ type: 'string' }),
      expect.objectContaining({ type: 'number' }),
      expect.objectContaining({ type: 'integer' }),
      expect.objectContaining({ type: 'object' }),
      expect.objectContaining({ type: 'array' }),
      expect.objectContaining({ type: 'null' }),
    ]),
  }),
}
describe('basic allOf merge cases', function () {
  it('merges schema with same object reference multiple places', () => {
    const commonSchema = {
      allOf: [
        {
          properties: {
            test: { type: 'boolean' },
          },
        },
      ],
    }
    const result = normalize({
      properties: {
        list: {
          items: commonSchema,
        },
      },
      allOf: [commonSchema],
    })

    expect(result).toEqual({
      properties: {
        list: {
          items: {
            properties: {
              test: { type: 'boolean' },
            },
          },
        },
        test: { type: 'boolean' },
      },
    })
  })

  it('does not alter original schema', () => {
    const schema = {
      allOf: [
        {
          properties: {
            test: { type: 'boolean' },
          },
        },
      ],
    }

    const result = normalize(schema)

    expect(result).toEqual({
      properties: {
        test: { type: 'boolean' },
      },
    })

    expect(result).not.toEqual(schema) // not strict equal (identity)
    expect(schema).toEqual({
      allOf: [
        {
          properties: {
            test: { type: 'boolean' },
          },
        },
      ],
    })
  })

  it('does not use any original objects or arrays', () => {
    const schema = {
      properties: {
        arr: {
          type: 'array',
          items: {
            type: 'object',
          },
          additionalItems: {
            type: 'array',
          },
        },
      },
      allOf: [
        {
          properties: {
            test: { type: 'boolean' },
          },
        },
      ],
    }

    const result = normalize(schema)
    expect(schema).toEqual({
      properties: {
        arr: {
          type: 'array',
          items: {
            type: 'object',
          },
          additionalItems: {
            type: 'array',
          },
        },
      },
      allOf: [
        {
          properties: {
            test: { type: 'boolean' },
          },
        },
      ],
    })

    expect(result).toEqual({
      properties: {
        arr: {
          type: 'array',
          items: {
            type: 'object',
          },
          additionalItems: {
            type: 'array',
          },
        },
        test: { type: 'boolean' },
      },
    })
  })

  it('combines simple usecase', function () {
    const result = normalize({
      allOf: [
        {
          type: 'string',
          minLength: 1,
        },
        {
          type: 'string',
          maxLength: 5,
        },
      ],
    })

    expect(result).toEqual({
      type: 'string',
      minLength: 1,
      maxLength: 5,
    })
  })

  it('combines without allOf', function () {
    const result = normalize({
      properties: {
        foo: {
          type: 'string',
        },
      },
    })

    expect(result).toEqual({
      properties: {
        foo: {
          type: 'string',
        },
      },
    })
  })

  describe('handle wrong allOf items', function () {
    it('handles non-array allOf', function () {
      const result = normalize({
        allOf: {},
      })

      expect(result).toEqual({})
    })

    it('filters out invalid allOf members', function () {
      const result = normalize({
        allOf: [
          null,
          1,
          0,
          {
            type: 'object',
            properties: {
              bar: {
                type: 'string',
              },
            },
          },
          [],
          '',
          'foo',
          {
            type: 'object',
            properties: {
              foo: {
                type: 'string',
              },
            },
          },
        ],
      })

      expect(result).toEqual({
        type: 'object',
        properties: {
          bar: {
            type: 'string',
          },
          foo: {
            type: 'string',
          },
        },
      })
    })

    it('default $ref resolver leaves schema unchanged', function () {
      const expected = {
        $ref: '#/yonder',
      }

      const actual = normalize(expected)

      expect(actual).toEqual(expected)
    })

    it('is capable of resolving $refs', () => {
      const source = {
        foo: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
            },
          },
        },
        bar: {
          type: 'object',
          properties: {
            permissions: {
              allOf: [
                {
                  $ref: '#/permission',
                },
                {
                  type: 'object',
                  properties: {
                    admin: {
                      type: 'boolean',
                    },
                  },
                },
              ],
            },
          },
        },
        permission: {
          type: 'object',
          properties: {
            level: {
              type: 'number',
            },
          },
        },
      }

      const result = normalize(
        {
          allOf: [
            {
              $ref: '#/foo',
            },
            {
              $ref: '#/bar',
            },
            {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                },
              },
            },
          ],
        },
        { source },
      )

      expect(result).toEqual({
        type: 'object',
        properties: {
          id: {
            type: 'string',
          },
          name: {
            type: 'string',
          },
          permissions: {
            type: 'object',
            properties: {
              admin: {
                type: 'boolean',
              },
              level: {
                type: 'number',
              },
            },
          },
        },
      })
    })
  })

  describe('simple resolve functionality', function () {
    it('merges with default resolver if not defined resolver', function () {
      const result = normalize({
        title: 'schema1',
        allOf: [
          {
            title: 'schema2',
          },
          {
            title: 'schema3',
          },
        ],
      })

      expect(result).toEqual({
        title: 'schema1',
      })

      const result3 = normalize({
        allOf: [
          {
            title: 'schema2',
          },
          {
            title: 'schema3',
          },
        ],
      })

      expect(result3).toEqual({
        title: 'schema3',
      })
    })

    it('merges minLength if conflict', function () {
      const result = normalize({
        allOf: [
          {
            minLength: 1,
          },
          {
            minLength: 5,
          },
        ],
      })

      expect(result).toEqual({
        minLength: 5,
      })
    })

    it('merges minimum if conflict', function () {
      const result = normalize({
        allOf: [
          {
            minimum: 1,
          },
          {
            minimum: 5,
          },
        ],
      })

      expect(result).toEqual({
        minimum: 5,
      })
    })

    it('merges exclusiveMinimum if conflict', function () {
      const result = normalize({
        allOf: [
          {
            exclusiveMinimum: 1,
          },
          {
            exclusiveMinimum: 5,
          },
        ],
      })

      expect(result).toEqual({
        exclusiveMinimum: 5,
      })
    })

    it('merges minItems if conflict', function () {
      const result = normalize({
        allOf: [
          {
            minItems: 1,
          },
          {
            minItems: 5,
          },
        ],
      })

      expect(result).toEqual({
        minItems: 5,
      })
    })

    it('merges maximum if conflict', function () {
      const result = normalize({
        allOf: [
          {
            maximum: 1,
          },
          {
            maximum: 5,
          },
        ],
      })

      expect(result).toEqual({
        maximum: 1,
      })
    })

    it('merges exclusiveMaximum if conflict', function () {
      const result = normalize({
        allOf: [
          {
            exclusiveMaximum: 1,
          },
          {
            exclusiveMaximum: 5,
          },
        ],
      })

      expect(result).toEqual({
        exclusiveMaximum: 1,
      })
    })

    it('merges maxItems if conflict', function () {
      const result = normalize({
        allOf: [
          {
            maxItems: 1,
          },
          {
            maxItems: 5,
          },
        ],
      })

      expect(result).toEqual({
        maxItems: 1,
      })
    })

    it('merges maxLength if conflict', function () {
      const result = normalize({
        allOf: [
          {
            maxLength: 4,
          },
          {
            maxLength: 5,
          },
        ],
      })

      expect(result).toEqual({
        maxLength: 4,
      })
    })

    it('merges uniqueItems to most restrictive if conflict', function () {
      const result = normalize({
        allOf: [
          {
            uniqueItems: true,
          },
          {
            uniqueItems: false,
          },
        ],
      })

      expect(result).toEqual({
        uniqueItems: true,
      })

      expect(
        normalize({
          allOf: [
            {
              uniqueItems: false,
            },
            {
              uniqueItems: false,
            },
          ],
        }),
      ).toEqual({
        uniqueItems: false,
      })
    })

    it('ready for incompatible types', function () {
      const result = normalize({
        allOf: [
          {
            type: 'null',
          },
          {
            type: 'text',
          },
        ],
      }, { onMergeError: (msg) => { throw new Error(msg) } })
      expect(result).toEqual(NOT_ANY_MATCHER)
    })

    it('merging incompatible type using synthetic', function () {
      const result = normalize({
        allOf: [
          {
            type: 'null',
          },
          {
            type: 'text',
          },
        ],
      }, { allowNotValidSyntheticChanges: true })
      expect(result).toEqual({
          type: JSON_SCHEMA_NODE_SYNTHETIC_TYPE_NOTHING,
        },
      )
    })

    it('merges type if conflict', function () {
      const result = normalize({
        allOf: [
          {},
          {
            type: ['string', 'null', 'object', 'array'],
          },
          {
            type: ['string', 'null'],
          },
          {
            type: ['null', 'string'],
          },
        ],
      })

      expect(result).toEqual({
        type: ['string', 'null'],
      })

      const result2 = normalize({
        allOf: [
          {},
          {
            type: ['string', 'null', 'object', 'array'],
          },
          {
            type: 'string',
          },
          {
            type: ['null', 'string'],
          },
        ],
      })

      expect(result2).toEqual({
        type: 'string',
      })
    })
    it('merges enum', function () {
      const result = normalize({
        allOf: [
          {},
          {
            enum: ['string', 'null', 'object', {}, [2], [1], null],
          },
          {
            enum: ['string', {}, [1], [1]],
          },
          {
            enum: ['null', 'string', {}, [3], [1], null],
          },
        ],
      })

      expect(result).toEqual({
        enum: expect.toIncludeSameMembers([[1], {}, 'string']),
      })
    })

    it('merges examples', function () {
      const result = normalize({
        allOf: [
          {
            examples: [
              {
                case1: {
                  value: { test: 1 },
                },
              },
            ],
          },
          {
            examples: [
              {
                case2: {
                  value: { test: 2 },
                },
              },
            ],
          },
        ],
      })

      expect(result).toEqual({
        examples: [
          {
            case2: {
              value: { test: 2 },
            },
          },
        ],
      })
    })

    it('merges examples. duplicate', function () {
      const result = normalize({
        allOf: [
          {
            examples: [
              {
                case1: {
                  value: { test: 1 },
                },
              },
            ],
          },
          {
            examples: [
              {
                case1: {
                  value: { test: 2 },
                },
              },
            ],
          },
        ],
      })

      expect(result).toEqual({
        examples: [
          {
            case1: {
              value: { test: 2 },
            },
          },
        ],
      })
    })

    it('throws if enum is incompatible', function () {
      expect(function () {
        normalize({
          allOf: [
            {},
            {
              enum: ['string', {}],
            },
            {
              enum: [{}, 'string'],
            },
          ],
        })
      }).not.toThrow(/there are no common values in enum/)

      expect(function () {
        normalize({
          allOf: [
            {},
            {
              enum: ['string', {}],
            },
            {
              enum: [[], false],
            },
          ],
        }, { onMergeError: (msg) => { throw new Error(msg) } })
      }).toThrow(/there are no common values in enum/)
    })

    it('merges const', function () {
      const result = normalize({
        allOf: [
          {},
          {
            const: ['string', {}],
          },
          {
            const: ['string', {}],
          },
        ],
      })

      expect(result).toEqual({
        const: ['string', {}],
      })
    })

    it('merges anyOf', function () {
      const result = normalize({
        allOf: [
          {
            anyOf: [
              {
                required: ['123'],
              },
            ],
          },
          {
            anyOf: [
              {
                required: ['123'],
              },
              {
                required: ['456'],
              },
            ],
          },
        ],
      })

      expect(result).toEqual({
        anyOf: [
          {
            required: ['123'],
          },
          {
            required: ['123', '456'],
          },
        ],
      })
    })

    // remove duplicates in combinaries (oneOf/anyOf) is out of scope
    it('merges anyOf by finding valid combinations', function () {
      const result = normalize({
        allOf: [
          {
            anyOf: [
              {
                type: ['null', 'string', 'array'],
              },
              {
                type: ['null', 'string', 'object'],
              },
            ],
          },
          {
            anyOf: [
              {
                type: ['null', 'string'],
              },
              {
                type: ['integer', 'object', 'null'],
              },
            ],
          },
        ],
      })

      expect(result).toEqual({
        anyOf: [
          {
            type: ['null', 'string'],
          },
          {
            type: 'null',
          },
          {
            type: ['null', 'string'],
          },
          {
            type: ['null', 'object'],
          },
        ],
      })
    })

    // remove duplicates in combinaries (oneOf/anyOf) is out of scope
    it('extracts common logic', function () {
      const result = normalize({
        allOf: [
          {
            anyOf: [
              {
                type: ['null', 'string', 'array'],
                minLength: 5,
              },
              {
                type: ['null', 'string', 'object'],
                minLength: 5,
              },
            ],
          },
          {
            anyOf: [
              {
                type: ['null', 'string'],
                minLength: 5,
              },
              {
                type: ['integer', 'object', 'null'],
              },
            ],
          },
        ],
      })

      expect(result).toEqual({
        anyOf: [
          {
            type: ['null', 'string'],
            minLength: 5,
          },
          {
            type: 'null',
            minLength: 5,
          },
          {
            type: ['null', 'string'],
            minLength: 5,
          },
          {
            type: ['null', 'object'],
            minLength: 5,
          },
        ],
      })
    })

    it('merges anyOf into main schema if left with only one combination', function () {
      const result = normalize({
        required: ['abc'],
        allOf: [
          {
            anyOf: [
              {
                required: ['123'],
              },
              {
                required: ['456'],
              },
            ],
          },
          {
            anyOf: [
              {
                required: ['123'],
              },
            ],
          },
        ],
      })

      expect(result).toEqual({
        anyOf: [
          { required: ['123'] },
          { required: expect.toIncludeSameMembers(['123', '456']) },
        ],
        required: ['abc'],
      })
    })

    it('merges nested allOf if inside singular anyOf', function () {
      const result = normalize({
        allOf: [
          {
            anyOf: [
              {
                required: ['123'],
                allOf: [
                  {
                    required: ['768'],
                  },
                ],
              },
            ],
          },
          {
            anyOf: [
              {
                required: ['123'],
              },
              {
                required: ['456'],
              },
            ],
          },
        ],
      })

      expect(result).toEqual({
        anyOf: [
          {
            required: expect.toIncludeSameMembers(['123', '768']),
          },
          {
            required: expect.toIncludeSameMembers(['123', '456', '768']),
          },
        ],
      })
    })

    it('no type intersection at all. anyOf', function () {
      const anyOf = {
        allOf: [
          {
            anyOf: [
              {
                type: ['object', 'string', 'null'],
              },
            ],
          },
          {
            anyOf: [
              {
                type: ['array', 'integer'],
              },
            ],
          },
        ],
      }
      expect(normalize(anyOf)).toEqual({ anyOf: [NOT_ANY_MATCHER] })

      expect(
        normalize(anyOf, { unify: true, allowNotValidSyntheticChanges: true }),
      ).toEqual({ anyOf: [{ type: JSON_SCHEMA_NODE_SYNTHETIC_TYPE_NOTHING }] })
    })

    it('no type intersection at all. oneOf', function () {
      const oneOf = {
        allOf: [
          {
            oneOf: [
              {
                type: ['object', 'string', 'null'],
              },
            ],
          },
          {
            oneOf: [
              {
                type: ['array', 'integer'],
              },
            ],
          },
        ],
      }

      expect(normalize(oneOf)).toEqual({ oneOf: [NOT_ANY_MATCHER] })

      expect(
        normalize(oneOf, { unify: true, allowNotValidSyntheticChanges: true }),
      ).toEqual({ oneOf: [{ type: JSON_SCHEMA_NODE_SYNTHETIC_TYPE_NOTHING }] })
    })

    it('merges more complex oneOf', function () {
      const result = normalize({
        allOf: [
          {
            oneOf: [
              {
                type: ['array', 'string', 'object'],
                required: ['123'],
              },
              {
                required: ['abc'],
              },
            ],
          },
          {
            oneOf: [
              {
                type: ['string'],
              },
              {
                type: ['object', 'array'],
                required: ['abc'],
              },
            ],
          },
        ],
      })

      expect(result).toEqual({
        oneOf: [
          {
            type: 'string',
            required: ['123'],
          },
          {
            type: ['array', 'object'],
            required: ['123', 'abc'],
          },
          {
            type: ['string'],
            required: ['abc'],
          },
          {
            type: ['object', 'array'],
            required: ['abc'],
          },
        ],
      })
    })

    it('merges nested allOf if inside singular oneOf', function () {
      const result = normalize({
        allOf: [
          {
            type: ['array', 'string', 'number'],
            oneOf: [
              {
                required: ['123'],
                allOf: [
                  {
                    required: ['768'],
                  },
                ],
              },
            ],
          },
          {
            type: ['array', 'string'],
          },
        ],
      })

      expect(result).toEqual({
        type: expect.toIncludeSameMembers(['array', 'string']),
        oneOf: [
          {
            required: expect.toIncludeSameMembers(['123', '768']),
          },
        ],
      })
    })

    it('merges nested allOf if inside multiple oneOf', function () {
      const sample = {
        description: 'root',
        title: 'root',
        allOf: [
          {
            type: ['array', 'string', 'number'],
            oneOf: [
              {
                type: ['array', 'object'],
                allOf: [
                  {
                    type: 'object',
                  },
                ],
              },
            ],
          },
          {
            type: ['array', 'string'],
            oneOf: [
              {
                description: 'deep',
                title: 'deep',
                type: 'string',
              },
              {
                type: 'object',
              },
            ],
          },
        ],
      }
      const resultWithMinimumChanges = normalize(sample)
      const resultWithUnifyOnlySpec = normalize(sample, { unify: true })
      const resultWithLiftCombinersSpec = normalize(sample, { liftCombiners: true, unify: true })
      const resultWithSyntheticSpec = normalize(sample, {
        liftCombiners: true,
        unify: true,
        allowNotValidSyntheticChanges: true,
      })

      expect(resultWithMinimumChanges).toMatchObject({
        description: 'root',
        title: 'root',
        type: ['array', 'string'],
        oneOf: [
          {
            ...NOT_ANY_MATCHER,
            description: 'deep',
            title: 'deep',
          },
          { type: 'object' },
        ],
      })

      expect(resultWithUnifyOnlySpec).toMatchObject({
        description: 'root',
        title: 'root',
        anyOf: [
          { type: 'array' },
          { type: 'string' },
        ],
        oneOf: [
          { title: 'deep', ...NOT_ANY_MATCHER },
          { type: 'object' },
        ],
      })

      expect(resultWithLiftCombinersSpec).toEqual({
        oneOf: [
          { title: 'deep', ...NOT_ANY_MATCHER, description: undefined /*no description: 'deep'*/ },
          { title: 'root', ...NOT_ANY_MATCHER, description: undefined /*no description: 'root'*/ },
        ],
      })

      expect(resultWithSyntheticSpec).toEqual({
        oneOf: [
          {
            title: 'deep',
            type: JSON_SCHEMA_NODE_SYNTHETIC_TYPE_NOTHING,
            description: undefined, /*no description: 'deep'*/
          },
          {
            title: 'root',
            type: JSON_SCHEMA_NODE_SYNTHETIC_TYPE_NOTHING,
            description: undefined, /*no description: 'root'*/
          },
        ],
      })
    })

    it('merges not using allOf', function () {
      const result = normalize({
        allOf: [
          {
            not: {
              properties: {
                name: {
                  type: 'string',
                },
              },
            },
          },
          {
            not: {
              properties: {
                name: {
                  type: ['string', 'null'],
                },
              },
            },
          },
        ],
      })

      expect(result).toEqual({
        not: {
          anyOf: [
            {
              properties: {
                name: {
                  type: 'string',
                },
              },
            },
            {
              properties: {
                name: {
                  type: ['string', 'null'],
                },
              },
            },
          ],
        },
      })
    })

    it('merges contains', function () {
      const result = normalize({
        allOf: [
          {},
          {
            contains: {
              properties: {
                name: {
                  type: 'string',
                  pattern: 'bar',
                },
              },
            },
          },
          {
            contains: {
              properties: {
                name: {
                  type: 'string',
                  pattern: 'foo',
                },
              },
            },
          },
        ],
      })

      expect(result).toEqual({
        contains: {
          properties: {
            name: {
              type: 'string',
              pattern: '(?=bar)(?=foo)',
            },
          },
        },
      })
    })

    it('merges pattern using allOf', function () {
      const result = normalize({
        allOf: [
          {},
          {
            pattern: 'fdsaf',
          },
          {
            pattern: 'abba',
          },
        ],
      })

      expect(result).toEqual({
        pattern: '(?=fdsaf)(?=abba)',
      })

      const result2 = normalize({
        allOf: [
          {
            pattern: 'abba',
          },
        ],
      })

      expect(result2).toEqual({
        pattern: 'abba',
      })
    })

    it('merges multipleOf using allOf or direct assignment', function () {
      const result = normalize({
        allOf: [
          {
            title: 'foo',
            type: ['number', 'integer'],
            multipleOf: 2,
          },
          {
            type: 'integer',
            multipleOf: 3,
          },
        ],
      })

      expect(result).toEqual({
        type: 'integer',
        title: 'foo',
        multipleOf: 2 * 3,
      })
    })

    it('merges multipleOf by finding lowest common multiple (LCM)', function () {
      const result = normalize({
        allOf: [
          {},
          {
            multipleOf: 0.2,
            allOf: [
              {
                multipleOf: 2,
                allOf: [
                  {
                    multipleOf: 2,
                    allOf: [
                      {
                        multipleOf: 2,
                        allOf: [
                          {
                            multipleOf: 3,
                            allOf: [
                              {
                                multipleOf: 1.5,
                                allOf: [
                                  {
                                    multipleOf: 0.5,
                                  },
                                ],
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            multipleOf: 0.3,
          },
        ],
      })

      expect(result).toEqual({
        multipleOf: 6,
      })

      expect(
        normalize({
          allOf: [
            {
              multipleOf: 4,
            },
            {
              multipleOf: 15,
            },
            {
              multipleOf: 3,
            },
          ],
        }),
      ).toEqual({
        multipleOf: 60,
      })

      expect(
        normalize({
          allOf: [
            {
              multipleOf: 0.3,
            },
            {
              multipleOf: 0.7,
            },
            {
              multipleOf: 1,
            },
          ],
        }),
      ).toEqual({
        multipleOf: 21,
      })

      expect(
        normalize({
          allOf: [
            {
              multipleOf: 0.5,
            },
            {
              multipleOf: 2,
            },
          ],
        }),
      ).toEqual({
        multipleOf: 2,
      })

      expect(
        normalize({
          allOf: [
            {
              multipleOf: 0.3,
            },
            {
              multipleOf: 0.5,
            },
            {
              multipleOf: 1,
            },
          ],
        }),
      ).toEqual({
        multipleOf: 3,
      })

      expect(
        normalize({
          allOf: [
            {
              multipleOf: 0.3,
            },
            {
              multipleOf: 0.7,
            },
            {
              multipleOf: 1,
            },
          ],
        }),
      ).toEqual({
        multipleOf: 21,
      })

      expect(
        normalize({
          allOf: [
            {
              multipleOf: 0.4,
            },
            {
              multipleOf: 0.7,
            },
            {
              multipleOf: 3,
            },
          ],
        }),
      ).toEqual({
        multipleOf: 42,
      })

      expect(
        normalize({
          allOf: [
            {
              multipleOf: 0.2,
            },
            {
              multipleOf: 0.65,
            },
            {
              multipleOf: 1,
            },
          ],
        }),
      ).toEqual({
        multipleOf: 13,
      })

      expect(
        normalize({
          allOf: [
            {
              multipleOf: 100000,
            },
            {
              multipleOf: 1000000,
            },
            {
              multipleOf: 500000,
            },
          ],
        }),
      ).toEqual({
        multipleOf: 1000000,
      })
    })
  })

  describe('merging arrays', function () {
    it('merges required object', function () {
      expect(
        normalize({
          required: ['prop2'],
          allOf: [
            {
              required: ['prop2', 'prop1'],
            },
          ],
        }),
      ).toEqual({
        required: expect.toIncludeSameMembers(['prop1', 'prop2']),
      })
    })

    it('merges default value. case 1', function () {
      expect(
        normalize({
          default: [
            'prop2',
            {
              prop1: 'foo',
            },
          ],
          allOf: [
            {
              default: ['prop2', 'prop1'],
            },
          ],
        }),
      ).toEqual({
        default: [
          'prop2',
          {
            prop1: 'foo',
          },
        ],
      })
    })

    it('merges default value. case 2', function () {
      expect(
        normalize({
          default: {
            foo: 'bar',
          },
          allOf: [
            {
              default: ['prop2', 'prop1'],
            },
          ],
        }),
      ).toEqual({
        default: {
          foo: 'bar',
        },
      })
    })
  })

  describe('merging objects', function () {
    it('merges child objects', function () {
      expect(
        normalize({
          properties: {
            name: {
              title: 'Name',
              type: 'string',
            },
          },
          allOf: [
            {
              properties: {
                name: {
                  title: 'allof1',
                  type: 'string',
                },
                added: {
                  type: 'integer',
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
        }),
      ).toEqual({
        properties: {
          name: {
            title: 'Name',
            type: 'string',
          },
          added: {
            type: 'integer',
          },
        },
      })
    })

    it.skip('merges boolean schemas', function () {
      expect(
        normalize({
          properties: {
            name: true,
          },
          allOf: [
            {
              properties: {
                name: {
                  title: 'allof1',
                  type: 'string',
                },
                added: {
                  type: 'integer',
                },
              },
            },
            {
              properties: {
                name: {
                  type: 'string',
                  minLength: 5,
                },
              },
            },
          ],
        }),
      ).toEqual({
        properties: {
          name: {
            title: 'allof1',
            type: 'string',
            minLength: 5,
          },
          added: {
            type: 'integer',
          },
        },
      })

      expect(
        normalize({
          properties: {
            name: false,
          },
          allOf: [
            {
              properties: {
                name: {
                  title: 'allof1',
                  type: 'string',
                },
                added: {
                  type: 'integer',
                },
              },
            },
            {
              properties: {
                name: true,
              },
            },
          ],
        }),
      ).toEqual({
        properties: {
          name: false,
          added: {
            type: 'integer',
          },
        },
      })

      expect(
        normalize({
          properties: {
            name: true,
          },
          allOf: [
            {
              properties: {
                name: false,
                added: {
                  type: 'integer',
                },
              },
            },
            {
              properties: {
                name: true,
              },
            },
          ],
        }),
      ).toEqual({
        properties: {
          name: false,
          added: {
            type: 'integer',
          },
        },
      })
    })

    it('merges all allOf', function () {
      const result = normalize({
        properties: {
          name: {
            allOf: [
              {
                pattern: '^.+$',
              },
            ],
          },
        },
        allOf: [
          {
            properties: {
              name: true,
              added: {
                type: 'integer',
                title: 'pri1',
                allOf: [
                  {
                    title: 'pri2',
                    type: ['string', 'integer'],
                    minimum: 15,
                    maximum: 10,
                  },
                ],
              },
            },
            allOf: [
              {
                properties: {
                  name: true,
                  added: {
                    type: 'integer',
                    minimum: 5,
                  },
                },
                allOf: [
                  {
                    properties: {
                      added: {
                        title: 'pri3',
                        type: 'integer',
                        minimum: 10,
                      },
                    },
                  },
                ],
              },
            ],
          },
          {
            properties: {
              name: true,
              added: {
                minimum: 7,
              },
            },
          },
        ],
      })
      expect(result).toEqual({
        properties: {
          name: {
            pattern: '^.+$',
          },
          added: {
            type: 'integer',
            title: 'pri1',
            minimum: 15,
            maximum: 10,
          },
        },
      })
    })
  })

  describe('merging definitions', function () {
    it('merges circular', function () {
      const schema: any = {
        properties: {
          person: {
            properties: {
              name: {
                type: 'string',
                minLength: 8,
              },
              child: {
                $ref: '#/properties/person',
              },
            },
            allOf: [
              {
                properties: {
                  name: {
                    minLength: 5,
                    maxLength: 10,
                  },
                },
                allOf: [
                  {
                    properties: {
                      prop1: {
                        minLength: 7,
                      },
                    },
                  },
                ],
              },
            ],
          },
        },
      }

      const result = normalize(schema)

      const expected = {
        properties: {
          person: {
            properties: {
              name: {
                minLength: 8,
                maxLength: 10,
                type: 'string',
              },
              prop1: {
                minLength: 7,
              },
              child: null as any,//#/properties/person
            },
          },
        },
      }
      expected.properties.person.properties.child = expected.properties.person
      expect(result).toEqual(expected)
    })

    it('merges any definitions and circular', function () {
      const schema = {
        properties: {
          person: {
            $ref: '#/definitions/person',
          },
        },
        definitions: {
          person: {
            properties: {
              name: {
                type: 'string',
                minLength: 8,
              },
              child: {
                $ref: '#/definitions/person',
              },
            },
            allOf: [
              {
                properties: {
                  name: {
                    minLength: 5,
                    maxLength: 10,
                  },
                },
                allOf: [
                  {
                    properties: {
                      prop1: {
                        minLength: 7,
                      },
                    },
                  },
                ],
              },
            ],
          },
        },
      }

      const result = normalize(schema, { inlineRefsFlag: TEST_INLINE_REFS_FLAG })

      const expected = {
        properties: {
          person: null as any,//#/properties/person,
        },
        definitions: {
          person: {
            properties: {
              name: {
                minLength: 8,
                maxLength: 10,
                type: 'string',
              },
              prop1: {
                minLength: 7,
              },
              child: null as any,//#/properties/person,
            },
            [TEST_INLINE_REFS_FLAG]: ['#/definitions/person'],
          },
        },
      }
      expected.properties.person = expected.definitions.person
      expected.definitions.person.properties.child = expected.definitions.person
      expect(result).toEqual(expected)
    })
  })

  describe('dependencies', function () {
    it('merges simliar schemas', function () {
      const result = normalize({
        dependencies: {
          foo: {
            type: ['string', 'null', 'integer'],
            allOf: [
              {
                minimum: 5,
              },
            ],
          },
          bar: ['prop1', 'prop2'],
        },
        allOf: [
          {
            dependencies: {
              foo: {
                type: ['string', 'null'],
                allOf: [
                  {
                    minimum: 7,
                  },
                ],
              },
              bar: ['prop4'],
            },
          },
        ],
      })

      expect(result).toEqual({
        dependencies: {
          foo: {
            type: expect.toIncludeSameMembers(['string', 'null']),
            minimum: 7,
          },
          bar: expect.toIncludeSameMembers(['prop1', 'prop2', 'prop4']),
        },
      })
    })

    it('merges mixed mode dependency', function () {
      const result = normalize({
        dependencies: {
          bar: {
            type: ['string', 'null', 'integer'],
            required: ['abc'],
          },
        },
        allOf: [
          {
            dependencies: {
              bar: ['prop4'],
            },
          },
        ],
      })

      expect(result).toEqual({
        dependencies: {
          bar: {
            type: expect.toIncludeSameMembers(['string', 'null', 'integer']),
            required: expect.toIncludeSameMembers(['abc', 'prop4']),
          },
        },
      })
    })
  })

  describe('propertyNames', function () {
    it('merges simliar schemas', function () {
      const result = normalize({
        propertyNames: {
          type: 'string',
          allOf: [
            {
              minLength: 5,
            },
          ],
        },
        allOf: [
          {
            propertyNames: {
              type: 'string',
              pattern: 'abc.*',
              allOf: [
                {
                  maxLength: 7,
                },
              ],
            },
          },
        ],
      })

      expect(result).toEqual({
        propertyNames: {
          type: 'string',
          pattern: 'abc.*',
          minLength: 5,
          maxLength: 7,
        },
      })
    })
  })

  describe('title merging', function () {
    it('prefers the last occurrence', function () {
      expect(
        normalize({
          allOf: [
            {
              title: 'First',
            },
            {
              title: 'Last',
            },
          ],
        }),
      ).toEqual({
        title: 'Last',
      })
    })

    it('prefers the top-level occurrence', function () {
      expect(
        normalize({
          title: 'Top Level',
          allOf: [
            {
              title: 'First',
            },
            {
              title: 'Last',
            },
          ],
        }),
      ).toEqual({
        title: 'Top Level',
      })
    })
  })

  describe('description merging', function () {
    it('prefers the last occurrence', function () {
      expect(
        normalize({
          allOf: [
            {
              description: 'First',
            },
            {
              description: 'Last',
            },
          ],
        }),
      ).toEqual({
        description: 'Last',
      })
    })

    it('prefers the top-level occurrence', function () {
      expect(
        normalize({
          description: 'Top Level',
          allOf: [
            {
              description: 'First',
            },
            {
              description: 'Last',
            },
          ],
        }),
      ).toEqual({
        description: 'Top Level',
      })
    })
  })
})
