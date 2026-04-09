import { ITreeNode } from "../../abstract/tree/tree-node.interface"
import { AsyncApiTreeNodeKind } from "./node-kind"
import { AsyncApiTreeNodeValue } from "./node-value"
import { AsyncApiNodeMeta } from "./node-meta"

export type AsyncApiTreeNode<K extends AsyncApiTreeNodeKind = AsyncApiTreeNodeKind> = ITreeNode<AsyncApiTreeNodeValue<K> | null, K, AsyncApiNodeMeta>
