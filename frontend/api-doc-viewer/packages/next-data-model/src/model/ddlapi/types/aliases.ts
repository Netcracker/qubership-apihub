import { ITreeNodeWithDiffs } from "../../abstract/tree-with-diffs/tree-node.interface"
import { ITreeNode } from "../../abstract/tree/tree-node.interface"
import { DdlApiTreeNodeValue } from "../tree/node-value"
import { DdlApiTreeNodeKind } from "./node-kind"
import { DdlApiTreeNodeMeta } from "./node-meta"

export type DdlApiTreeNode<
  K extends DdlApiTreeNodeKind = DdlApiTreeNodeKind
> = ITreeNode<DdlApiTreeNodeValue<K> | null, K, DdlApiTreeNodeMeta>

export type DdlApiTreeNodeWithDiffs<
  K extends DdlApiTreeNodeKind = DdlApiTreeNodeKind
> = ITreeNodeWithDiffs<
  DdlApiTreeNodeValue<K> | null,
  K,
  DdlApiTreeNodeMeta,
  DdlApiTreeNodeValue<K>
>