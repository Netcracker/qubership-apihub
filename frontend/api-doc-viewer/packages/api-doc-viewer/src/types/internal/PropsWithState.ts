import { IModelStateCombinaryNode, IModelStatePropNode } from '@netcracker/qubership-apihub-api-state-model'
import { GraphApiDiffTreeNode, GraphApiTreeNode } from '@netcracker/qubership-apihub-api-data-model'
import { AnyTreeNode } from '../aliases/nodes'

export type GraphPropNodePropsWithState = {
  state: IModelStatePropNode<GraphApiDiffTreeNode> | IModelStatePropNode<GraphApiTreeNode>
}
export type GraphCombinerNodePropsWithState = {
  state: IModelStateCombinaryNode<GraphApiDiffTreeNode> | IModelStateCombinaryNode<GraphApiTreeNode>
}
export type AnyNodePropsWithState = {
  state: IModelStatePropNode<AnyTreeNode>
}
