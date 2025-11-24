import { matchPaths, PREDICATE_UNCLOSED_END, grepValue } from '../path-matcher'
import {
  GRAPH_API_PROPERTY_COMPONENTS,
  GRAPH_API_PROPERTY_ENUMS,
  GRAPH_API_PROPERTY_VALUES,
  GRAPH_API_PROPERTY_OBJECTS,
  GRAPH_API_PROPERTY_INTERFACES,
  GRAPH_API_PROPERTY_METHODS,
  GRAPH_API_PROPERTY_TYPE,
} from './graphapi.const'
import { DescriptionContext } from '../types'

const GRAPH_API_COMPONENTS_ENUMS_PREDICATE = [
  GRAPH_API_PROPERTY_COMPONENTS,
  GRAPH_API_PROPERTY_ENUMS,
  grepValue('enumName'),
  GRAPH_API_PROPERTY_TYPE,
  GRAPH_API_PROPERTY_VALUES,
  grepValue('valueName'),
  PREDICATE_UNCLOSED_END
]

const GRAPH_API_COMPONENTS_OBJECTS_PREDICATE = [
  GRAPH_API_PROPERTY_COMPONENTS,
  GRAPH_API_PROPERTY_OBJECTS,
  grepValue('objectName'),
  GRAPH_API_PROPERTY_TYPE,
  GRAPH_API_PROPERTY_METHODS,
  grepValue('fieldName'),
  PREDICATE_UNCLOSED_END
]

const GRAPH_API_COMPONENTS_INTERFACES_PREDICATE = [
  GRAPH_API_PROPERTY_COMPONENTS,
  GRAPH_API_PROPERTY_INTERFACES,
  grepValue('interfaceName'),
  GRAPH_API_PROPERTY_TYPE,
  GRAPH_API_PROPERTY_METHODS,
  grepValue('fieldName'),
  PREDICATE_UNCLOSED_END
]

const GRAPH_API_DEPRECATED_ITEM_DESCRIPTION_PREDICATES = [
  GRAPH_API_COMPONENTS_ENUMS_PREDICATE,
  GRAPH_API_COMPONENTS_OBJECTS_PREDICATE,
  GRAPH_API_COMPONENTS_INTERFACES_PREDICATE
]


export const calculateGraphApiDeprecatedDescription = (ctx: DescriptionContext): string => {
  // Check for enum value deprecation
  const matchResult = matchPaths(ctx.paths, GRAPH_API_DEPRECATED_ITEM_DESCRIPTION_PREDICATES)
  if (matchResult?.predicate === GRAPH_API_COMPONENTS_ENUMS_PREDICATE) {
    const valueName = String(matchResult.grepValues['valueName'])
    const enumName = String(matchResult.grepValues['enumName'])
    return `[Deprecated] value '${valueName}' of enum '${enumName}'`
  }
  if (matchResult?.predicate === GRAPH_API_COMPONENTS_OBJECTS_PREDICATE) {
    const fieldName = String(matchResult.grepValues['fieldName'])
    const objectName = String(matchResult.grepValues['objectName'])
    return `[Deprecated] field '${fieldName}' of object '${objectName}'`
  }
  if (matchResult?.predicate === GRAPH_API_COMPONENTS_INTERFACES_PREDICATE) {
    const fieldName = String(matchResult.grepValues['fieldName'])
    const interfaceName = String(matchResult.grepValues['interfaceName'])
    return `[Deprecated] field '${fieldName}' of interface '${interfaceName}'`
  }

  // Fallback for other cases
  return '[Deprecated]'
}
