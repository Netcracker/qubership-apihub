import { ITreeNode } from '@netcracker/qubership-apihub-next-data-model/model/abstract/tree/tree-node.interface'
import { JavaApiTreeNode } from '@netcracker/qubership-apihub-next-data-model/model/javaapi/types/aliases'
import {
  JavaApiTreeNodeKinds,
  JavaApiTreeNodeKindsList,
} from '@netcracker/qubership-apihub-next-data-model/model/javaapi/types/node-kind'

export function isJavaApiTreeNode(node: ITreeNode): node is JavaApiTreeNode {
  return (JavaApiTreeNodeKindsList as readonly string[]).includes(node.kind)
}

export function getJavaApiChildNodes(
  parent: { childrenNodes(): ITreeNode[] },
): JavaApiTreeNode[] {
  return parent.childrenNodes().filter(isJavaApiTreeNode)
}

export function isJavaApiClassNode(
  node: ITreeNode,
): node is JavaApiTreeNode<typeof JavaApiTreeNodeKinds.CLASS> {
  return node.kind === JavaApiTreeNodeKinds.CLASS
}

export function isJavaApiSectionNode(
  node: ITreeNode,
): node is JavaApiTreeNode<typeof JavaApiTreeNodeKinds.SECTION> {
  return node.kind === JavaApiTreeNodeKinds.SECTION
}

export function isJavaApiMemberNode(
  node: ITreeNode,
): node is JavaApiTreeNode<typeof JavaApiTreeNodeKinds.MEMBER> {
  return node.kind === JavaApiTreeNodeKinds.MEMBER
}
