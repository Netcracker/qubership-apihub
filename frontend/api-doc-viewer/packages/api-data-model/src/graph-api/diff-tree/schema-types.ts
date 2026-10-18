import { DiffNodeMeta, DiffNodeValue } from '../../abstract/diff';
import { IModelTreeNode } from '../../abstract/model/types';
import type { SchemaNodeKind, SchemaNodeMeta, SchemaNodeType, SchemaNodeValue } from '../tree/schema-types';

export type SchemaDiffTreeNode<T extends SchemaNodeType = any> = IModelTreeNode<
  SchemaDiffNodeValue<T>, SchemaNodeKind, SchemaDiffNodeMeta
>

export type SchemaDiffNodeValue<T extends SchemaNodeType = any> = SchemaNodeValue<T> & DiffNodeValue
export type SchemaDiffNodeMeta = SchemaNodeMeta & DiffNodeMeta
