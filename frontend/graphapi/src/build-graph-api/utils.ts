import { IntrospectionScalarType, GraphQLScalarType } from "graphql";
import { GRAPH_API_NODE_KIND_ID, GRAPH_API_NODE_KIND_INTEGER, GRAPH_API_NODE_KIND_FLOAT, GRAPH_API_NODE_KIND_STRING, GRAPH_API_NODE_KIND_BOOLEAN, GRAPH_API_NODE_KIND_SCALAR } from "../constants";
import { GraphApiScalarType, GraphApiNodeType } from "../types";

const SCALAR_MAP: Record<string, GraphApiScalarType> = {
  ID: GRAPH_API_NODE_KIND_ID,
  Int: GRAPH_API_NODE_KIND_INTEGER,
  Float: GRAPH_API_NODE_KIND_FLOAT,
  String: GRAPH_API_NODE_KIND_STRING,
  Boolean: GRAPH_API_NODE_KIND_BOOLEAN,
} as const;

export function getScalarType(
  gqlType: IntrospectionScalarType | GraphQLScalarType
): GraphApiNodeType<GraphApiScalarType> {
  return {
    kind: SCALAR_MAP[gqlType.name] ?? GRAPH_API_NODE_KIND_SCALAR
  };
}
