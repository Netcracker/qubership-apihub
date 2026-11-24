import { GraphApiTreeNode } from '@netcracker/qubership-apihub-api-data-model'
import {
  IModelStateCombinaryNode,
  IModelStateNode,
  IModelStatePropNode,
  modelStateNodeType
} from '@netcracker/qubership-apihub-api-state-model'

export function isPropNodeState(
  state: IModelStateNode<GraphApiTreeNode> | null
): state is IModelStatePropNode<GraphApiTreeNode> {
  const { basic, expandable } = modelStateNodeType
  return !!state && (state.type === basic || state.type === expandable)
}

export function isCombinerNodeState(
  state: IModelStateNode<GraphApiTreeNode> | null
): state is IModelStateCombinaryNode<GraphApiTreeNode> {
  return !!state && state.type === modelStateNodeType.combinary
}