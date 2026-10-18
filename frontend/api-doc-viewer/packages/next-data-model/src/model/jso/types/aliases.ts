import { ITreeNodeWithDiffs } from "../../abstract/tree-with-diffs/tree-node.interface"
import { ITreeNode } from "../../abstract/tree/tree-node.interface"
import { JsoTreeNodeDiffsSource } from "../tree-with-diffs/node-diffs-source"
import { JsoTreeNodeValueWithDiffs } from "../tree-with-diffs/node-value"
import { JsoTreeNodeValue } from "../tree/node-value"
import { JsoTreeNodeKind } from "./node-kind"
import { JsoTreeNodeMeta } from "./node-meta"

export type JsoTreeNode =
  ITreeNode<JsoTreeNodeValue | null, JsoTreeNodeKind, JsoTreeNodeMeta>

export type JsoTreeNodeWithDiffs =
  ITreeNodeWithDiffs<JsoTreeNodeValueWithDiffs | null, JsoTreeNodeKind, JsoTreeNodeMeta, JsoTreeNodeDiffsSource>