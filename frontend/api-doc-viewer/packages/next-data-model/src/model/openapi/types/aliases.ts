import { ITreeNode } from "../../abstract/tree/tree-node.interface"
import { ITreeNodeWithDiffs } from "../../abstract/tree-with-diffs/tree-node.interface"
import { OpenApiTreeNodeKind } from "./node-kind"
import { OpenApiTreeNodeMeta } from "./node-meta"
import { OpenApiTreeNodeValue } from "./node-value"

export type OpenApiTreeNode<
  K extends OpenApiTreeNodeKind = OpenApiTreeNodeKind
> = ITreeNode<OpenApiTreeNodeValue<K> | null, K, OpenApiTreeNodeMeta>

export type OpenApiTreeNodeWithDiffs<
  K extends OpenApiTreeNodeKind = OpenApiTreeNodeKind
> = ITreeNodeWithDiffs<
  OpenApiTreeNodeValue<K> | null,
  K,
  OpenApiTreeNodeMeta,
  OpenApiTreeNodeValue<K> | null
>
