import { GRAPH_API_NODE_KIND_SCALAR, GRAPH_API_NODE_KIND_UNION, GRAPH_API_VERSION } from "@netcracker/qubership-apihub-graphapi"
import { normalize } from "../../src"

describe('merge in graphapi', () => {
  it('merge no need in graphapi', () => {
    const graphApi = {
      graphapi: GRAPH_API_VERSION,
      components: {
        unions: {
          Simple: {
            title: "Simple",
            type: {
              kind: GRAPH_API_NODE_KIND_UNION,
              allOf: [
                {
                  oneOf: [
                    {
                      title: "Child",
                      type: {
                        kind: GRAPH_API_NODE_KIND_SCALAR,
                      },
                    }
                  ],
                }
              ],
            },
          },
        },
      },
    }
    const result = normalize(graphApi, { liftCombiners: true, mergeAllOf: true, validate: true })
    expect(result).toEqual({
      graphapi: GRAPH_API_VERSION,
      components: {
        unions: {
          Simple: {
            title: "Simple",
            type: {
              kind: GRAPH_API_NODE_KIND_UNION,
            },
          },
        },
      },
    })
  })
})
