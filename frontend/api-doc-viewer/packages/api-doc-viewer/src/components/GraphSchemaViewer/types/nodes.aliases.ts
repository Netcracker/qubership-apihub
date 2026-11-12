import {
  GraphApiDiffNodeMeta,
  GraphApiNodeData,
  GraphApiNodeKind,
  GraphApiNodeMeta,
  GraphSchemaDiffNodeValue,
  GraphSchemaNodeKind,
  IModelTreeNode
} from '@netcracker/qubership-apihub-api-data-model'

export type GraphNode =
  | IModelTreeNode<GraphSchemaDiffNodeValue, GraphSchemaNodeKind, GraphApiDiffNodeMeta>
  | IModelTreeNode<GraphApiNodeData, GraphApiNodeKind, GraphApiNodeMeta>

