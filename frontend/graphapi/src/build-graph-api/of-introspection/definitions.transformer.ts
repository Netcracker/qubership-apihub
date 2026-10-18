import type { IntrospectionDirective, IntrospectionEnumType, IntrospectionInputObjectType, IntrospectionInterfaceType, IntrospectionObjectType, IntrospectionScalarType, IntrospectionUnionType } from "graphql";
import { getScalarType } from "../utils";
import type { GraphApiAnyDefinition, GraphApiAnyUsage, GraphApiArgument, GraphApiDirectiveDefinition, GraphApiEnumDefinition, GraphApiInputObjectDefinition, GraphApiInputUsage, GraphApiObjectDefinition, GraphApiObjectKind, GraphApiOperation, GraphApiScalarDefinition, GraphApiUnionDefinition, GraphEnumValue } from "../../types";
import { transformBaseType, transformNamedType } from "./atomics.transformer";
import {  USED_BUILT_IN_DIRECTIVES } from "./declarations";
import { transformArgs, transformType2Definition, transformType2Usage } from "./definition-parts.transformer";
import { createRef, getDefaultValue, isIntrospectionInterfaceType } from "./utils";
import { BUILT_IN_DIRECTIVES_SET } from "../../constants";

// FIXME 13.11.24 // Directives?
export function transformScalarType2Definition(
  scalarType: IntrospectionScalarType
): GraphApiScalarDefinition {
  return {
    ...transformNamedType(scalarType),
    type: getScalarType(scalarType),
    ...scalarType.specifiedByURL ? { specifiedByURL: scalarType.specifiedByURL } : {}
  }
}

export function transformObjectType2Definition(
  objectType: IntrospectionObjectType | IntrospectionInterfaceType
): GraphApiObjectDefinition<GraphApiObjectKind> {
  const methods: Record<string, GraphApiOperation> = {}
  const interfaces = objectType
    .interfaces
    .map(({ kind, name }) => ({ $ref: createRef(kind, name) }))

  for (const field of objectType.fields) {
    methods[field.name] = {
      ...transformBaseType(field),
      ...field.args.length ? { args: transformArgs(field.args) } : {},
      output: transformType2Usage(field.type) as GraphApiAnyUsage
    }
  }

  return {
    ...transformNamedType(objectType),
    type: {
      kind: isIntrospectionInterfaceType(objectType) ? 'interface' : 'object',
      ...Object.keys(methods).length ? { methods: methods } : {},
      ...interfaces.length ? { interfaces } : {},
    },
  }
}

export function transformUnionType2Definition(
  unionType: IntrospectionUnionType
): GraphApiUnionDefinition {
  return {
    ...transformNamedType(unionType),
    type: {
      kind: 'union',
      oneOf: unionType
        .possibleTypes
        .map((item) => transformType2Definition(item) as GraphApiAnyDefinition)
    }
  }
}

// FIXME 13.11.24 // Directives?
export function transformEnumType2Definition(
  enumType: IntrospectionEnumType
): GraphApiEnumDefinition {
  const enumValues = enumType.enumValues.reduce((res, { deprecationReason, description, name }) => {
    res[name] = {
      ...deprecationReason ? { deprecationReason } : {},
      ...description ? { description } : {},
    }
    return res
  }, {} as Record<string, GraphEnumValue>)

  return {
    ...transformNamedType(enumType),
    type: {
      kind: "enum",
      ...Object.keys(enumValues).length ? { values: enumValues } : {}
    },
  }
}

export function transformInputObjectTypeType2Definition(
  inputObjectType: IntrospectionInputObjectType
): GraphApiInputObjectDefinition {
  const properties: Record<string, GraphApiArgument> = {}
  const fields = inputObjectType.inputFields

  for (const field of fields) {
    properties[field.name] = {
      ...transformBaseType(field),
      ...transformType2Usage(field.type, getDefaultValue(field)),
    } as GraphApiInputUsage
  }

  return {
    ...transformNamedType(inputObjectType),
    title: inputObjectType.name,
    type: {
      kind: 'input',
      ...Object.keys(properties).length ? { properties } : {}
    },
  }
}

export function directiveType2DefinitionReducer(
  result: Record<string, GraphApiDirectiveDefinition>,
  directive: IntrospectionDirective
) {
  if (!BUILT_IN_DIRECTIVES_SET.has(directive.name) || USED_BUILT_IN_DIRECTIVES.has(directive.name)) {
    result[directive.name] = transformDirectiveType2Definition(directive)
  }
  return result
}

function transformDirectiveType2Definition(
  directive: IntrospectionDirective
): GraphApiDirectiveDefinition {
  return {
    title: directive.name,
    ...directive.description ? { description: directive.description } : {},
    locations: [...directive.locations],
    ...directive.args.length ? { args: transformArgs(directive.args) } : {},
    ...directive.isRepeatable ? { repeatable: true } : {},
  }
}
