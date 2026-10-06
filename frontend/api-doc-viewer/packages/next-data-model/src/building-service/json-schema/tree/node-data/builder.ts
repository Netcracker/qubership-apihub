import {
  ASYNCAPI_PROPERTY_EXTERNAL_DOCS,
  JSON_SCHEMA_PROPERTY_DEFAULT,
  JSON_SCHEMA_PROPERTY_DEPRECATED,
  JSON_SCHEMA_PROPERTY_DESCRIPTION,
  JSON_SCHEMA_PROPERTY_ENUM,
  JSON_SCHEMA_PROPERTY_EXAMPLES,
  JSON_SCHEMA_PROPERTY_EXCLUSIVE_MAXIMUM,
  JSON_SCHEMA_PROPERTY_EXCLUSIVE_MINIMUM,
  JSON_SCHEMA_PROPERTY_FORMAT,
  JSON_SCHEMA_PROPERTY_MAXIMUM,
  JSON_SCHEMA_PROPERTY_MAX_ITEMS,
  JSON_SCHEMA_PROPERTY_MAX_LENGTH,
  JSON_SCHEMA_PROPERTY_MAX_PROPERTIES,
  JSON_SCHEMA_PROPERTY_MINIMUM,
  JSON_SCHEMA_PROPERTY_MIN_ITEMS,
  JSON_SCHEMA_PROPERTY_MIN_LENGTH,
  JSON_SCHEMA_PROPERTY_MIN_PROPERTIES,
  JSON_SCHEMA_PROPERTY_MULTIPLE_OF,
  JSON_SCHEMA_PROPERTY_NULLABLE,
  JSON_SCHEMA_PROPERTY_PATTERN,
  JSON_SCHEMA_PROPERTY_PROPERTIES,
  JSON_SCHEMA_PROPERTY_PROPERTY_NAMES,
  JSON_SCHEMA_PROPERTY_READ_ONLY,
  JSON_SCHEMA_PROPERTY_REQUIRED,
  JSON_SCHEMA_PROPERTY_TITLE,
  JSON_SCHEMA_PROPERTY_TYPE,
  JSON_SCHEMA_PROPERTY_UNIQUE_ITEMS,
  JSON_SCHEMA_PROPERTY_WRITE_ONLY,
} from "@netcracker/qubership-apihub-api-unifier"
import {
  JsonSchemaTreeNodeValueBase,
  JsonSchemaTreeNodeValueTypeArray,
  JsonSchemaTreeNodeValueTypeNumber,
  JsonSchemaTreeNodeValueTypeObject,
  JsonSchemaTreeNodeValueTypeString,
  JsonSchemaTreeNodeValue,
  JsonSchemaTreeNodeStoredValue,
} from "@apihub/next-data-model/model/json-schema/types/node-value"
import { JsonSchemaNodeValueType, JsonSchemaNodeValueTypes } from "@apihub/next-data-model/model/json-schema/types/node-value-type"
import { JsonSchemaTreeNodeKind } from "@apihub/next-data-model/model/json-schema/types/node-kind"
import {
  JsonSchemaNodeMetaProps,
  JsonSchemaTreeNodeMeta,
} from "@apihub/next-data-model/model/json-schema/types/node-meta"
import {
  isBrokenRef,
  isJsonSchemaComplexValue,
  isJsonSchemaNodeType,
  isJsonSchemaPrimitiveNodeValue,
} from "@apihub/next-data-model/shared/json-schema/guards/schema-value"
import { resolveJsonSchemaPrimitiveCrawlNodeValue } from "@apihub/next-data-model/shared/json-schema/additional-properties-node-value"
import { isRequiredJsonSchemaProperty } from "@apihub/next-data-model/shared/json-schema/guards/tree-node"
import {
  JSON_SCHEMA_NODE_VALUE_PROPERTY_CUSTOM_ANNOTATIONS,
  JSON_SCHEMA_NODE_VALUE_PROPERTY_EXTENSIONS,
} from "@apihub/next-data-model/shared/json-schema/types/node-value-property-key"
import { ITreeNode } from "@apihub/next-data-model/model/abstract/tree/tree-node.interface"
import { isObject } from "@apihub/next-data-model/utilities"
import { AbstractNodeDataBuilder, NodeDataPickFunction } from "../../../abstract/tree/node-data/builder"
import { NodeKey } from "../../../../utility-types"

