import { graphapi } from "./helpers/build-graphApi"

describe('Custom schema type', () => {
  const CUSTOM_QUERY_RESULT = {
    someField: {
      output: { typeDef: { type: { kind: 'string' } } },
    }
  }
  const CUSTOM_MUTATION_RESULT = {
    setSomeField: {
      args: { to: { typeDef: { type: { kind: 'string' } } } },
      output: { typeDef: { type: { kind: 'string' } } }
    }
  }

  it('should support custom schema name', () => {
    const graphApi = graphapi`
      schema {
        query: MyQueryRootType
        mutation: MyMutationRootType
      }
       
      type MyQueryRootType {
        someField: String
      }
       
      type MyMutationRootType {
        setSomeField(to: String): String
      }    
    `
    expect(graphApi.queries).toEqual(CUSTOM_QUERY_RESULT)
    expect(graphApi.mutations).toEqual(CUSTOM_MUTATION_RESULT)
  })

  it('adding not custom schema type does not override the result', () => {
    const graphApi = graphapi`
      schema {
        query: MyQueryRootType
        mutation: MyMutationRootType
      }
       
      type MyQueryRootType {
        someField: String
      }
      
      type Query {
        test: String
      } 
      
      type MyMutationRootType {
        setSomeField(to: String): String
      }    
    `
    expect(graphApi.queries).toEqual(CUSTOM_QUERY_RESULT)
    expect(graphApi.mutations).toEqual(CUSTOM_MUTATION_RESULT)
  })
})
