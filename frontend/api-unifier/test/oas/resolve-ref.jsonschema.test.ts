import { normalize, RefErrorType, RefErrorTypes } from '../../src'
import jsonschemaExtraKeys from '../resources/jsonschema/resolve-ref.jsonschema.json'
import jsonschemaExtraKeys31 from '../resources/jsonschema/resolve-ref.jsonschema31.json'
import { JsonPath } from '@netcracker/qubership-apihub-json-crawl'

describe('Schema References', () => {
  describe('OAS 3.x.', () => {
    it('Other properties in a "$ref" object MUST be ignored', (done) => {
      const onRefResolveError = (message: string, path: JsonPath, ref: string, errorType: RefErrorType) => {

        expect(ref).toBe('#/components/schemas/User')
        expect(errorType).toBe(RefErrorTypes.RICH_REF_NOT_ALLOWED)
        done()
      }

      const expectedSchema = {
        'type': 'object',
        'properties': {
          'id': {
            'type': 'string',
          },
        },
      }

      const result = normalize(jsonschemaExtraKeys, { onRefResolveError }) as any
      expect(result).toHaveProperty(['paths', '/test', 'get', 'responses', '200', 'content', 'application/json', 'schema'], expectedSchema)
    })
  })

  describe('OAS 3.1.', () => {
    it('should support keywords alongside of "$ref" in the same schema object', () => {
      const expectedSchema = {
        'type': 'object',
        'properties': {
          'id': {
            'type': 'string',
          },
        },
        'description': 'extra description',
      }

      const result = normalize(jsonschemaExtraKeys31) as any
      expect(result).toHaveProperty(['paths', '/test', 'get', 'responses', '200', 'content', 'application/json', 'schema'], expectedSchema)
    })
  })
})