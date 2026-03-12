import { Tree } from "../../abstract/tree/tree.impl";
import { AsyncApiTreeNodeKind } from "../types/node-kind";
import { AsyncApiNodeMeta } from "../types/node-meta";
import { AsyncApiTreeNodeValue } from "../types/node-value";

export class AsyncApiTree extends Tree<
  AsyncApiTreeNodeValue<AsyncApiTreeNodeKind> | null,
  AsyncApiTreeNodeKind,
  AsyncApiNodeMeta
> {
  constructor() {
    super();
  }
}