type AnyJsonSchemaNodeValueKey =
  | keyof JsonSchemaTreeNodeValue<typeof JsonSchemaNodeValueTypes.ANY>
  | keyof JsonSchemaTreeNodeValue<typeof JsonSchemaNodeValueTypes.NOTHING>
  | keyof JsonSchemaTreeNodeValue<typeof JsonSchemaNodeValueTypes.NULL>
  | keyof JsonSchemaTreeNodeValue<typeof JsonSchemaNodeValueTypes.BOOLEAN>
  | keyof JsonSchemaTreeNodeValue<typeof JsonSchemaNodeValueTypes.STRING>
  | keyof JsonSchemaTreeNodeValue<typeof JsonSchemaNodeValueTypes.NUMBER>
  | keyof JsonSchemaTreeNodeValue<typeof JsonSchemaNodeValueTypes.INTEGER>
  | keyof JsonSchemaTreeNodeValue<typeof JsonSchemaNodeValueTypes.OBJECT>
  | keyof JsonSchemaTreeNodeValue<typeof JsonSchemaNodeValueTypes.ARRAY>

type JsonSchemaCommonNodeValue =
  | JsonSchemaTreeNodeValue<typeof JsonSchemaNodeValueTypes.ANY>
  | JsonSchemaTreeNodeValue<typeof JsonSchemaNodeValueTypes.NOTHING>
  | JsonSchemaTreeNodeValue<typeof JsonSchemaNodeValueTypes.NULL>
  | JsonSchemaTreeNodeValue<typeof JsonSchemaNodeValueTypes.BOOLEAN>
  | JsonSchemaTreeNodeValue<typeof JsonSchemaNodeValueTypes.UNKNOWN>

export class JsonSchemaNodeDataBuilder extends AbstractNodeDataBuilder<
  JsonSchemaTreeNodeStoredValue | null,
  JsonSchemaTreeNodeMeta
