import {
  JsonSchemaTreeNodeValueAnyType,
  JsonSchemaTreeNodeStoredValue,
} from "@apihub/next-data-model/model/json-schema/types/node-value"
import { JsonSchemaNodeValueTypes } from "@apihub/next-data-model/model/json-schema/types/node-value-type"
import { JsonSchemaTreeNodeKind, JsonSchemaTreeNodeKinds } from "@apihub/next-data-model/model/json-schema/types/node-kind"
import { isJsonSchemaPrimitiveNodeValue } from "@apihub/next-data-model/shared/json-schema/guards/schema-value"

/** Node value for `additionalProperties: true` (OpenAPI/JSON Schema: any additional property allowed). */
export const JSON_SCHEMA_ADDITIONAL_PROPERTIES_TRUE_NODE_VALUE = {
  type: JsonSchemaNodeValueTypes.ANY,
} satisfies JsonSchemaTreeNodeValueAnyType

/**
 * Maps raw boolean crawl fragments to stored node values.
 * - `false` stays a primitive on the node.
 * - `true` on `additionalProperties` becomes `{ type: 'any' }`.
 */
export function resolveJsonSchemaPrimitiveCrawlNodeValue(
  kind: JsonSchemaTreeNodeKind | string,
  value: unknown,
): JsonSchemaTreeNodeStoredValue | undefined {
  if (!isJsonSchemaPrimitiveNodeValue(value)) {
    return undefined
  }

  if (value === false) {
    return false
  }

  if (value === true && kind === JsonSchemaTreeNodeKinds.ADDITIONAL_PROPERTIES) {
    return JSON_SCHEMA_ADDITIONAL_PROPERTIES_TRUE_NODE_VALUE
  }

  return undefined
}
