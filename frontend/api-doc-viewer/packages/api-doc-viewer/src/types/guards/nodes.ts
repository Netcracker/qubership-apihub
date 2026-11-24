import {
  GraphApiDiffNodeMeta,
  GraphApiDiffTreeNode,
  GraphApiTreeNode,
  GraphSchemaDiffNodeValue,
} from '@netcracker/qubership-apihub-api-data-model'
import {
  IModelStateCombinaryNode,
  IModelStateNode,
  IModelStatePropNode,
  modelStateNodeType
} from '@netcracker/qubership-apihub-api-state-model'
import { safePropertyIn } from '../../utils/common/objects'
import { AnyTreeNode, AnyTreeNodeMeta, AnyTreeNodeValue } from '../aliases/nodes'

export function isRefNode(
  node: AnyTreeNode | null
): boolean {
  const nodeMeta = node?.meta
  return safePropertyIn(nodeMeta, 'brokenRef', 'isRefNode')
}

export function isDiffNodeValue(
  value?: AnyTreeNodeValue
): value is GraphSchemaDiffNodeValue {
  if (!value) {
    return false
  }

  const castedValue = value as GraphSchemaDiffNodeValue
  return !!castedValue.$changes
}

export function isDiffNodeMeta(
  meta?: AnyTreeNodeMeta
): meta is GraphApiDiffNodeMeta {
  if (!meta) {
    return false
  }

  const castedMeta = meta as GraphApiDiffNodeMeta
  return !!(/* castedMeta.$nodeChangesSummary || */
    castedMeta.$nodeChange || castedMeta.$metaChanges
    || castedMeta.$childrenChanges || castedMeta.$nestedChanges)
}

export function isPropNodeState(
  state:
    | IModelStateNode<GraphApiDiffTreeNode>
    | IModelStateNode<GraphApiTreeNode>
    | null
): state is
  | IModelStatePropNode<GraphApiDiffTreeNode>
  | IModelStatePropNode<GraphApiTreeNode> {

  const { basic, expandable } = modelStateNodeType
  return !!state && (state.type === basic || state.type === expandable)
}

export function isCombinerNodeState(
  state:
    | IModelStateNode<GraphApiDiffTreeNode>
    | IModelStateNode<GraphApiTreeNode>
    | null
): state is
  | IModelStateCombinaryNode<GraphApiDiffTreeNode>
  | IModelStateCombinaryNode<GraphApiTreeNode> {

  return !!state && state.type === modelStateNodeType.combinary
}