> {
  public static readonly JSON_SCHEMA_TREE_NODE_META_PROPS = [
    JSON_SCHEMA_PROPERTY_DEPRECATED,
    JSON_SCHEMA_PROPERTY_READ_ONLY,
    JSON_SCHEMA_PROPERTY_WRITE_ONLY,
    ASYNCAPI_PROPERTY_EXTERNAL_DOCS,
  ] satisfies (keyof JsonSchemaNodeMetaProps)[]

  private static readonly JSON_SCHEMA_TREE_NODE_VALUE_COMMON_PROPS = [
    JSON_SCHEMA_PROPERTY_TYPE,
    JSON_SCHEMA_PROPERTY_DESCRIPTION,
    JSON_SCHEMA_PROPERTY_TITLE,
    JSON_SCHEMA_PROPERTY_ENUM,
    JSON_SCHEMA_PROPERTY_DEFAULT,
    JSON_SCHEMA_PROPERTY_EXAMPLES,
    JSON_SCHEMA_PROPERTY_NULLABLE,
    JSON_SCHEMA_NODE_VALUE_PROPERTY_EXTENSIONS,
    JSON_SCHEMA_NODE_VALUE_PROPERTY_CUSTOM_ANNOTATIONS,
  ] satisfies (keyof JsonSchemaTreeNodeValueBase)[]

  public static getJsonSchemaTreeNodeValueProps(
    type:
      | typeof JsonSchemaNodeValueTypes.UNKNOWN
      | typeof JsonSchemaNodeValueTypes.ANY
      | typeof JsonSchemaNodeValueTypes.NOTHING
      | typeof JsonSchemaNodeValueTypes.NULL
      | typeof JsonSchemaNodeValueTypes.BOOLEAN,
  ): (keyof JsonSchemaCommonNodeValue)[]
  public static getJsonSchemaTreeNodeValueProps(
    type: typeof JsonSchemaNodeValueTypes.STRING,
  ): (keyof JsonSchemaTreeNodeValueTypeString)[]
  public static getJsonSchemaTreeNodeValueProps(
    type: typeof JsonSchemaNodeValueTypes.NUMBER | typeof JsonSchemaNodeValueTypes.INTEGER,
  ): (keyof JsonSchemaTreeNodeValueTypeNumber)[]
  public static getJsonSchemaTreeNodeValueProps(
    type: typeof JsonSchemaNodeValueTypes.OBJECT,
  ): (keyof JsonSchemaTreeNodeValueTypeObject)[]
  public static getJsonSchemaTreeNodeValueProps(
    type: typeof JsonSchemaNodeValueTypes.ARRAY,
  ): (keyof JsonSchemaTreeNodeValueTypeArray)[]
  public static getJsonSchemaTreeNodeValueProps(type: JsonSchemaNodeValueType): AnyJsonSchemaNodeValueKey[] {
    switch (type) {
      case JsonSchemaNodeValueTypes.UNKNOWN:
      case JsonSchemaNodeValueTypes.ANY:
      case JsonSchemaNodeValueTypes.NOTHING:
      case JsonSchemaNodeValueTypes.NULL:
      case JsonSchemaNodeValueTypes.BOOLEAN:
        return JsonSchemaNodeDataBuilder.JSON_SCHEMA_TREE_NODE_VALUE_COMMON_PROPS satisfies (keyof JsonSchemaCommonNodeValue)[]
      case JsonSchemaNodeValueTypes.STRING:
        return [
          ...JsonSchemaNodeDataBuilder.JSON_SCHEMA_TREE_NODE_VALUE_COMMON_PROPS,
          JSON_SCHEMA_PROPERTY_FORMAT,
          JSON_SCHEMA_PROPERTY_MIN_LENGTH,
          JSON_SCHEMA_PROPERTY_MAX_LENGTH,
          JSON_SCHEMA_PROPERTY_PATTERN,
        ] satisfies (keyof JsonSchemaTreeNodeValueTypeString)[]
      case JsonSchemaNodeValueTypes.NUMBER:
      case JsonSchemaNodeValueTypes.INTEGER:
        return [
          ...JsonSchemaNodeDataBuilder.JSON_SCHEMA_TREE_NODE_VALUE_COMMON_PROPS,
          JSON_SCHEMA_PROPERTY_FORMAT,
          JSON_SCHEMA_PROPERTY_MULTIPLE_OF,
          JSON_SCHEMA_PROPERTY_MINIMUM,
          JSON_SCHEMA_PROPERTY_EXCLUSIVE_MINIMUM,
          JSON_SCHEMA_PROPERTY_MAXIMUM,
          JSON_SCHEMA_PROPERTY_EXCLUSIVE_MAXIMUM,
        ] satisfies (keyof JsonSchemaTreeNodeValueTypeNumber)[]
      case JsonSchemaNodeValueTypes.OBJECT:
        return [
          ...JsonSchemaNodeDataBuilder.JSON_SCHEMA_TREE_NODE_VALUE_COMMON_PROPS,
          JSON_SCHEMA_PROPERTY_REQUIRED,
          JSON_SCHEMA_PROPERTY_MIN_PROPERTIES,
          JSON_SCHEMA_PROPERTY_MAX_PROPERTIES,
          JSON_SCHEMA_PROPERTY_PROPERTY_NAMES,
        ] satisfies (keyof JsonSchemaTreeNodeValueTypeObject)[]
      case JsonSchemaNodeValueTypes.ARRAY:
        return [
          ...JsonSchemaNodeDataBuilder.JSON_SCHEMA_TREE_NODE_VALUE_COMMON_PROPS,
          JSON_SCHEMA_PROPERTY_MIN_ITEMS,
          JSON_SCHEMA_PROPERTY_MAX_ITEMS,
          JSON_SCHEMA_PROPERTY_UNIQUE_ITEMS,
        ] satisfies (keyof JsonSchemaTreeNodeValueTypeArray)[]
      default:
        return []
    }
  }

  public constructor(private readonly pick: NodeDataPickFunction) {
    super()
  }

  public override createNodeMeta(value: unknown): JsonSchemaTreeNodeMeta {
    return this.buildNodeMeta(value, "", null, false)
  }

  public buildNodeMeta(
    value: unknown,
    key: NodeKey = "",
    parent: ITreeNode<JsonSchemaTreeNodeStoredValue | null, JsonSchemaTreeNodeKind, JsonSchemaTreeNodeMeta> | null = null,
    isCycle = false,
  ): JsonSchemaTreeNodeMeta {
    const required = isRequiredJsonSchemaProperty(key, parent)
    const brokenRefMeta = isBrokenRef(value) ? { brokenRef: String(value.$ref) } : {}
    const isComplex = isJsonSchemaComplexValue(value)

    if (!isComplex && isObject(value)) {
      const metaFromValue = this.pick<JsonSchemaNodeMetaProps>(
        value,
        JsonSchemaNodeDataBuilder.JSON_SCHEMA_TREE_NODE_META_PROPS,
      )

      return {
        ...(metaFromValue ?? {}),
        required,
        ...brokenRefMeta,
        _fragment: value,
        isCycle,
      }
    }

    return {
      required,
      ...brokenRefMeta,
      _fragment: value,
      isCycle,
    }
  }

  public override createNodeValue(
    kind: JsonSchemaTreeNodeKind | string,
    key: PropertyKey,
    value: unknown,
    pick: NodeDataPickFunction,
  ): JsonSchemaTreeNodeStoredValue | null {
    void key

    if (value === undefined || value === null) {
      return null
    }

    const primitiveNodeValue = resolveJsonSchemaPrimitiveCrawlNodeValue(kind, value)
    if (primitiveNodeValue !== undefined) {
      return primitiveNodeValue
    }

    if (isJsonSchemaPrimitiveNodeValue(value)) {
      return value
    }
    if (!isObject(value)) {
      return null
    }
    if (isJsonSchemaComplexValue(value)) {
      return null
    }

    const type: JsonSchemaNodeValueType = isJsonSchemaNodeType(value.type) ? value.type : JsonSchemaNodeValueTypes.UNKNOWN

    if (
      type === JsonSchemaNodeValueTypes.UNKNOWN ||
      type === JsonSchemaNodeValueTypes.ANY ||
      type === JsonSchemaNodeValueTypes.NOTHING ||
      type === JsonSchemaNodeValueTypes.NULL ||
      type === JsonSchemaNodeValueTypes.BOOLEAN
    ) {
      return {
        ...pick<JsonSchemaCommonNodeValue>(
          value,
          JsonSchemaNodeDataBuilder.getJsonSchemaTreeNodeValueProps(type),
        ),
        type,
      }
    }

    if (type === JsonSchemaNodeValueTypes.STRING) {
      return {
        ...pick<JsonSchemaTreeNodeValueTypeString>(
          value,
          JsonSchemaNodeDataBuilder.getJsonSchemaTreeNodeValueProps(type),
        ),
        type,
      }
    }

    if (type === JsonSchemaNodeValueTypes.NUMBER || type === JsonSchemaNodeValueTypes.INTEGER) {
      return {
        ...pick<JsonSchemaTreeNodeValueTypeNumber>(
          value,
          JsonSchemaNodeDataBuilder.getJsonSchemaTreeNodeValueProps(type),
        ),
        type,
      }
    }

    if (type === JsonSchemaNodeValueTypes.OBJECT) {
      return {
        ...pick<JsonSchemaTreeNodeValueTypeObject>(
          value,
          JsonSchemaNodeDataBuilder.getJsonSchemaTreeNodeValueProps(type),
        ),
        type,
      }
    }

    if (type === JsonSchemaNodeValueTypes.ARRAY) {
      return {
        ...pick<JsonSchemaTreeNodeValueTypeArray>(
          value,
          JsonSchemaNodeDataBuilder.getJsonSchemaTreeNodeValueProps(type),
        ),
        type,
      }
    }

    return null
  }
}
