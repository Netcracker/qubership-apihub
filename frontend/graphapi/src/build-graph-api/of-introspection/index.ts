import type { IntrospectionQuery, IntrospectionType, IntrospectionObjectType } from "graphql";
import { GRAPH_API_NODE_KIND_OBJECT, GRAPH_API_NODE_KIND_INTERFACE } from "../../constants";
import type { GraphApiSchema, GraphApiObjectDefinition } from "../../types";
import { USED_BUILT_IN_DIRECTIVES } from "./declarations";
import { transformScalarType2Definition, transformObjectType2Definition, transformInputObjectTypeType2Definition, transformUnionType2Definition, transformEnumType2Definition, directiveType2DefinitionReducer } from "./definitions.transformer";
import { transformOperations } from "./root-level.transformer";

export function buildFromIntrospection({ __schema }: IntrospectionQuery): GraphApiSchema {
  USED_BUILT_IN_DIRECTIVES.clear()

  const { queryType, mutationType, subscriptionType, description, types = [], directives = [] } = __schema

  const getOperationType = (gqlType: IntrospectionType) => {
    switch (gqlType.name) {
      case queryType.name:
        return "queries"
      case mutationType?.name:
        return "mutations"
      case subscriptionType?.name:
        return "subscriptions"
    }
  }

  const typeReducer = (result: GraphApiSchema, current: IntrospectionType) => {
    switch (current.name) {
      case queryType.name:
      case mutationType?.name:
      case subscriptionType?.name: {
        const obj = current as IntrospectionObjectType
        const prop = getOperationType(current)!
        result[prop] = transformOperations(obj.fields)
        break
      }
      default:
        if (current.name.startsWith("__")) { return result} 

        switch (current.kind) {
          case "SCALAR":
            if (!['String', 'Int', 'Float', 'Boolean', 'ID'].includes(current.name)) {
              result.components!.scalars = {
                ...result.components!.scalars,
                [current.name]: transformScalarType2Definition(current)
              }
            }
            break
          case "OBJECT":
            result.components!.objects = {
              ...result.components!.objects,
              [current.name]: transformObjectType2Definition(current) as GraphApiObjectDefinition<typeof GRAPH_API_NODE_KIND_OBJECT>
            }
            break
          case "INTERFACE":
            result.components!.interfaces = {
              ...result.components!.interfaces,
              [current.name]: transformObjectType2Definition(current) as GraphApiObjectDefinition<typeof GRAPH_API_NODE_KIND_INTERFACE>
            }
            break
          case "INPUT_OBJECT":
            result.components!.inputObjects = {
              ...result.components!.inputObjects,
              [current.name]: transformInputObjectTypeType2Definition(current)
            }
            break
          case "UNION":
            result.components!.unions! = {
              ...result.components!.unions,
              [current.name]: transformUnionType2Definition(current)
            }
            break
          case "ENUM":
            result.components!.enums = {
              ...result.components!.enums,
              [current.name]: transformEnumType2Definition(current)
            }
            break
        }
        break
    }
    return result
  }

  const filteredDirectives = directives.reduce(directiveType2DefinitionReducer, {})

  const graphApi = types.reduce(typeReducer, {
    graphapi: "1.0.0",
    ...description ? { description } : {},
    components: {
      ...filteredDirectives.length ? { directives: filteredDirectives } : {}
    }
  })

  const hasComponents = Object.keys(graphApi.components ?? {}).length > 0
  if (!hasComponents) {
    delete graphApi.components 
  }

  return graphApi
}
