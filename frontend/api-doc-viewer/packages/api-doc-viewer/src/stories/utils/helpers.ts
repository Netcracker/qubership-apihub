import { buildFromSchema, GraphApiSchema } from "@netcracker/qubership-apihub-graphapi"
import { buildSchema } from "graphql"

export function buildGraphApi(graphql: string): GraphApiSchema {
  return buildFromSchema(
    buildSchema(graphql, { noLocation: true })
  )
}

export function graphapi(strings: TemplateStringsArray): GraphApiSchema {
  return buildGraphApi(strings[0])
}
