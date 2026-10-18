import { denormalize, normalize, NormalizeOptions } from '../../src'
import { graphapi, TEST_DEFAULTS_FLAG, TEST_INLINE_REFS_FLAG, TEST_ORIGINS_FLAG } from '../helpers'
import { GRAPH_API_NODE_KIND_ENUM, GRAPH_API_VERSION } from '@netcracker/qubership-apihub-graphapi'

describe('GraphAPI', () => {
  it('normilize-denormalize', () => {
    const graphApi = graphapi`
      type Query {
        rpc: Shared
      }
      enum Shared {
        V
      }  
    `
    const options = {
      inlineRefsFlag: TEST_INLINE_REFS_FLAG,
      originsFlag: TEST_ORIGINS_FLAG,
      defaultsFlag: TEST_DEFAULTS_FLAG,
      unify: true,
      validate: true
    } satisfies NormalizeOptions
    const result = denormalize(normalize(graphApi, options), options)
    const expected = {
      graphapi: GRAPH_API_VERSION,
      queries: {
        rpc: {
          output: {
            typeDef: null as any,
          },
        },
      },
      components: {
        enums: {
          Shared: {
            title: 'Shared',
            type: {
              kind: GRAPH_API_NODE_KIND_ENUM,
              values: {
                V: {},
              },
            },
          },
        },
      },
    }
    expected.queries.rpc.output.typeDef = expected.components.enums.Shared
    expect(result).toEqual(expected)
  })
})
