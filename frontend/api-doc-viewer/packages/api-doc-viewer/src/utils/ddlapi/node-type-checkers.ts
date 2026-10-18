import { SimpleTreeNodeWithDiffs } from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/simple-node.impl"
import { ITreeNode } from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree/tree-node.interface"
import { DdlApiTreeNode, DdlApiTreeNodeWithDiffs } from "@netcracker/qubership-apihub-next-data-model/model/ddlapi/types/aliases"
import {
  DdlApiTreeNodeKinds,
  DdlApiTreeNodeKindsList,
} from "@netcracker/qubership-apihub-next-data-model/model/ddlapi/types/node-kind"

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

export function isTableNodeWithDiffs(
  node: ITreeNode,
): node is DdlApiTreeNodeWithDiffs<typeof DdlApiTreeNodeKinds.TABLE> {
  return isTableNode(node) && node instanceof SimpleTreeNodeWithDiffs
}

export function isColumnsNode(
  node: ITreeNode,
): node is DdlApiTreeNode<typeof DdlApiTreeNodeKinds.COLUMNS> {
  return node.kind === DdlApiTreeNodeKinds.COLUMNS
}

export function isColumnsNodeWithDiffs(
  node: ITreeNode,
): node is DdlApiTreeNodeWithDiffs<typeof DdlApiTreeNodeKinds.COLUMNS> {
  return isColumnsNode(node) && node instanceof SimpleTreeNodeWithDiffs
}

export function isIndexesNodeWithDiffs(
  node: ITreeNode,
): node is DdlApiTreeNodeWithDiffs<typeof DdlApiTreeNodeKinds.INDEXES> {
  return isIndexesNode(node) && node instanceof SimpleTreeNodeWithDiffs
}

export function isColumnNode(
  node: ITreeNode,
): node is DdlApiTreeNode<typeof DdlApiTreeNodeKinds.COLUMN> {
  return node.kind === DdlApiTreeNodeKinds.COLUMN
}

export function isColumnNodeWithDiffs(
  node: ITreeNode,
): node is DdlApiTreeNodeWithDiffs<typeof DdlApiTreeNodeKinds.COLUMN> {
  return isColumnNode(node) && node instanceof SimpleTreeNodeWithDiffs
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

export function isIndexNodeWithDiffs(
  node: ITreeNode,
): node is DdlApiTreeNodeWithDiffs<typeof DdlApiTreeNodeKinds.INDEX> {
  return isIndexNode(node) && node instanceof SimpleTreeNodeWithDiffs
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
