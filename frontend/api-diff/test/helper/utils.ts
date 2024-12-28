import { buildSchema } from "graphql"
import { buildFromSchema, GraphApiSchema } from '@netcracker/qubership-apihub-graphapi'

export function takeIf(value: object, condition: boolean): object {
  return {
    ...(condition ? value : {}),
  }
}

export function takeIfDefined(value: object): object {
  const [propertyValue] = Object.values(value)
  const valueIsNotDefined = !value ||
    propertyValue === undefined ||
    propertyValue === null ||
    propertyValue === ''

  return {
    ...takeIf(value, !valueIsNotDefined),
  }
}


export const graphapi = (strings: TemplateStringsArray): GraphApiSchema => {
  return buildGraphApi(strings[0])
}

export function buildGraphApi(graphql: string): GraphApiSchema {
  return buildFromSchema(
    buildSchema(graphql, { noLocation: true })
  )
}
