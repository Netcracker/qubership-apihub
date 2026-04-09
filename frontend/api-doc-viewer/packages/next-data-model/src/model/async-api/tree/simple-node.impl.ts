import { ITreeNode } from "../../abstract/tree/tree-node.interface";
import { AsyncApiTreeNodeKind } from "../types/node-kind";
import { AsyncApiNodeMeta } from "../types/node-meta";
import { AsyncApiTreeNodeValue } from "../types/node-value";

export type AsyncApiSimpleTreeNode = ITreeNode<
  AsyncApiTreeNodeValue<AsyncApiTreeNodeKind> | null,
  AsyncApiTreeNodeKind,
  AsyncApiNodeMeta
>
