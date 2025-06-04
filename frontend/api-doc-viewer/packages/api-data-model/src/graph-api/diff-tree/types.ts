import { DiffNodeMeta, DiffNodeValue } from '../../abstract/diff';
import { ModelTreeComplexNode } from '../../abstract/model/model-tree-complex-node.impl';
import { ModelTreeNode } from '../../abstract/model/model-tree-node.impl';
import { SchemaCrawlRule } from '../../abstract/types';
import { GraphApiNodeData, GraphApiNodeKind, GraphApiNodeMeta, GraphSchemaNodeType, GraphSchemaNodeValue } from '../tree/types';

export type GraphSchemaDiffNodeValue<T extends GraphSchemaNodeType = any> = GraphSchemaNodeValue<T> & DiffNodeValue
export type GraphApiDiffNodeMeta = GraphApiNodeMeta & DiffNodeMeta

export type GraphApiDiffCrawlState = {
  parent: GraphApiDiffTreeNode | null
  container?: GraphApiDiffComplexNode
  source: any
  alreadyConvertedMappingStack: Map<unknown, GraphApiDiffComplexNode | GraphApiDiffTreeNode>
}
export type GraphApiDiffCrawlRule = SchemaCrawlRule<GraphApiNodeKind, GraphApiDiffCrawlState>

export type GraphApiDiffTreeNode = ModelTreeNode<
  GraphApiDiffNodeData, GraphApiNodeKind, GraphApiDiffNodeMeta
>
export type GraphApiDiffComplexNode = ModelTreeComplexNode<
  GraphApiDiffNodeData, GraphApiNodeKind, GraphApiDiffNodeMeta
>

export type GraphApiDiffNodeData = GraphApiNodeData & DiffNodeValue
