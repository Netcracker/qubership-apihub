import { unify } from '../../src/unify'
import { normalize } from '../../src'
import { createOas } from '../helpers'
import { parseAsyncApiAndAssertValid } from '../helpers/asyncapi'

describe('exclusive bounds unification', () => {
  describe('plain JSON Schema', () => {
    it.each([
      {
        name: 'keeps greater exclusiveMinimum over minimum',
        source: { type: 'number', minimum: 1, exclusiveMinimum: 2 },
        expectedPresentProperty: 'exclusiveMinimum',
        expectedPresentValue: 2,
        expectedRemoved: 'minimum',
      },
      {
        name: 'keeps minimum over lower exclusiveMinimum',
        source: { type: 'number', minimum: 2, exclusiveMinimum: 1 },
        expectedPresentProperty: 'minimum',
        expectedPresentValue: 2,
        expectedRemoved: 'exclusiveMinimum',
      },
      {
        name: 'keeps exclusiveMinimum when lower bounds are equal',
        source: { type: 'number', minimum: 1, exclusiveMinimum: 1 },
        expectedPresentProperty: 'exclusiveMinimum',
        expectedPresentValue: 1,
        expectedRemoved: 'minimum',
      },
      {
        name: 'keeps lower exclusiveMaximum over maximum',
        source: { type: 'number', maximum: 2, exclusiveMaximum: 1 },
        expectedPresentProperty: 'exclusiveMaximum',
        expectedPresentValue: 1,
        expectedRemoved: 'maximum',
      },
      {
        name: 'keeps maximum over greater exclusiveMaximum',
        source: { type: 'number', maximum: 1, exclusiveMaximum: 2 },
        expectedPresentProperty: 'maximum',
        expectedPresentValue: 1,
        expectedRemoved: 'exclusiveMaximum',
      },
      {
        name: 'keeps exclusiveMaximum when upper bounds are equal',
        source: { type: 'number', maximum: 1, exclusiveMaximum: 1 },
        expectedPresentProperty: 'exclusiveMaximum',
        expectedPresentValue: 1,
        expectedRemoved: 'maximum',
      },
    ])('$name', ({ source, expectedPresentProperty, expectedPresentValue, expectedRemoved }) => {
      const result = unify(source, { unify: true }) as Record<PropertyKey, unknown>

      expect(result).toHaveProperty(expectedPresentProperty, expectedPresentValue)
      expect(result).not.toHaveProperty(expectedRemoved)
    })

    it('does not remove redundant pairs when removeRedundantConstraints is false', () => {
      const source = {
        type: 'number',
        minimum: 1,
        exclusiveMinimum: 2,
      }

      const result = unify(source, { unify: true, removeRedundantConstraints: false }) as Record<PropertyKey, unknown>

      expect(result).toHaveProperty('minimum', 1)
      expect(result).toHaveProperty('exclusiveMinimum', 2)
    })
  })

  describe('JSON schema as part of other specifications', () => {
    it('leaves OpenAPI 3.0 boolean exclusive flags untouched', () => {
      const result = normalize(createOas({
        type: 'number',
        minimum: 1,
        exclusiveMinimum: true,
      }), { unify: true })

      expect(result).toHaveProperty(['components', 'schemas', 'Single', 'minimum'], 1)
      expect(result).toHaveProperty(['components', 'schemas', 'Single', 'exclusiveMinimum'], true)
    })

    it('normalizes OpenAPI 3.1 numeric exclusive bounds', () => {
      const result = normalize(createOas({
        type: 'number',
        minimum: 1,
        exclusiveMinimum: 2,
      }, '3.1.0'), { unify: true })

      expect(result).not.toHaveProperty(['components', 'schemas', 'Single', 'minimum'])
      expect(result).toHaveProperty(['components', 'schemas', 'Single', 'exclusiveMinimum'], 2)
    })

    it('normalizes plain AsyncAPI JSON Schema', async () => {
      const source = {
        asyncapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        components: {
          schemas: {
            TestSchema: {
              type: 'number',
              maximum: 10,
              exclusiveMaximum: 8,
            },
          },
        },
      }

      await parseAsyncApiAndAssertValid(source)

      const result = normalize(source, { unify: true })

      expect(result).not.toHaveProperty(['components', 'schemas', 'TestSchema', 'maximum'])
      expect(result).toHaveProperty(['components', 'schemas', 'TestSchema', 'exclusiveMaximum'], 8)
    })

    it('normalizes AsyncAPI JSON Schema draft-07 multi-format schemas', async () => {
      const source = {
        asyncapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        components: {
          schemas: {
            TestSchema: {
              schemaFormat: 'application/schema+json;version=draft-07',
              schema: {
                type: 'number',
                maximum: 10,
                exclusiveMaximum: 8,
              },
            },
          },
        },
      }

      await parseAsyncApiAndAssertValid(source)

      const result = normalize(source, { unify: true })

      expect(result).not.toHaveProperty(['components', 'schemas', 'TestSchema', 'schema', 'maximum'])
      expect(result).toHaveProperty(['components', 'schemas', 'TestSchema', 'schema', 'exclusiveMaximum'], 8)
    })
  })
})
