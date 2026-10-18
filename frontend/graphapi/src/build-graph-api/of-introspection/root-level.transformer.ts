import type { IntrospectionField } from "graphql";
import type { GraphApiOperation, GraphApiAnyUsage } from "../../types";
import { transformBaseType } from "./atomics.transformer";
import { transformArgs, transformType2Usage } from "./definition-parts.transformer";

export function transformOperations(
  fields: readonly IntrospectionField[]): Record<string, GraphApiOperation> {
  const operations: Record<string, GraphApiOperation> = {}
  for (const field of fields) {
    operations[field.name] = {
      ...transformBaseType(field),
      ...field.args.length ? { args: transformArgs(field.args) } : {},
      output: transformType2Usage(field.type) as GraphApiAnyUsage
    }
  }
  return operations
}
