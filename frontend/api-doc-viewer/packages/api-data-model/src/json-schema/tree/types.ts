import { ModelTreeComplexNode } from '../../abstract/model/model-tree-complex-node.impl';
import { IModelTreeNode } from '../../abstract/model/types';
import { SchemaCrawlRule } from '../../abstract/types';
import { OpenApiExtensionKey } from '../../oas-extension-key';
import { jsonSchemaNodeKind, jsonSchemaNodeTypes } from '../constants';

export type JsonSchemaNodeKind = keyof typeof jsonSchemaNodeKind
export type JsonSchemaNodeType = (typeof jsonSchemaNodeTypes)[number]

export type JsonSchemaCrawlRule = SchemaCrawlRule<JsonSchemaNodeKind, JsonSchemaCrawlState>

export type JsonSchemaNodeMeta = {
  readonly required?: boolean
  readonly deprecated?: boolean
  readonly readOnly?: boolean
  readonly writeOnly?: boolean
  readonly externalDocs?: any
  readonly _fragment?: unknown
}

export type JsonSchemaTreeNode<T extends JsonSchemaNodeType = any> = IModelTreeNode<
  JsonSchemaNodeValue<T>, JsonSchemaNodeKind, JsonSchemaNodeMeta
>
export type JsonSchemaComplexNode<T extends JsonSchemaNodeType = any> = ModelTreeComplexNode<
  JsonSchemaNodeValue<T>, JsonSchemaNodeKind, JsonSchemaNodeMeta
>
export type JsonSchemaNode<T extends JsonSchemaNodeType = any> = JsonSchemaTreeNode<T> | JsonSchemaComplexNode<T>

export interface JsonSchemaCrawlState {
  parent: JsonSchemaTreeNode | null
  container?: JsonSchemaComplexNode
  alreadyConvertedMappingStack: Map<unknown, JsonSchemaNode>
}

export interface JsonSchemaCreateNodeParams<T, K extends string, M extends object> {
  id: string
  kind: K
  key?: string | number
  value: any
  parent?: IModelTreeNode<T, K, M> | null
  container?: IModelTreeNode<T, K, M> | null
  newDataLevel?: boolean
  isCycle: boolean
}

export type JsonSchemaNodeValue<T extends JsonSchemaNodeType = any> = T extends 'any' ? IJsonSchemaAnyType : T extends 'number' ? IJsonSchemaNumberType : T extends 'string' ? IJsonSchemaStringType : T extends 'boolean' ? IJsonSchemaBooleanType : T extends 'object' ? IJsonSchemaObjectType : T extends 'array' ? IJsonSchemaArrayType : T extends 'null' ? IJsonSchemaNullType : never

export type IJsonSchemaBaseType = {
  // readonly $id: string
  readonly nullable?: boolean
  readonly type: JsonSchemaNodeType // type: [string, number] => anyOf: [ { type: string }, { type: number }]
  readonly title?: string
  readonly description?: string
  readonly examples?: any[]
  // example: value => examples: [value]
  readonly enum?: any[]
  // const: value => enum: [value]
  readonly default?: any
  // x-extensionName, used for OpenAPI mostly
  readonly [extensionKey: OpenApiExtensionKey]: unknown
}

export interface IJsonSchemaAnyType extends IJsonSchemaBaseType {
  readonly type: 'any'
}

export interface IJsonSchemaNullType extends IJsonSchemaBaseType {
  readonly type: 'null'
}

export interface IJsonSchemaBooleanType extends IJsonSchemaBaseType {
  readonly type: 'boolean'
  readonly default?: boolean
}

export interface IJsonSchemaStringType extends IJsonSchemaBaseType {
  readonly type: 'string'
  readonly format?: string
  readonly enum?: string[]
  readonly minLength?: number
  readonly maxLength?: number
  readonly pattern?: string
  readonly default?: string
}

export interface IJsonSchemaNumberType extends IJsonSchemaBaseType {
  readonly type: 'number' | 'integer'
  readonly format?: string
  readonly enum?: number[]
  readonly multipleOf?: number
  readonly minimum?: number // remove if exclusiveMinimum
  readonly exclusiveMinimum?: number // boolean => number
  readonly maximum?: number // remove if exclusiveMaximum
  readonly exclusiveMaximum?: number // boolean => number
  readonly default?: number // remove if wrong type
}

export interface IJsonSchemaObjectType extends IJsonSchemaBaseType {
  readonly type: 'object'
  readonly minProperties?: number
  readonly maxProperties?: number
  readonly required?: string[]
  readonly default?: any
  readonly propertyNames?: IJsonSchemaStringType
}

export interface IJsonSchemaArrayType extends IJsonSchemaBaseType {
  readonly type: 'array'
  readonly minItems?: number
  readonly maxItems?: number
  readonly uniqueItems?: boolean
  readonly default?: any
}
