import { ITreeNode } from "../../abstract/tree/tree-node.interface"
import { JsoTreeNodeKind } from "./node-kind"
import { JsoTreeNodeValue } from "./node-value"
import { JsoTreeNodeMeta } from "./node-meta"

export type JsoTreeNode<K extends JsoTreeNodeKind = JsoTreeNodeKind> = ITreeNode<JsoTreeNodeValue | null, K, JsoTreeNodeMeta>
