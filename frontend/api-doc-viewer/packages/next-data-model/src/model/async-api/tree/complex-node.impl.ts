import { ComplexTreeNode } from "../../abstract/tree/complex-node.impl";
import { AsyncApiTreeNodeKind } from "../types/node-kind";
import { AsyncApiNodeMeta } from "../types/node-meta";
import { AsyncApiTreeNodeValue } from "../types/node-value";

export type AsyncApiComplexTreeNode = ComplexTreeNode<
  AsyncApiTreeNodeValue<AsyncApiTreeNodeKind> | null,
  AsyncApiTreeNodeKind,
  AsyncApiNodeMeta
>
