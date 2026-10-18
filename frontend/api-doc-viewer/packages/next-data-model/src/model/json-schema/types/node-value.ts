import { OpenApiExtensionKey } from "@apihub/next-data-model/shared/json-schema/types/extension-key"
import { UnknownArray, UnknownObject } from "@apihub/next-data-model/utility-types"
import {
  JsonSchemaNodeValueType,
  JsonSchemaNodeValueTypes,
} from "@apihub/next-data-model/model/json-schema/types/node-value-type"

/** Raw boolean schema fragments (e.g. `additionalProperties: false`). */
export type JsonSchemaTreeNodePrimitiveValue = boolean

/** Value returned by `JsonSchemaTreeNode.value()` — typed schema object or a raw primitive. */
export type JsonSchemaTreeNodeStoredValue = JsonSchemaTreeNodeValue | JsonSchemaTreeNodePrimitiveValue

export type JsonSchemaTreeNodeValue<T extends JsonSchemaNodeValueType = JsonSchemaNodeValueType> =
  T extends typeof JsonSchemaNodeValueTypes.ANY
    ? JsonSchemaTreeNodeValueAnyType
    : T extends typeof JsonSchemaNodeValueTypes.NOTHING
      ? JsonSchemaTreeNodeValueNothingType
      : T extends typeof JsonSchemaNodeValueTypes.NULL
        ? JsonSchemaTreeNodeValueTypeNull
        : T extends typeof JsonSchemaNodeValueTypes.STRING
          ? JsonSchemaTreeNodeValueTypeString
          : T extends typeof JsonSchemaNodeValueTypes.NUMBER | typeof JsonSchemaNodeValueTypes.INTEGER
            ? JsonSchemaTreeNodeValueTypeNumber
            : T extends typeof JsonSchemaNodeValueTypes.BOOLEAN
              ? JsonSchemaTreeNodeValueTypeBoolean
              : T extends typeof JsonSchemaNodeValueTypes.OBJECT
                ? JsonSchemaTreeNodeValueTypeObject
                : T extends typeof JsonSchemaNodeValueTypes.ARRAY
                  ? JsonSchemaTreeNodeValueTypeArray
                  : T extends typeof JsonSchemaNodeValueTypes.UNKNOWN
                    ? JsonSchemaTreeNodeValueBase
                    : never

/**
 * Generic, spec-agnostic annotation entry a consuming spec (e.g. AsyncAPI) can attach to any
 * node's `customAnnotations` bag - the label is supplied entirely by the caller, so this layer
 * never hardcodes a spec-specific concept (e.g. AsyncAPI's "Location") by name.
 */
export type JsonSchemaCustomAnnotation = {
  readonly label: string
  readonly value: unknown
}

export type JsonSchemaTreeNodeValueBase = {
  readonly type: JsonSchemaNodeValueType
  readonly nullable?: boolean
  readonly default?: unknown
  readonly title?: string
  readonly description?: string
  readonly examples?: unknown[]
  readonly enum?: unknown[]
  readonly extensions?: Record<OpenApiExtensionKey, unknown>
  readonly customAnnotations?: Readonly<Record<string, JsonSchemaCustomAnnotation>>
}

export type JsonSchemaTreeNodeValueAnyType = JsonSchemaTreeNodeValueBase & {
  readonly type: typeof JsonSchemaNodeValueTypes.ANY
}

export type JsonSchemaTreeNodeValueNothingType = JsonSchemaTreeNodeValueBase & {
  readonly type: typeof JsonSchemaNodeValueTypes.NOTHING
}

export type JsonSchemaTreeNodeValueTypeNull = JsonSchemaTreeNodeValueBase & {
  readonly type: typeof JsonSchemaNodeValueTypes.NULL
}

export type JsonSchemaTreeNodeValueTypeBoolean = JsonSchemaTreeNodeValueBase & {
  readonly type: typeof JsonSchemaNodeValueTypes.BOOLEAN
  readonly default?: boolean
}

export type JsonSchemaTreeNodeValueTypeString = JsonSchemaTreeNodeValueBase & {
  readonly type: typeof JsonSchemaNodeValueTypes.STRING
  readonly default?: string
  readonly format?: string
  readonly enum?: string[]
  readonly minLength?: number
  readonly maxLength?: number
  readonly pattern?: string
}

export type JsonSchemaTreeNodeValueTypeNumber = JsonSchemaTreeNodeValueBase & {
  readonly type: typeof JsonSchemaNodeValueTypes.NUMBER | typeof JsonSchemaNodeValueTypes.INTEGER
  readonly default?: number
  readonly format?: string
  readonly enum?: number[]
  readonly multipleOf?: number
  readonly minimum?: number
  readonly exclusiveMinimum?: number | boolean
  readonly maximum?: number
  readonly exclusiveMaximum?: number | boolean
}

export type JsonSchemaTreeNodeValueTypeObject = JsonSchemaTreeNodeValueBase & {
  readonly type: typeof JsonSchemaNodeValueTypes.OBJECT
  readonly default?: UnknownObject
  readonly minProperties?: number
  readonly maxProperties?: number
  readonly required?: string[]
  readonly propertyNames?: JsonSchemaTreeNodeValueTypeString
}

export type JsonSchemaTreeNodeValueTypeArray = JsonSchemaTreeNodeValueBase & {
  readonly type: typeof JsonSchemaNodeValueTypes.ARRAY
  readonly default?: UnknownArray
  readonly minItems?: number
  readonly maxItems?: number
  readonly uniqueItems?: boolean
}

export { JsonSchemaNodeValueTypes as JSON_SCHEMA_NODE_VALUE_TYPES }
export { TYPE_UNKNOWN as JSON_SCHEMA_TYPE_UNKNOWN } from "@apihub/next-data-model/model/abstract/constants"
