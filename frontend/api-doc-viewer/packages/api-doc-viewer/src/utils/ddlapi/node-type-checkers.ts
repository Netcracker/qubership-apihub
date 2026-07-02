import { DdlApiTreeNode } from "@netcracker/qubership-apihub-next-data-model/model/ddlapi/types/aliases"
import {
  DdlApiTreeNodeKinds,
  DdlApiTreeNodeKindsList,
} from "@netcracker/qubership-apihub-next-data-model/model/ddlapi/types/node-kind"
import { ITreeNode } from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree/tree-node.interface"

export function isDdlApiTreeNode(node: ITreeNode): node is DdlApiTreeNode {
  return (DdlApiTreeNodeKindsList as readonly string[]).includes(node.kind)
}

export function getDdlApiChildNodes(
  parent: { childrenNodes(): ITreeNode[] },
): DdlApiTreeNode[] {
  return parent.childrenNodes().filter(isDdlApiTreeNode)
}

export function isTableNode(
  node: ITreeNode,
): node is DdlApiTreeNode<typeof DdlApiTreeNodeKinds.TABLE> {
  return node.kind === DdlApiTreeNodeKinds.TABLE
}

export function isColumnsNode(
  node: ITreeNode,
): node is DdlApiTreeNode<typeof DdlApiTreeNodeKinds.COLUMNS> {
  return node.kind === DdlApiTreeNodeKinds.COLUMNS
}

export function isColumnNode(
  node: ITreeNode,
): node is DdlApiTreeNode<typeof DdlApiTreeNodeKinds.COLUMN> {
  return node.kind === DdlApiTreeNodeKinds.COLUMN
}

export function isIndexesNode(
  node: ITreeNode,
): node is DdlApiTreeNode<typeof DdlApiTreeNodeKinds.INDEXES> {
  return node.kind === DdlApiTreeNodeKinds.INDEXES
}

export function isIndexNode(
  node: ITreeNode,
): node is DdlApiTreeNode<typeof DdlApiTreeNodeKinds.INDEX> {
  return node.kind === DdlApiTreeNodeKinds.INDEX
}

export function getColumnChildNodes(
  nodes: readonly ITreeNode[],
): DdlApiTreeNode<typeof DdlApiTreeNodeKinds.COLUMN>[] {
  return nodes.filter(isColumnNode)
}

export function getIndexChildNodes(
  nodes: readonly ITreeNode[],
): DdlApiTreeNode<typeof DdlApiTreeNodeKinds.INDEX>[] {
  return nodes.filter(isIndexNode)
}
