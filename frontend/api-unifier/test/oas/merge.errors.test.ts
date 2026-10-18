import { JsonPath } from '@netcracker/qubership-apihub-json-crawl'
import { normalize, RefErrorType, RefErrorTypes } from '../../src'

describe("merge errors handling", function () {
  it('should trigger onRefResolveError when merging broken $ref', (done) => {

    const onRefResolveError = (message: string, path: JsonPath, ref: string, errorType: RefErrorType) => {

      expect(ref).toBe("#/foo")
      expect(errorType).toBe(RefErrorTypes.REF_NOT_FOUND)
      done()
    }

    const result = normalize({
      allOf: [
        {
          $ref: "#/foo",
        },
        {
          type: "object",
          properties: {
            name: {
              type: "string",
            },
          },
        },
      ],
    }, { onRefResolveError })

    expect(result).toEqual({
      allOf: [
        {
          $ref: "#/foo",
        },
        {
          type: "object",
          properties: {
            name: {
              type: "string",
            },
          },
        },
      ],
    })
  })
})
