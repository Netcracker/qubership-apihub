import { ITreeNode } from "../../abstract/tree/tree-node.interface";
import { JsoTreeNodeKind } from "../types/node-kind";
import { JsoTreeNodeMeta } from "../types/node-meta";
import { JsoTreeNodeValue } from "./node-value";

export type JsoSimpleTreeNode = ITreeNode<
  JsoTreeNodeValue | null,
  JsoTreeNodeKind,
  JsoTreeNodeMeta
>
