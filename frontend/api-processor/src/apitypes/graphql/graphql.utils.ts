import {
  GRAPH_API_KIND_TO_GRAPH_QL_TYPE,
  GraphApiOperation,
  isGraphApiListDefinition,
} from '@netcracker/qubership-apihub-graphapi'

/**
 * Extracts the base type name from a normalized GraphAPI typeDef.
 *
 * In the normalized spec:
 *  - Named types (objects, inputs, enums, custom scalars) have `typeDef.title` (e.g. "Pet")
 *  - Built-in scalars have `typeDef.type.kind` (e.g. "string" → "String", "boolean" → "Boolean")
 *  - List types have `typeDef.type.kind = "list"` with the element type in `type.items.typeDef`
 */
const extractTypeName = (typeDef: Record<string, unknown> | undefined): string | undefined => {
  if (!typeDef) return undefined

  // Named types carry a `title` field
  const { title } = typeDef
  if (typeof title === 'string') return title

  // List types: unwrap to get the element type name
  if (isGraphApiListDefinition(typeDef)) {
    return extractTypeName(typeDef.type.items?.typeDef as Record<string, unknown>)
  }

  // Built-in scalars: map `type.kind` to GraphQL type name via package constant
  const type = typeDef.type as Record<string, unknown> | undefined
  const kind = type?.kind
  if (typeof kind === 'string') {
    const mapped = GRAPH_API_KIND_TO_GRAPH_QL_TYPE[kind as keyof typeof GRAPH_API_KIND_TO_GRAPH_QL_TYPE]
    if (typeof mapped === 'string') return mapped
  }

  return undefined
}

/**
 * Builds a plain-text search string for a GraphQL operation.
 *
 * Searchable (included):
 *  - Operation name (the field name under Query/Mutation/Subscription)
 *  - Operation description
 *  - Argument names
 *  - Argument base type names (both named types and built-in scalars)
 *  - Return type name
 *
 * NOT searchable (excluded):
 *  - Operation type (query / mutation / subscription)
 *  - Nested field names of input/output types
 *  - Enum values
 */
export const buildGraphQLSearchText = (
  operation: GraphApiOperation | undefined,
  method: string,
): string => {
  // Always start with the operation name (e.g. "getPaymentMethodCore")
  const parts: string[] = [method]

  // Include the human-readable description when present
  if (operation?.description) {
    parts.push(operation.description)
  }

  // Include each argument name and its base type name.
  // Named types have `typeDef.title`, built-in scalars have `typeDef.type.kind`.
  if (operation?.args) {
    for (const [argName, arg] of Object.entries(operation.args)) {
      parts.push(argName)
      const typeName = extractTypeName(arg.typeDef as Record<string, unknown>)
      if (typeName) {
        parts.push(typeName)
      }
    }
  }

  // Include the return type name
  const outputTypeName = extractTypeName(operation?.output?.typeDef as Record<string, unknown>)
  if (outputTypeName) {
    parts.push(outputTypeName)
  }

  return parts.join(' ')
}
