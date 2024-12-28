import { JsonPath } from '@netcracker/qubership-apihub-json-crawl'
import { normalize } from '../../src'

describe("merge errors handling", function () {
  it('should trigger onRefResolveError when merging broken $ref', (done) => {

    const onRefResolveError = (message: string, path: JsonPath, ref: string) => {
      
      expect(ref).toBe ("#/foo")
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
