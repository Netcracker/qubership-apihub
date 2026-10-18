import { DiffNodeMeta, DiffNodeValue } from '../../abstract/diff';
import { ModelTreeComplexNode } from '../../abstract/model/model-tree-complex-node.impl';
import { IModelTreeNode } from '../../abstract/model/types';
import type { JsonSchemaNodeKind, JsonSchemaNodeMeta, JsonSchemaNodeType, JsonSchemaNodeValue } from '../tree/types';

export type JsonSchemaDiffTreeNode<T extends JsonSchemaNodeType = any> = IModelTreeNode<
  JsonSchemaDiffNodeValue<T>, JsonSchemaNodeKind, JsonSchemaDiffNodeMeta
>
export type JsonSchemaDiffComplexNode<T extends JsonSchemaNodeType = any> = ModelTreeComplexNode<
  JsonSchemaDiffNodeValue<T>, JsonSchemaNodeKind, JsonSchemaDiffNodeMeta
>
export type JsonSchemaDiffNode<T extends JsonSchemaNodeType = any> = JsonSchemaDiffTreeNode<T> |
  JsonSchemaDiffComplexNode<T>

export type JsonSchemaDiffCrawlState = {
  parent: JsonSchemaDiffTreeNode | null
  container?: JsonSchemaDiffComplexNode
}

export type JsonSchemaDiffNodeValue<T extends JsonSchemaNodeType = any> = JsonSchemaNodeValue<T> & DiffNodeValue
export type JsonSchemaDiffNodeMeta = JsonSchemaNodeMeta & DiffNodeMeta
