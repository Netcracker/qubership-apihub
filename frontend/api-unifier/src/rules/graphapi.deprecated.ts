import { Jso } from '../types'
import { getJsoProperty } from '../utils'
import { GRAPH_API_PROPERTY_DEPRECATED_DIRECTIVE } from './graphapi.const'
import { isGraphApiDirective } from '@netcracker/qubership-apihub-graphapi'

export const GRAPH_API_DEPRECATION_PREDICATE: (value: Jso<unknown>) => string | undefined = (value) => {
  const deprecatedDirectiveProperty = getJsoProperty(value, GRAPH_API_PROPERTY_DEPRECATED_DIRECTIVE)
  if (!deprecatedDirectiveProperty) {
    return undefined
  } else if (isGraphApiDirective(deprecatedDirectiveProperty)) {
    return deprecatedDirectiveProperty.meta?.reason
  }
}
