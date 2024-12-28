import { buildSchema, getIntrospectionQuery, graphqlSync } from "graphql"
import { GraphApiSchema } from "../../src/types"
import { buildFromIntrospection } from "../../src"
import { buildFromSchema } from "../../src/build-graph-api/of-schema"

export const GRAPH_API_BUILD_MODE_SCHEMA = 'schema'
export const GRAPH_API_BUILD_MODE_INTROSPECTION = 'introspection'
type GRAPH_API_BUILD_MODE =
  | typeof GRAPH_API_BUILD_MODE_SCHEMA
  | typeof GRAPH_API_BUILD_MODE_INTROSPECTION

export function buildGraphApi(
  graphql: string,
  mode: GRAPH_API_BUILD_MODE = GRAPH_API_BUILD_MODE_SCHEMA
): GraphApiSchema {
  const schema = buildSchema(graphql, { noLocation: true })
  if (mode === GRAPH_API_BUILD_MODE_INTROSPECTION) {
    const introspection: any = graphqlSync({
      schema,
      source: getIntrospectionQuery({
        inputValueDeprecation: true,
        schemaDescription: true,
        specifiedByUrl: true
      })
    }).data
    return buildFromIntrospection(introspection)
  }
  return buildFromSchema(schema)
}

export function graphapi(strings: TemplateStringsArray): GraphApiSchema {
  return buildGraphApi(strings[0])
}
