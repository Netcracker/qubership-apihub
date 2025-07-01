import { GraphApiArgs } from '@netcracker/qubership-apihub-graphapi'
import { UNKNOWN_TYPE } from "../../abstract/constants"
import { ModelTreeComplexNode } from '../../abstract/model/model-tree-complex-node.impl'
import { ModelTreeNode } from '../../abstract/model/model-tree-node.impl'
import { SchemaCrawlRule } from '../../abstract/types'
import { graphApiNodeKind, graphSchemaNodeKind } from '../constants'

export const graphSchemaNodeTypes = [
  UNKNOWN_TYPE,
  'ID', 'scalar', 'string', 'enum', 'integer', 'float', 'boolean',
  'object', 'interface', 'input',
  'list'
] as const

export type GraphSchemaNodeKind = keyof typeof graphSchemaNodeKind
export type GraphSchemaNodeType = typeof graphSchemaNodeTypes[number]

export type GraphApiNodeMeta = {
  readonly args?: Record<string, IGraphSchemaObjectType>
  readonly directives?: Record<string, any>
  readonly deprecationReason?: string
  readonly _fragment?: any
}

export type GraphSchemaNodeValue<T extends GraphSchemaNodeType = any> =
  T extends 'ID' ? IGraphSchemaIdType :
  T extends 'scalar' ? IGraphSchemaScalarType :
  T extends 'string' ? IGraphSchemaStringType :
  T extends 'enum' ? IGraphSchemaEnumType :
  T extends 'integer' ? IGraphSchemaNumberType :
  T extends 'float' ? IGraphSchemaNumberType :
  T extends 'boolean' ? IGraphSchemaBooleanType :
  T extends 'object' ? IGraphSchemaObjectType :
  T extends 'interface' ? IGraphSchemaInterfaceType :
  T extends 'input' ? IGraphSchemaInputObjectType :
  T extends 'list' ? IGraphSchemaListType :
  never

export interface IGraphSchemaBaseType<T extends GraphSchemaNodeType> {
  readonly title?: string
  readonly type: T
  readonly description?: string
  readonly nullable?: boolean
  readonly default?: unknown
  readonly value?: unknown
}

export interface IGraphSchemaIdType extends IGraphSchemaBaseType<'ID'> {
  readonly default?: string
}

export interface IGraphSchemaScalarType extends IGraphSchemaBaseType<'scalar'> {
  readonly default?: string
}

export interface IGraphSchemaStringType extends IGraphSchemaBaseType<'string'> {
  readonly default?: string
}

export interface IGraphSchemaEnumType extends IGraphSchemaBaseType<'enum'> {
  readonly values?: Record<string, IGraphSchemaEnumValueType>
  readonly default?: string
}

export interface IGraphSchemaEnumValueType {
  readonly description?: string
  readonly deprecationReason?: string
}

export interface IGraphSchemaNumberType extends IGraphSchemaBaseType<'integer' | 'float'> {
  readonly default?: number
}

export interface IGraphSchemaBooleanType extends IGraphSchemaBaseType<'boolean'> {
  readonly default?: boolean
}

export interface IGraphSchemaObjectType extends IGraphSchemaBaseType<'object'> {
  readonly type: 'object'
  readonly default?: Record<PropertyKey, unknown>
}

export interface IGraphSchemaInterfaceType extends IGraphSchemaBaseType<'interface'> {
  readonly type: 'interface'
  readonly default?: Record<PropertyKey, unknown>
}

export interface IGraphSchemaInputObjectType extends IGraphSchemaBaseType<'input'> {
  readonly type: 'input'
  readonly default?: Record<PropertyKey, unknown>
}

export interface IGraphSchemaListType extends IGraphSchemaBaseType<'list'> {
  readonly type: 'list'
  readonly default?: unknown[]
}

export type GraphApiNodeKind = GraphSchemaNodeKind | keyof typeof graphApiNodeKind

export type GraphApiCrawlState = {
  parent: GraphApiTreeNode | null
  container?: GraphApiTreeComplexNode
  alreadyConvertedMappingStack: Map<unknown, GraphApiTreeNode | GraphApiTreeComplexNode>
}

export type GraphApiCrawlRule = SchemaCrawlRule<GraphApiNodeKind, GraphApiCrawlState>

export type GraphApiTreeNode = ModelTreeNode<GraphApiNodeData, GraphApiNodeKind, GraphApiNodeMeta>
export type GraphApiTreeComplexNode = ModelTreeComplexNode<GraphApiNodeData, GraphApiNodeKind, GraphApiNodeMeta>

export type GraphApiNodeData = GraphApiSchemaNodeData | GraphApiDirectiveNodeData | GraphSchemaNodeValue

export interface GraphApiSchemaNodeData {
  description?: string
}

export interface GraphApiDirectiveNodeData {
  // name
  title: string

  // description
  description?: string

  // locations
  locations: string[]

  // args[]
  args?: GraphApiArgs

  // isRepeatable
  repeatable: boolean
}
