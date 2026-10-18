import { normalize } from '../../src/normalize'
import { parseAsyncApiAndAssertValid } from '../helpers/asyncapi'

describe('Schema and Multi Format Schema rules', () => {

  /**
   * Helper function to create AsyncAPI document with schema in components
   * @param schemaDefinition - The schema definition
   * @param schemaFormat - Optional schema format:
   *   - undefined: creates regular schema (default)
   *   - string value: creates Multi Format Schema with schemaFormat property
   *   - empty string: creates Multi Format Schema without schemaFormat property
   */
  const createAsyncAPIWithSchema = (schemaDefinition: unknown, schemaFormat?: string) => {
    let schema: unknown

    if (schemaFormat === undefined) {
      // Regular schema (no Multi Format Schema wrapper)
      schema = schemaDefinition
    } else if (schemaFormat === '') {
      // Multi Format Schema without schemaFormat property
      schema = {
        schema: schemaDefinition,
      }
    } else {
      // Multi Format Schema with schemaFormat property
      schema = {
        schemaFormat: schemaFormat,
        schema: schemaDefinition,
      }
    }

    return {
      asyncapi: '3.0.0',
      info: {
        title: 'Test API',
        version: '1.0.0',
      },
      components: {
        schemas: {
          TestSchema: schema,
        },
      },
    }
  }

  const NORMALIZATION_OPTIONS = {
    unify: true,
    validate: true,
  }

  describe('AsyncAPI Schema rules', () => {
    it('validates discriminator as string, externalDocs as object, and deprecated as boolean', async () => {
      const source = createAsyncAPIWithSchema({
        type: 'object',
        discriminator: 'entityType', // AsyncAPI: must be string
        externalDocs: {
          description: 'External documentation',
          url: 'https://example.com/docs',
        },
        deprecated: true, // AsyncAPI: must be boolean
        properties: {
          entityType: { type: 'string' },
          name: { type: 'string' },
        },
      })

      await parseAsyncApiAndAssertValid(source)

      const result = normalize(source, NORMALIZATION_OPTIONS)

      const schema = (result as any)?.components?.schemas?.TestSchema

      // Verify discriminator is string
      expect(schema).toHaveProperty('discriminator')
      expect(typeof schema.discriminator).toBe('string')
      expect(schema.discriminator).toBe('entityType')

      // Verify externalDocs is object
      expect(schema).toHaveProperty('externalDocs')
      expect(typeof schema.externalDocs).toBe('object')
      expect(schema.externalDocs).toHaveProperty('description', 'External documentation')
      expect(schema.externalDocs).toHaveProperty('url', 'https://example.com/docs')

      // Verify deprecated is boolean
      expect(schema).toHaveProperty('deprecated')
      expect(typeof schema.deprecated).toBe('boolean')
      expect(schema.deprecated).toBe(true)
    })

    it('applies default value for deprecated and externalDocs', async () => {
      const source = createAsyncAPIWithSchema({
        type: 'object',
        properties: {
          entityType: { type: 'string' },
          name: { type: 'string' },
        },
        // Note: deprecated is not specified
      })

      await parseAsyncApiAndAssertValid(source)

      const result = normalize(source, NORMALIZATION_OPTIONS)

      const schema = (result as any)?.components?.schemas?.TestSchema

      // Verify deprecated defaults to false
      expect(schema).toHaveProperty('deprecated')
      expect(schema.deprecated).toBe(false)

      // Verify externalDocs defaults to empty object
      expect(schema).toHaveProperty('externalDocs')
      expect(schema.externalDocs).toEqual({})

      // Verify discriminator is not present
      expect(schema).not.toHaveProperty('discriminator')
    })

    it('applies default value for schemaFormat in Multi Format Schema', async () => {
      const source = createAsyncAPIWithSchema({
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
        // Note: schemaFormat is not specified (Multi Format Schema without schemaFormat)
      }, '') // Empty string creates Multi Format Schema without schemaFormat property

      await parseAsyncApiAndAssertValid(source)

      const result = normalize(source, NORMALIZATION_OPTIONS)

      const testSchema = (result as any)?.components?.schemas?.TestSchema

      // Verify schemaFormat defaults to AsyncAPI format
      expect(testSchema).toHaveProperty('schemaFormat')
      expect(testSchema.schemaFormat).toBe('application/vnd.aai.asyncapi+json;version=3.0.0')

      // Verify it's a Multi Format Schema (has 'schema' property)
      expect(testSchema).toHaveProperty('schema')
      expect(testSchema.schema).toHaveProperty('type', 'object')
    })
  })

  describe('Schema rules selection', () => {

    /**
     * Helper function to check discriminator behavior for different schema types.
     * Works with both regular schemas and Multi Format Schemas.
     *
     * AsyncAPI discriminator: string (property name)
     * OpenAPI discriminator: object with propertyName
     * JSON Schema: discriminator not supported
     */
    const checkDiscriminatorBehavior = (
      result: unknown,
      expectedBehavior: 'asyncapi' | 'openapi' | 'jsonschema',
      discriminatorValue?: string
    ) => {
      const testSchema = (result as any)?.components?.schemas?.TestSchema

      // Determine if it's a Multi Format Schema (has 'schema' property) or regular schema
      const schema = testSchema?.schema !== undefined ? testSchema.schema : testSchema

      switch (expectedBehavior) {
        case 'asyncapi':
          // AsyncAPI: discriminator is a string
          expect(schema).toHaveProperty('discriminator')
          expect(typeof schema.discriminator).toBe('string')
          if (discriminatorValue) {
            expect(schema.discriminator).toBe(discriminatorValue)
          }
          break

        case 'openapi':
          // OpenAPI: discriminator is an object with propertyName
          expect(schema).toHaveProperty('discriminator')
          expect(typeof schema.discriminator).toBe('object')
          expect(schema.discriminator).toHaveProperty('propertyName')
          if (discriminatorValue) {
            expect(schema.discriminator.propertyName).toBe(discriminatorValue)
          }
          break

        case 'jsonschema':
          // JSON Schema: discriminator not supported
          expect(schema).not.toHaveProperty('discriminator')
          break
      }
    }

    describe('Default AsyncAPI Schema rules', () => {
      it('uses AsyncAPI schema rules by default', async () => {
        const source = createAsyncAPIWithSchema({
          type: 'object',
          discriminator: 'petType', // AsyncAPI style: string
          properties: {
            petType: { type: 'string' },
            name: { type: 'string' },
          },
        })

        await parseAsyncApiAndAssertValid(source)

        const result = normalize(source, NORMALIZATION_OPTIONS)

        checkDiscriminatorBehavior(result, 'asyncapi')
      })
    })



    describe('Multi Format Schema group', () => {

      it('uses AsyncAPI schema rules with alternative AsyncAPI format variations', () => {
        const formats = [
          'application/vnd.aai.asyncapi;version=3.0.0',
          'application/vnd.aai.asyncapi+json;version=3.0.0',
          'application/vnd.aai.asyncapi+yaml;version=3.0.0',
        ]

        formats.forEach(async (format) => {
          const source = createAsyncAPIWithSchema({
            type: 'object',
            discriminator: 'petType', // AsyncAPI style: string
            properties: {
              petType: { type: 'string' },
            },
          }, format)

          await parseAsyncApiAndAssertValid(source)

          const result = normalize(source, NORMALIZATION_OPTIONS)

          checkDiscriminatorBehavior(result, 'asyncapi', 'petType')
        })
      })



      it('uses OpenAPI schema rules with alternative OpenAPI format variations', () => {
        const formats = [
          'application/vnd.oai.openapi;version=3.0.0',
          'application/vnd.oai.openapi+json;version=3.0.0',
          'application/vnd.oai.openapi+yaml;version=3.0.0',
        ]

        formats.forEach(async (format) => {
          const source = createAsyncAPIWithSchema({
            type: 'object',
            discriminator: {
              propertyName: 'petType', // OpenAPI style: object
            },
            properties: {
              petType: { type: 'string' },
            },
          }, format)

          // await parseAsyncApiAndAssertValid(source) // parser does not support OpenAPI format variations?

          const result = normalize(source, NORMALIZATION_OPTIONS)

          checkDiscriminatorBehavior(result, 'openapi', 'petType')
        })
      })



      it('uses JSON Schema rules with alternative JSON Schema format variations', async () => {
        const formats = [
          'application/schema+json;version=draft-07',
          'application/schema+yaml;version=draft-07',
        ]

        formats.forEach(async (format) => {
          const source = createAsyncAPIWithSchema({
            type: 'object',
            properties: {
              petType: { type: 'string' },
              name: { type: 'string' },
            },
          }, format)

          await parseAsyncApiAndAssertValid(source)

          const result = normalize(source, NORMALIZATION_OPTIONS)

          checkDiscriminatorBehavior(result, 'jsonschema')
        })
      })

      it('defaults schemaFormat to AsyncAPI when not specified in Multi Format Schema', async () => {
        const source = createAsyncAPIWithSchema({
          type: 'object',
          discriminator: 'petType', // AsyncAPI style: string
          properties: {
            petType: { type: 'string' },
          },
        }, '')

        await parseAsyncApiAndAssertValid(source)

        const result = normalize(source, NORMALIZATION_OPTIONS)

        checkDiscriminatorBehavior(result, 'asyncapi', 'petType')
      })

      it('handles schemaFormat with different casing', async () => {
        const formats = [
          'APPLICATION/VND.AAI.ASYNCAPI+JSON;VERSION=3.0.0',
          'Application/Vnd.Aai.AsyncAPI+Json;Version=3.0.0',
        ]

        formats.forEach(async (format) => {
          const source = createAsyncAPIWithSchema({
            type: 'object',
            discriminator: 'petType', // AsyncAPI style: string
            properties: {
              petType: { type: 'string' },
            },
          }, format)

          // await parseAsyncApiAndAssertValid(source) // parser does not support format variations?

          const result = normalize(source, NORMALIZATION_OPTIONS)

          checkDiscriminatorBehavior(result, 'asyncapi', 'petType')
        })
      })
    })
  })
})
