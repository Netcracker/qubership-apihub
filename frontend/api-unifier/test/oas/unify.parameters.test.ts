import { normalize } from '../../src'
import { TEST_HASH_FLAG, TEST_INLINE_REFS_FLAG, TEST_ORIGINS_FLAG, TEST_SYNTHETIC_TITLE_FLAG } from '../helpers'
import { expect, describe, it } from '@jest/globals'
import 'jest-extended'

describe('Parameter Deduplication', () => {
  const baseOptions = {
    validate: true,
    liftCombiners: true,
    unify: true,
    allowNotValidSyntheticChanges: true,
    syntheticTitleFlag: TEST_SYNTHETIC_TITLE_FLAG,
    originsFlag: TEST_ORIGINS_FLAG,
    hashFlag: TEST_HASH_FLAG,
    inlineRefsFlag: TEST_INLINE_REFS_FLAG,
  }

  describe('Duplicates in Path Item Parameters', () => {
    it('should detect and remove duplicate parameters at path level', () => {
      const errors: string[] = []
      const spec = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users/{id}': {
            parameters: [
              { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
              { name: 'id', in: 'path', required: true, schema: { type: 'string' } }, // duplicate
            ],
            get: {
              responses: {
                '200': { description: 'OK' },
              },
            },
          },
        },
      }

      const result = normalize(spec, {
        ...baseOptions,
        onUnifyError: (message) => {
          errors.push(message)
        },
      }) as any

      // Should report error for duplicate
      expect(errors).toHaveLength(1)
      expect(errors[0]).toContain("Duplicate parameter detected: name='id', in='path'")

      // Path-level parameters are moved to operations, so check operation parameters
      // After pathItemsUnification, path.parameters is removed and moved to each operation
      const operationParams = result.paths?.['/users/{id}']?.get?.parameters
      expect(operationParams).toHaveLength(1)
      expect(operationParams[0]).toMatchObject({
        name: 'id',
        in: 'path',
      })
    })

    it('should allow parameters with same name but different location', () => {
      const errors: string[] = []
      const spec = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            parameters: [
              { name: 'id', in: 'query', schema: { type: 'string' } },
              { name: 'id', in: 'header', schema: { type: 'string' } }, // different location
            ],
            get: {
              responses: {
                '200': { description: 'OK' },
              },
            },
          },
        },
      }

      const result = normalize(spec, {
        ...baseOptions,
        onUnifyError: (message) => {
          errors.push(message)
        },
      }) as any

      // Should NOT report error
      expect(errors).toHaveLength(0)

      // Should keep both parameters (in operation after pathItemsUnification)
      const operationParams = result.paths?.['/users']?.get?.parameters
      expect(operationParams).toHaveLength(2)
    })
  })

  describe('Duplicates in Operation Parameters', () => {
    it('should detect and remove duplicate parameters at operation level', () => {
      const errors: string[] = []
      const spec = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
              parameters: [
                { name: 'limit', in: 'query', schema: { type: 'integer' } },
                { name: 'limit', in: 'query', schema: { type: 'integer' } }, // duplicate
              ],
              responses: {
                '200': { description: 'OK' },
              },
            },
          },
        },
      }

      const result = normalize(spec, {
        ...baseOptions,
        onUnifyError: (message) => {
          errors.push(message)
        },
      }) as any

      // Should report error for duplicate
      expect(errors).toHaveLength(1)
      expect(errors[0]).toContain("Duplicate parameter detected: name='limit', in='query'")

      // Should keep only first occurrence
      const operationParams = result.paths?.['/users']?.get?.parameters
      expect(operationParams).toHaveLength(1)
      expect(operationParams[0]).toMatchObject({
        name: 'limit',
        in: 'query',
      })
    })
  })

  describe('Operation Parameters Override Path Parameters', () => {
    it('should allow operation parameter to override path parameter without error', () => {
      const errors: string[] = []
      const spec = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users/{id}': {
            parameters: [
              { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'Path level' },
            ],
            get: {
              parameters: [
                { name: 'id', in: 'path', required: true, schema: { type: 'integer' }, description: 'Operation level' },
              ],
              responses: {
                '200': { description: 'OK' },
              },
            },
          },
        },
      }

      const result = normalize(spec, {
        ...baseOptions,
        onUnifyError: (message) => {
          errors.push(message)
        },
      }) as any

      // Should NOT report error (override is valid)
      expect(errors).toHaveLength(0)

      // Should keep operation-level definition
      const operationParams = result.paths?.['/users/{id}']?.get?.parameters
      expect(operationParams).toHaveLength(1)
      expect(operationParams[0]).toMatchObject({
        name: 'id',
        in: 'path',
        description: 'Operation level',
        schema: { type: 'integer' },
      })
    })

    it('should merge non-overridden path parameters with operation parameters', () => {
      const errors: string[] = []
      const spec = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users/{id}': {
            parameters: [
              { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
              { name: 'apiKey', in: 'header', required: true, schema: { type: 'string' } },
            ],
            get: {
              parameters: [
                { name: 'limit', in: 'query', schema: { type: 'integer' } },
              ],
              responses: {
                '200': { description: 'OK' },
              },
            },
          },
        },
      }

      const result = normalize(spec, {
        ...baseOptions,
        onUnifyError: (message) => {
          errors.push(message)
        },
      }) as any

      // Should NOT report any errors
      expect(errors).toHaveLength(0)

      // Should have all three parameters
      const operationParams = result.paths?.['/users/{id}']?.get?.parameters
      expect(operationParams).toHaveLength(3)

      // Operation parameters come first, then non-overridden path parameters are appended
      expect(operationParams[0]).toMatchObject({ name: 'limit', in: 'query' })
      expect(operationParams[1]).toMatchObject({ name: 'id', in: 'path' })
      expect(operationParams[2]).toMatchObject({ name: 'apiKey', in: 'header' })
    })
  })

  describe('Mixed Scenarios', () => {
    it('should handle path duplicates + operation override correctly', () => {
      const errors: string[] = []
      const spec = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users/{id}': {
            parameters: [
              { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
              { name: 'id', in: 'path', required: true, schema: { type: 'string' } }, // duplicate at path level
              { name: 'apiKey', in: 'header', schema: { type: 'string' } },
            ],
            get: {
              parameters: [
                { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }, // overrides path
                { name: 'limit', in: 'query', schema: { type: 'integer' } },
                { name: 'limit', in: 'query', schema: { type: 'integer' } }, // duplicate at operation level
              ],
              responses: {
                '200': { description: 'OK' },
              },
            },
          },
        },
      }

      const result = normalize(spec, {
        ...baseOptions,
        onUnifyError: (message) => {
          errors.push(message)
        },
      }) as any

      // Note: pathItemsUnification happens before deduplication, so only one error is reported
      expect(errors).toHaveLength(1)
      expect(errors[0]).toContain("Duplicate parameter detected: name='limit', in='query'")

      // Final result should have 3 unique parameters
      const operationParams = result.paths?.['/users/{id}']?.get?.parameters
      expect(operationParams).toHaveLength(3)

      // apiKey from path (not overridden)
      expect(operationParams.find((p: any) => p.name === 'apiKey')).toMatchObject({
        name: 'apiKey',
        in: 'header',
      })

      // id from operation (overrides path)
      const idParam = operationParams.find((p: any) => p.name === 'id')
      expect(idParam).toMatchObject({
        name: 'id',
        in: 'path',
        schema: { type: 'integer' }, // operation version
      })

      // limit from operation
      expect(operationParams.find((p: any) => p.name === 'limit')).toMatchObject({
        name: 'limit',
        in: 'query',
      })
    })

    it('should handle multiple operations with different overrides', () => {
      const errors: string[] = []
      const spec = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users/{id}': {
            parameters: [
              { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
            ],
            get: {
              parameters: [
                { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }, // override
              ],
              responses: {
                '200': { description: 'OK' },
              },
            },
            post: {
              parameters: [
                { name: 'limit', in: 'query', schema: { type: 'integer' } }, // no override
              ],
              responses: {
                '201': { description: 'Created' },
              },
            },
          },
        },
      }

      const result = normalize(spec, {
        ...baseOptions,
        onUnifyError: (message) => {
          errors.push(message)
        },
      }) as any

      // Should NOT report any errors
      expect(errors).toHaveLength(0)

      // GET should have overridden id
      const getParams = result.paths?.['/users/{id}']?.get?.parameters
      expect(getParams).toHaveLength(1)
      expect(getParams[0]).toMatchObject({
        name: 'id',
        in: 'path',
        schema: { type: 'integer' },
      })

      // POST should have both operation limit and path id (operation params first)
      const postParams = result.paths?.['/users/{id}']?.post?.parameters
      expect(postParams).toHaveLength(2)
      expect(postParams[0]).toMatchObject({ name: 'limit', in: 'query' })
      expect(postParams[1]).toMatchObject({ name: 'id', in: 'path', schema: { type: 'string' } })
    })
  })

  describe('No Duplicates', () => {
    it('should not report errors when there are no duplicates', () => {
      const errors: string[] = []
      const spec = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            parameters: [
              { name: 'apiKey', in: 'header', schema: { type: 'string' } },
            ],
            get: {
              parameters: [
                { name: 'limit', in: 'query', schema: { type: 'integer' } },
                { name: 'offset', in: 'query', schema: { type: 'integer' } },
              ],
              responses: {
                '200': { description: 'OK' },
              },
            },
          },
        },
      }

      const result = normalize(spec, {
        ...baseOptions,
        onUnifyError: (message) => {
          errors.push(message)
        },
      }) as any

      // Should NOT report any errors
      expect(errors).toHaveLength(0)

      // Should have all 3 parameters
      const operationParams = result.paths?.['/users']?.get?.parameters
      expect(operationParams).toHaveLength(3)
    })
  })

  describe('Sparse Array Handling', () => {
    it('should handle sparse arrays with null/invalid parameters', () => {
      const validateErrors: string[] = []
      const unifyErrors: string[] = []
      const spec = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/test': {
            parameters: [
              null, // invalid - creates sparse array
              { name: 'id', in: 'path', schema: { type: 'string' } },
              { name: 'limit', in: 'query', schema: { type: 'integer' } },
            ],
            get: {
              parameters: [
                { name: 'offset', in: 'query', schema: { type: 'integer' } },
                'invalid', // invalid - creates sparse array
              ],
              responses: {
                '200': { description: 'OK' },
              },
            },
          },
        },
      }

      const result = normalize(spec, {
        ...baseOptions,
        onValidateError: (message) => {
          validateErrors.push(message)
        },
        onUnifyError: (message) => {
          unifyErrors.push(message)
        },
      }) as any

      // Should not report errors for invalid items (they don't have name+in so can't be duplicates)
      expect(unifyErrors).toHaveLength(0)
      expect(validateErrors).toHaveLength(2)

      // After densification, parameters array should be dense (no holes)
      const params = result.paths?.['/test']?.get?.parameters
      expect(params).toBeDefined()
      expect(Array.isArray(params)).toBe(true)
      expect(params).toHaveLength(3)
      expect(params[0]).toMatchObject({ name: 'offset', in: 'query', schema: { type: 'integer' } })
      expect(params[1]).toMatchObject({ name: 'id', in: 'path', schema: { type: 'string' } })
      expect(params[2]).toMatchObject({ name: 'limit', in: 'query', schema: { type: 'integer' } })
    })
  })
})

