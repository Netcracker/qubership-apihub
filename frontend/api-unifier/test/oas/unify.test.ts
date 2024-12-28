import { deUnify, unify } from '../../src/unify'
import { TEST_INLINE_REFS_FLAG } from '../helpers'

describe('unify', () => {
  describe('type infer', () => {
    it('skip if exist even if wrong', () => {
      const result = unify({
        type: 'array',
        properties: {
          some: { type: 'string' },
        },
      }, { unify: true })
      expect(result).toEqual(result)
    })

    it('detect object', () => {
      const result = unify({
        properties: {
          required: { required: [] },
          minProperties: { minProperties: 42 },
          maxProperties: { maxProperties: 42 },
          propertyNames: { propertyNames: { type: 'string' } },
          patternProperties: { patternProperties: { '^abc': { type: 'null' } } },
          additionalProperties: { additionalProperties: { type: 'null' } },
        },
      }, { unify: true })
      expect(result).toMatchObject({
        properties: {
          required: {
            required: [],
            readOnly: false,
            writeOnly: false,
            deprecated: false,
            minProperties: 0,
            type: 'object',
          },
          minProperties: {
            minProperties: 42,
            readOnly: false,
            writeOnly: false,
            deprecated: false,
            type: 'object',
          },
          maxProperties: {
            maxProperties: 42,
            readOnly: false,
            writeOnly: false,
            deprecated: false,
            minProperties: 0,
            type: 'object',
          },
          propertyNames: {
            propertyNames: {
              type: 'string',
            },
            readOnly: false,
            writeOnly: false,
            deprecated: false,
            minProperties: 0,
            type: 'object',
          },
          patternProperties: {
            patternProperties: {
              '^abc': {
                type: 'null',
              },
            },
            readOnly: false,
            writeOnly: false,
            deprecated: false,
            minProperties: 0,
            type: 'object',
          },
          additionalProperties: {
            additionalProperties: {
              type: 'null',
            },
            readOnly: false,
            writeOnly: false,
            deprecated: false,
            minProperties: 0,
            type: 'object',
          },
        },
        type: 'object',
      })
    })

    it('detect arrays', () => {
      const result = unify({
        type: 'null',
        anyOf: [
          { items: { type: 'null' } },
          { contains: { type: 'null' } },
          { minItems: 42 },
          { maxItems: 42 },
          { uniqueItems: true },
          { additionalItems: { type: 'null' } },
        ],
      }, { unify: true })
      expect(result).toEqual({
        type: 'null',
        readOnly: false,
        writeOnly: false,
        deprecated: false,
        anyOf: [
          {
            items: {
              type: 'null',
              readOnly: false,
              writeOnly: false,
              deprecated: false,
            },
            minItems: 0,
            uniqueItems: false,
            readOnly: false,
            writeOnly: false,
            deprecated: false,
            type: 'array',
          },
          {
            contains: {
              type: 'null',
              readOnly: false,
              writeOnly: false,
              deprecated: false,
            },
            minItems: 0,
            uniqueItems: false,
            readOnly: false,
            writeOnly: false,
            deprecated: false,
            type: 'array',
          },
          {
            minItems: 42,
            uniqueItems: false,
            readOnly: false,
            writeOnly: false,
            deprecated: false,
            type: 'array',
          },
          {
            maxItems: 42,
            minItems: 0,
            uniqueItems: false,
            readOnly: false,
            writeOnly: false,
            deprecated: false,
            type: 'array',
          },
          {
            uniqueItems: true,
            minItems: 0,
            readOnly: false,
            writeOnly: false,
            deprecated: false,
            type: 'array',
          },
          {
            additionalItems: {
              type: 'null',
              readOnly: false,
              writeOnly: false,
              deprecated: false,
            },
            minItems: 0,
            uniqueItems: false,
            readOnly: false,
            writeOnly: false,
            deprecated: false,
            type: 'array',
          },
        ],
      })

      //case for {}
    })

    it('detect string', () => {
      const result = unify({
        type: 'null',
        anyOf: [
          { format: 'my' },
          { minLength: 42 },
          { maxLength: 42 },
          { pattern: 'pattern' },
        ],
      }, { unify: true, liftCombiners: true })
      expect(result).toEqual({
        type: 'null',
        readOnly: false,
        writeOnly: false,
        deprecated: false,
        anyOf: [
          {
            anyOf: [
              {
                format: 'my',
                type: 'string',
                readOnly: false,
                writeOnly: false,
                deprecated: false,
                minLength: 0,
              },
              {
                format: 'my',
                type: 'number',
                readOnly: false,
                writeOnly: false,
                deprecated: false,
              },
              {
                format: 'my',
                type: 'integer',
                readOnly: false,
                writeOnly: false,
                deprecated: false,
              },
            ],
          },
          {
            minLength: 42,
            type: 'string',
            readOnly: false,
            writeOnly: false,
            deprecated: false,
          },
          {
            maxLength: 42,
            type: 'string',
            readOnly: false,
            writeOnly: false,
            deprecated: false,
            minLength: 0,
          },
          {
            pattern: 'pattern',
            type: 'string',
            readOnly: false,
            writeOnly: false,
            deprecated: false,
            minLength: 0,
          },
        ],
      })
    })

    it('detect number and integer', () => {
      const result = unify({
        type: 'null',
        anyOf: [
          { format: 'my' },
          { minimum: 42 },
          { maximum: 42 },
          { exclusiveMinimum: 43 },
          { exclusiveMaximum: 43 },
        ],
      }, { unify: true, liftCombiners: true })
      expect(result).toEqual({
        type: 'null',
        readOnly: false,
        writeOnly: false,
        deprecated: false,
        anyOf: [
          {
            anyOf: [
              {
                format: 'my',
                type: 'string',
                readOnly: false,
                writeOnly: false,
                deprecated: false,
                minLength: 0,
              },
              {
                format: 'my',
                type: 'number',
                readOnly: false,
                writeOnly: false,
                deprecated: false,
              },
              {
                format: 'my',
                type: 'integer',
                readOnly: false,
                writeOnly: false,
                deprecated: false,
              },
            ],
          },
          {
            anyOf: [
              {
                minimum: 42,
                type: 'number',
                readOnly: false,
                writeOnly: false,
                deprecated: false,
              },
              {
                minimum: 42,
                type: 'integer',
                readOnly: false,
                writeOnly: false,
                deprecated: false,
              },
            ],
          },
          {
            anyOf: [
              {
                maximum: 42,
                type: 'number',
                readOnly: false,
                writeOnly: false,
                deprecated: false,
              },
              {
                maximum: 42,
                type: 'integer',
                readOnly: false,
                writeOnly: false,
                deprecated: false,
              },
            ],
          },
          {
            anyOf: [
              {
                exclusiveMinimum: 43,
                type: 'number',
                readOnly: false,
                writeOnly: false,
                deprecated: false,

              },
              {
                exclusiveMinimum: 43,
                type: 'integer',
                readOnly: false,
                writeOnly: false,
                deprecated: false,
              },
            ],
          },
          {
            anyOf: [
              {
                exclusiveMaximum: 43,
                type: 'number',
                readOnly: false,
                writeOnly: false,
                deprecated: false,
              },
              {
                exclusiveMaximum: 43,
                type: 'integer',
                readOnly: false,
                writeOnly: false,
                deprecated: false,
              },
            ],
          },
        ],
      })
    })

    it('detect dirty {}', () => {
      const customSymbol = Symbol('custom')
      const result = unify({
        description: 'anything',
        [customSymbol]: true,
        [TEST_INLINE_REFS_FLAG]: [],
      }, { unify: true, liftCombiners: true, inlineRefsFlag: TEST_INLINE_REFS_FLAG })
      expect(result).toMatchObject({
        [TEST_INLINE_REFS_FLAG]: [],
        anyOf: [
          {
            [customSymbol]: true,
            description: 'anything',
            type: 'boolean',
            readOnly: false,
            writeOnly: false,
            deprecated: false,
          },
          {
            [customSymbol]: true,
            description: 'anything',
            type: 'string',
            readOnly: false,
            writeOnly: false,
            deprecated: false,
          },
          {
            [customSymbol]: true,
            description: 'anything',
            type: 'number',
            readOnly: false,
            writeOnly: false,
            deprecated: false,
          },
          {
            [customSymbol]: true,
            description: 'anything',
            type: 'integer',
            readOnly: false,
            writeOnly: false,
            deprecated: false,
          },
          {
            [customSymbol]: true,
            description: 'anything',
            type: 'object',
            readOnly: false,
            writeOnly: false,
            deprecated: false,
          },
          {
            [customSymbol]: true,
            description: 'anything',
            type: 'array',
            readOnly: false,
            writeOnly: false,
            deprecated: false,
          },
          {
            [customSymbol]: true,
            description: 'anything',
            type: 'null',
            readOnly: false,
            writeOnly: false,
            deprecated: false,
          },
        ],
      })
    })

    it('detect pure {}. case {}', () => {
      const customSymbol = Symbol('custom')
      const result = unify({ [customSymbol]: true }, { unify: true })
      const expected = {
        [customSymbol]: true,
        anyOf: [
          {
            type: 'boolean',
            readOnly: false,
            writeOnly: false,
            deprecated: false,
          },
          {
            type: 'string',
            readOnly: false,
            writeOnly: false,
            deprecated: false,
          },
          {
            type: 'number',
            readOnly: false,
            writeOnly: false,
            deprecated: false,
          },
          {
            type: 'integer',
            readOnly: false,
            writeOnly: false,
            deprecated: false,
          },
          {
            type: 'object',
            readOnly: false,
            writeOnly: false,
            deprecated: false,
          },
          {
            type: 'array',
            readOnly: false,
            writeOnly: false,
            deprecated: false,
          },
          {
            type: 'null',
            readOnly: false,
            writeOnly: false,
            deprecated: false,
          },
        ],
      } as const
      expect(result).toMatchObject(expected)
    })

    it('detect pure {}. case true', () => {
      const result = unify({ additionalProperties: true }, { unify: true })
      const expected = {
        type: 'object',
        additionalProperties: {
          anyOf: [
            {
              type: 'boolean',
              readOnly: false,
              writeOnly: false,
              deprecated: false,
            },
            {
              type: 'string',
              readOnly: false,
              writeOnly: false,
              deprecated: false,
            },
            {
              type: 'number',
              readOnly: false,
              writeOnly: false,
              deprecated: false,
            },
            {
              type: 'integer',
              readOnly: false,
              writeOnly: false,
              deprecated: false,
            },
            {
              type: 'object',
              readOnly: false,
              writeOnly: false,
              deprecated: false,
            },
            {
              type: 'array',
              readOnly: false,
              writeOnly: false,
              deprecated: false,
            },
            {
              type: 'null',
              readOnly: false,
              writeOnly: false,
              deprecated: false,
            },
          ],
        },
        readOnly: false,
        writeOnly: false,
        deprecated: false,
        minProperties: 0,

      } as const
      expect(result).toMatchObject(expected)
    })

    it('detect pure {}. case false', () => {
      const result = unify({ additionalProperties: false }, { unify: true })
      const expected = {
        type: 'object',
        additionalProperties: {
          not: {
            anyOf: [
              {
                type: 'boolean',
                readOnly: false,
                writeOnly: false,
                deprecated: false,
              },
              {
                type: 'string',
                readOnly: false,
                writeOnly: false,
                deprecated: false,
              },
              {
                type: 'number',
                readOnly: false,
                writeOnly: false,
                deprecated: false,
              },
              {
                type: 'integer',
                readOnly: false,
                writeOnly: false,
                deprecated: false,
              },
              {
                type: 'object',
                readOnly: false,
                writeOnly: false,
                deprecated: false,
              },
              {
                type: 'array',
                readOnly: false,
                writeOnly: false,
                deprecated: false,
              },
              {
                type: 'null',
                readOnly: false,
                writeOnly: false,
                deprecated: false,
              },
            ],
          },
        },
        readOnly: false,
        writeOnly: false,
        deprecated: false,
        minProperties: 0,

      } as const
      expect(result).toMatchObject(expected)
    })

    it('skip if broken. allOf', () => {
      const result = unify({
        allOf: {
          problem: true,
        },
      }, { unify: true })
      expect(result).toEqual(result)
    })

    it('skip if broken. ref', () => {
      const result = unify({
        $ref: 'problem',
      }, { unify: true })
      expect(result).toEqual(result)
    })

    it('additional properties are same', () => {
      const result1 = unify({
        type: 'object',
      }, { unify: true })
      const result2 = unify({
        type: 'object',
        additionalProperties: true,
      }, { unify: true })
      expect(result1).toEqual(result2)
    })
    it('additional properties are same for false', () => {
      const result = unify({
        type: 'object',
        additionalProperties: false,
      }, { unify: true })
      expect(result).toMatchObject({
        type: 'object',
        additionalProperties: {
          not: {},
        },
      })
    })

    it('remove unsupported types from propertyNames', () => {
      const result = unify({
        propertyNames: {
          minimum: 42,
        },
      }, { unify: true })
      expect(result).toMatchObject({
        type: 'object',
        propertyNames: {
          type: 'string',
        },
      },
      )
    })

    it('remove unsupported types from propertyNames. case merge', () => {
      const result = unify({
        propertyNames: {
          description: 'details',
        },
      }, { unify: true })
      expect(result).toMatchObject({
        type: 'object',
        propertyNames: {
          description: 'details',
          type: 'string',
        },
      },
      )
    })
  })

  it('do not break cycled jso', () => {
    const root = {
      properties: {
        cycle: { additionalProperties: {} },
      },
      additionalProperties: { type: 'null' },
    }
    root.properties.cycle.additionalProperties = root
    const result = unify(root, { unify: true })
    const expected = {
      type: 'object',
      readOnly: false,
      writeOnly: false,
      deprecated: false,
      minProperties: 0,
      patternProperties: {},
      required: [],
      properties: {
        cycle: {
          type: 'object',
          readOnly: false,
          writeOnly: false,
          deprecated: false,
          minProperties: 0,
          properties: {},
          patternProperties: {},
          required: [],
          additionalProperties: {},
        },
      },
      additionalProperties: {
        type: 'null',
        readOnly: false,
        writeOnly: false,
        deprecated: false,
      },
    }
    expected.properties.cycle.additionalProperties = expected
    expect(result).toEqual(expected)
  })

  it('exclusiveMaximum and exclusiveMinimum are false by default on openapi 3.0', () => {
    const result = unify({
      openapi: '3.0.1',
      components: {
        schemas: {
          TestComponent: {
            anyOf: [
              { type: 'string' },
              { type: 'number' },
              { type: 'integer' },
            ],
          },
        },
      },
    }, { unify: true })
    const expected = {
      openapi: '3.0.1',
      paths:{},
      components: {
        securitySchemes: {},
        examples: {},
        headers: {},
        links: {},
        parameters: {},
        requestBodies: {},
        responses: {},
        schemas: {
          TestComponent: {
            anyOf: [
              { nullable: false, readOnly: false, writeOnly: false, deprecated: false, type: 'string', minLength: 0 },
              {
                nullable: false,
                readOnly: false,
                writeOnly: false,
                deprecated: false,
                exclusiveMaximum: false,
                exclusiveMinimum: false,
                type: 'number',
              },
              {
                nullable: false,
                readOnly: false,
                writeOnly: false,
                deprecated: false,
                exclusiveMaximum: false,
                exclusiveMinimum: false,
                type: 'integer',
              },
            ],
          },
        },
      },
    }
    expect(result).toEqual(expected)
  })

  it('fix required', () => {
    const options = { unify: true, validate: true }
    const result = deUnify(unify({
      type: 'object',
      required: ['a', 'b', 'c', 'a'],
      properties: {
        a: { type: 'string' },
        c: { type: 'string' },
      },
    }, options), options)
    expect(result).toEqual({
      type: 'object',
      required: ['a', 'c'],
      properties: {
        a: { type: 'string' },
        c: { type: 'string' },
      },
    })
  })

  it('fix enums', () => {
    const options = { unify: true, validate: true }
    const result = deUnify(unify({
      type: 'object',
      enum: ['a', { deep: { deep: {} } }, null, undefined, 'a', { deep: { deep: {} } }, null, undefined],
    }, options), options)
    expect(result).toEqual({
      type: 'object',
      enum: ['a', { deep: { deep: {} } }, null, undefined],
    })
  })

  it('openapi.pathItems', () => {
    const result: any = deUnify(unify({
      openapi: '3.0.0',
      info: {
        title: 'Title',
        version: '0.0.0',
      },
      paths: {
        testPath: {
          summary: 'Common Summary',
          description: 'Common Description',
          parameters: [
            { name: 'common-parameter', in: 'path' },
          ],
          servers: [
            { url: 'http://common-server.com' },
          ],
          'x-extension': true,
          post: {
            description: 'Post Description',
            parameters: [
              { name: 'post-parameter', in: 'path' },
            ],
            servers: [
              { url: 'http://post-server.com' },
            ],
            responses: {},
          },
          get: {
            summary: 'Get Summary',
            parameters: [
              { name: 'get-parameter', in: 'path' },
            ],
            servers: [
              { url: 'http://get-server.com' },
            ],
            responses: {},
          },
        },
      },
    }))

    expect(result.paths).toEqual({
      testPath: {
        post: {
          summary: 'Common Summary',
          description: 'Post Description',
          'x-extension': true,
          parameters: expect.toIncludeSameMembers([
            { name: 'common-parameter', in: 'path' },
            { name: 'post-parameter', in: 'path' },
          ]),
          servers: expect.toIncludeSameMembers([
            { url: 'http://post-server.com' },
            { url: 'http://common-server.com' },
          ]),
          responses: {},
        },
        get: {
          summary: 'Get Summary',
          description: 'Common Description',
          'x-extension': true,
          parameters: expect.toIncludeSameMembers([
            { name: 'common-parameter', in: 'path' },
            { name: 'get-parameter', in: 'path' },
          ]),
          servers: expect.toIncludeSameMembers([
            { url: 'http://common-server.com' },
            { url: 'http://get-server.com' },
          ]),
          responses: {},
        },
      },
    })
  })
})
