import { Tree } from "../../abstract/tree/tree.impl";
import { AsyncApiTreeNodeKind } from "../types/node-kind";
import { AsyncApiTreeNodeMeta } from "../types/node-meta";
import { AsyncApiTreeNodeValue } from "../types/node-value";

export class AsyncApiTree extends Tree<
  AsyncApiTreeNodeValue<AsyncApiTreeNodeKind> | null,
  AsyncApiTreeNodeKind,
  AsyncApiTreeNodeMeta
> {
  constructor() {
    super();
  }
}
