import { matchPaths, PREDICATE_UNCLOSED_END, grepValue } from '../path-matcher'
import {
  GRAPH_API_PROPERTY_COMPONENTS,
  GRAPH_API_PROPERTY_ENUMS,
  GRAPH_API_PROPERTY_VALUES,
  GRAPH_API_PROPERTY_OBJECTS,
  GRAPH_API_PROPERTY_INTERFACES,
  GRAPH_API_PROPERTY_METHODS,
  GRAPH_API_PROPERTY_TYPE,
  GRAPH_API_PROPERTY_MUTATIONS,
  GRAPH_API_PROPERTY_DIRECTIVES,
  GRAPH_API_PROPERTY_DEPRECATED_DIRECTIVE,
  GRAPH_API_PROPERTY_QUERIES,
  GRAPH_API_PROPERTY_SUBSCRIPTIONS,
} from './graphapi.const'
import { DescriptionContext } from '../types'

const GRAPH_API_DEPRECATED_ENUM_VALUE_PREDICATE = [
  GRAPH_API_PROPERTY_COMPONENTS,
  GRAPH_API_PROPERTY_ENUMS,
  grepValue('enumName'),
  GRAPH_API_PROPERTY_TYPE,
  GRAPH_API_PROPERTY_VALUES,
  grepValue('valueName'),
  GRAPH_API_PROPERTY_DIRECTIVES,
  GRAPH_API_PROPERTY_DEPRECATED_DIRECTIVE
]

const GRAPH_API_DEPRECATED_OBJECT_FIELD_PREDICATE = [
  GRAPH_API_PROPERTY_COMPONENTS,
  GRAPH_API_PROPERTY_OBJECTS,
  grepValue('objectName'),
  GRAPH_API_PROPERTY_TYPE,
  GRAPH_API_PROPERTY_METHODS,
  grepValue('fieldName'),
  GRAPH_API_PROPERTY_DIRECTIVES,
  GRAPH_API_PROPERTY_DEPRECATED_DIRECTIVE
]

const GRAPH_API_DEPRECATED_INTERFACE_FIELD_PREDICATE = [
  GRAPH_API_PROPERTY_COMPONENTS,
  GRAPH_API_PROPERTY_INTERFACES,
  grepValue('interfaceName'),
  GRAPH_API_PROPERTY_TYPE,
  GRAPH_API_PROPERTY_METHODS,
  grepValue('fieldName'),
  GRAPH_API_PROPERTY_DIRECTIVES,
  GRAPH_API_PROPERTY_DEPRECATED_DIRECTIVE
]

const GRAPH_API_DEPRECATED_MUTATION_PREDICATE = [
 GRAPH_API_PROPERTY_MUTATIONS,
 grepValue('mutationName'),
 GRAPH_API_PROPERTY_DIRECTIVES,
 GRAPH_API_PROPERTY_DEPRECATED_DIRECTIVE
]

const GRAPH_API_DEPRECATED_QUERY_PREDICATE = [
  GRAPH_API_PROPERTY_QUERIES,
  grepValue('queryName'),
  GRAPH_API_PROPERTY_DIRECTIVES,
  GRAPH_API_PROPERTY_DEPRECATED_DIRECTIVE
]

const GRAPH_API_DEPRECATED_SUBSCRIPTION_PREDICATE = [
  GRAPH_API_PROPERTY_SUBSCRIPTIONS,
  grepValue('subscriptionName'),
  GRAPH_API_PROPERTY_DIRECTIVES,
  GRAPH_API_PROPERTY_DEPRECATED_DIRECTIVE
]

const GRAPH_API_DEPRECATED_ITEM_DESCRIPTION_PREDICATES = [
  GRAPH_API_DEPRECATED_ENUM_VALUE_PREDICATE,
  GRAPH_API_DEPRECATED_OBJECT_FIELD_PREDICATE,
  GRAPH_API_DEPRECATED_INTERFACE_FIELD_PREDICATE,
  GRAPH_API_DEPRECATED_MUTATION_PREDICATE,
  GRAPH_API_DEPRECATED_QUERY_PREDICATE,
  GRAPH_API_DEPRECATED_SUBSCRIPTION_PREDICATE
]

export const calculateGraphApiDeprecatedDescription = (ctx: DescriptionContext): string => {
  // Check for enum value deprecation
  const matchResult = matchPaths(ctx.paths, GRAPH_API_DEPRECATED_ITEM_DESCRIPTION_PREDICATES)
  if (matchResult?.predicate === GRAPH_API_DEPRECATED_ENUM_VALUE_PREDICATE) {
    const valueName = String(matchResult.grepValues['valueName'])
    const enumName = String(matchResult.grepValues['enumName'])
    return `[Deprecated] value '${valueName}' of enum '${enumName}'`
  }
  if (matchResult?.predicate === GRAPH_API_DEPRECATED_OBJECT_FIELD_PREDICATE) {
    const fieldName = String(matchResult.grepValues['fieldName'])
    const objectName = String(matchResult.grepValues['objectName'])
    return `[Deprecated] field '${fieldName}' of object '${objectName}'`
  }
  if (matchResult?.predicate === GRAPH_API_DEPRECATED_INTERFACE_FIELD_PREDICATE) {
    const fieldName = String(matchResult.grepValues['fieldName'])
    const interfaceName = String(matchResult.grepValues['interfaceName'])
    return `[Deprecated] field '${fieldName}' of interface '${interfaceName}'`
  }
  if (matchResult?.predicate === GRAPH_API_DEPRECATED_MUTATION_PREDICATE) {
    const mutationName = String(matchResult.grepValues['mutationName'])
    return `[Deprecated] mutation '${mutationName}'`
  }
  if (matchResult?.predicate === GRAPH_API_DEPRECATED_QUERY_PREDICATE) {
    const queryName = String(matchResult.grepValues['queryName'])
    return `[Deprecated] query '${queryName}'`
  }
  if (matchResult?.predicate === GRAPH_API_DEPRECATED_SUBSCRIPTION_PREDICATE) {
    const subscriptionName = String(matchResult.grepValues['subscriptionName'])
    return `[Deprecated] subscription '${subscriptionName}'`
  }

  // Fallback for other cases
  return '[Deprecated]'
}
