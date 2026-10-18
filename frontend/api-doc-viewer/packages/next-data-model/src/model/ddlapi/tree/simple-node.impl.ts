import { ITreeNode } from "../../abstract/tree/tree-node.interface";
import { DdlApiTreeNodeKind } from "../types/node-kind";
import { DdlApiTreeNodeMeta } from "../types/node-meta";
import { DdlApiTreeNodeValue } from "./node-value";

export type DdlApiSimpleTreeNode = ITreeNode<
  DdlApiTreeNodeValue | null,
  DdlApiTreeNodeKind,
  DdlApiTreeNodeMeta
>
