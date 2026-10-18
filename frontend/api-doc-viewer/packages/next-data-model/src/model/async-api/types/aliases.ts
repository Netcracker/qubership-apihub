import { ITreeNode } from "../../abstract/tree/tree-node.interface"
import { AsyncApiTreeNodeKind } from "./node-kind"
import { AsyncApiTreeNodeValue } from "./node-value"
import { AsyncApiTreeNodeMeta } from "./node-meta"
import { ITreeNodeWithDiffs } from "../../abstract/tree-with-diffs/tree-node.interface"

export type AsyncApiTreeNode<
  K extends AsyncApiTreeNodeKind = AsyncApiTreeNodeKind
> = ITreeNode<AsyncApiTreeNodeValue<K> | null, K, AsyncApiTreeNodeMeta>

// TODO 05.05.26 // Remove type arg
export type AsyncApiTreeNodeWithDiffs<
  K extends AsyncApiTreeNodeKind = AsyncApiTreeNodeKind
> = ITreeNodeWithDiffs<
  AsyncApiTreeNodeValue<K> | null,
  K,
  AsyncApiTreeNodeMeta,
  AsyncApiTreeNodeValue<K> | null
>
