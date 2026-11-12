import { buildFromSchema, GraphApiSchema } from '@netcracker/qubership-apihub-graphapi'
import { buildSchema } from 'graphql/utilities'

export function buildGraphApiSchema(graphQl: string): GraphApiSchema {
  return buildFromSchema(
    buildSchema(graphQl, { noLocation: true })
  )
}
