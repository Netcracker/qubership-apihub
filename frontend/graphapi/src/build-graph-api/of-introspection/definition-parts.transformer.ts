import type { IntrospectionInputValue, IntrospectionScalarType, IntrospectionTypeRef } from "graphql";
import { getScalarType } from "../utils";
import type { GraphApiAnyUsage, GraphApiArgs, GraphApiArgument, GraphApiInputUsage, GraphApiListDefinition, GraphApiRef, GraphApiScalarDefinition, GraphApiUsage } from "../../types";
import { transformBaseType } from "./atomics.transformer";
import { createRef, getDefaultValue } from "./utils";

export function transformType2Definition(
  gqlType: IntrospectionTypeRef
): GraphApiRef | GraphApiScalarDefinition | GraphApiListDefinition {
  if (gqlType.kind === 'NON_NULL') {
    return transformType2Definition(gqlType.ofType)
  }
  if (gqlType.kind === 'LIST') {
    return {
      type: {
        kind: 'list',
        items: transformType2Usage(gqlType.ofType) as GraphApiAnyUsage,
      }
    }
  }
  if (gqlType.kind === 'SCALAR') {
    const scalarType = getScalarType(gqlType as IntrospectionScalarType)
    if (scalarType.kind !== 'scalar') {
      return { type: scalarType }
    }
  }
  return {
    $ref: createRef(gqlType.kind, gqlType.name)
  }
}

export function transformType2Usage(
  gqlType: IntrospectionTypeRef,
  defaultValue?: unknown
): GraphApiUsage {
  const notNullable = gqlType.kind === 'NON_NULL'
  const hasDefaultValue = defaultValue !== undefined
  return {
    typeDef: transformType2Definition(gqlType),
    ...notNullable ? { nullable: false } : {},
    ...hasDefaultValue ? { default: defaultValue } : {},
  } as GraphApiAnyUsage
}

export function transformArgs(
  args: ReadonlyArray<IntrospectionInputValue>
): GraphApiArgs {
  const transformedArgs: Record<string, GraphApiArgument> = {}

  for (const arg of args) {
    transformedArgs[arg.name] = {
      ...transformBaseType(arg),
      ...transformType2Usage(arg.type, getDefaultValue(arg)),
    } as GraphApiInputUsage
  }

  return { ...transformedArgs }
}
