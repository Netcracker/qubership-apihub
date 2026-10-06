import { IModelTreeNode } from '../../abstract/model/types';
import { OpenApiExtensionKey } from '../../oas-extension-key';
import { schemaNodeKind, schemaNodeTypes } from '../constants';

export type SchemaNodeKind = keyof typeof schemaNodeKind
export type SchemaNodeType = (typeof schemaNodeTypes)[number]

export type SchemaNodeMeta = {
  readonly required?: boolean
  readonly deprecated?: boolean
  readonly readOnly?: boolean
  readonly writeOnly?: boolean
  readonly externalDocs?: any
  readonly _fragment?: unknown
}

export type SchemaTreeNode<T extends SchemaNodeType = any> = IModelTreeNode<
  SchemaNodeValue<T>, SchemaNodeKind, SchemaNodeMeta
>

export interface SchemaCreateNodeParams<T, K extends string, M extends object> {
  id: string
  kind: K
  key?: string | number
  value: any
  parent?: IModelTreeNode<T, K, M> | null
  container?: IModelTreeNode<T, K, M> | null
  newDataLevel?: boolean
  isCycle: boolean
}

export type SchemaNodeValue<T extends SchemaNodeType = any> =
  T extends 'any'
  ? ISchemaAnyType
  : T extends 'number'
  ? ISchemaNumberType
  : T extends 'string'
  ? ISchemaStringType
  : T extends 'boolean'
  ? ISchemaBooleanType
  : T extends 'object'
  ? ISchemaObjectType
  : T extends 'array'
  ? ISchemaArrayType
  : T extends 'null'
  ? ISchemaNullType
  : never

export type ISchemaBaseType = {
  // readonly $id: string
  readonly nullable?: boolean
  readonly type: SchemaNodeType // type: [string, number] => anyOf: [ { type: string }, { type: number }]
  readonly title?: string
  readonly description?: string
  readonly examples?: any[]
  // example: value => examples: [value]
  readonly enum?: any[]
  // const: value => enum: [value]
  readonly default?: any
  // list of extensions, used for OpenAPI mostly, like: [{ 'x-example': 'example' }, { 'x-description': 'description' }]
  readonly extensions?: Record<OpenApiExtensionKey, unknown>
}

interface ISchemaAnyType extends ISchemaBaseType {
  readonly type: 'any'
}

interface ISchemaNullType extends ISchemaBaseType {
  readonly type: 'null'
}

interface ISchemaBooleanType extends ISchemaBaseType {
  readonly type: 'boolean'
  readonly default?: boolean
}

export interface ISchemaStringType extends ISchemaBaseType {
  readonly type: 'string'
  readonly format?: string
  readonly enum?: string[]
  readonly minLength?: number
  readonly maxLength?: number
  readonly pattern?: string
  readonly default?: string
}

export interface ISchemaNumberType extends ISchemaBaseType {
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

export interface ISchemaObjectType extends ISchemaBaseType {
  readonly type: 'object'
  readonly minProperties?: number
  readonly maxProperties?: number
  readonly required?: string[]
  readonly default?: any
  readonly propertyNames?: ISchemaStringType
}

export interface ISchemaArrayType extends ISchemaBaseType {
  readonly type: 'array'
  readonly minItems?: number
  readonly maxItems?: number
  readonly uniqueItems?: boolean
  readonly default?: any
}
