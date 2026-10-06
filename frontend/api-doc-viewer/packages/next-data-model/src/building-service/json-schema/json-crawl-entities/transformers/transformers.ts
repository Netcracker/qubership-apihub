import { transformExample } from "./transform-example"
import { transformJsonSchemaExtensions } from "./transform-extensions"

export const jsonSchemaTransformers = [
  transformExample,
  transformJsonSchemaExtensions,
]
