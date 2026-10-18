import { TreeWithDiffs } from "../../abstract/tree-with-diffs/tree.impl";
import { AsyncApiTreeNodeKind } from "../types/node-kind";
import { AsyncApiTreeNodeMeta } from "../types/node-meta";
import { AsyncApiTreeNodeValue } from "../types/node-value";

export class AsyncApiTreeWithDiffs extends TreeWithDiffs<
  AsyncApiTreeNodeValue<AsyncApiTreeNodeKind> | null,
  AsyncApiTreeNodeKind,
  AsyncApiTreeNodeMeta,
  AsyncApiTreeNodeValue<AsyncApiTreeNodeKind> | null
> {
  constructor() {
    super();
  }
}
