import { isArray } from '@netcracker/qubership-apihub-json-crawl'
import { AdapterContext } from '../types'
import { copyOrigins, GRAPH_API_PROPERTY_DIRECTIVES, GRAPH_API_PROPERTY_KIND, GRAPH_API_PROPERTY_ONE_OF, GRAPH_API_PROPERTY_TITLE, GRAPH_API_PROPERTY_TYPE, setOrigins } from '@netcracker/qubership-apihub-api-unifier'
import { RUNTIME_DIRECTIVE_LOCATIONS } from './graphapi.const'
import { GRAPH_API_NODE_KIND_UNION } from '@netcracker/qubership-apihub-graphapi'

export const wrapBySingletonUnion = (value: Record<PropertyKey, unknown>, ctx: AdapterContext<Record<PropertyKey, unknown>>): Record<PropertyKey, unknown> => {
  return ctx.transformer(value, GRAPH_API_PROPERTY_ONE_OF, value => {
    const combinerValues = [value]
    const wrap = {
      [GRAPH_API_PROPERTY_DIRECTIVES]: {},
      ...(value[GRAPH_API_PROPERTY_TITLE] ? { [GRAPH_API_PROPERTY_TITLE]: value[GRAPH_API_PROPERTY_TITLE] } : {}),
      [GRAPH_API_PROPERTY_TYPE]: {
        [GRAPH_API_PROPERTY_KIND]: GRAPH_API_NODE_KIND_UNION,
        [GRAPH_API_PROPERTY_ONE_OF]: combinerValues,
        [ctx.options.originsFlag]: {
          [GRAPH_API_PROPERTY_KIND]: ctx.valueOrigins,
          [GRAPH_API_PROPERTY_ONE_OF]: ctx.valueOrigins,
        }
      },
    }
    // setOrigins(valueCopy, GRAPH_API_PROPERTY_DIRECTIVES,  TODO this value should appear came from normalization like for any json schema )
    setOrigins(combinerValues, 0, ctx.options.originsFlag, ctx.valueOrigins)
    if (value[GRAPH_API_PROPERTY_TITLE])
      copyOrigins(value, wrap, GRAPH_API_PROPERTY_TITLE, GRAPH_API_PROPERTY_TITLE, ctx.options.originsFlag)
    copyOrigins(value, wrap, GRAPH_API_PROPERTY_TYPE, GRAPH_API_PROPERTY_TYPE, ctx.options.originsFlag)
    return wrap
  })
}

export const isRuntimeDirectiveLocations: (value: unknown | undefined) => boolean = (value) => {
  return isArray(value) && value.some(location => RUNTIME_DIRECTIVE_LOCATIONS.has(location))
}
