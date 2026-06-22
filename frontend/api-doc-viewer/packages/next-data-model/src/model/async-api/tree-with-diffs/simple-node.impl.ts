import { SimpleTreeNodeWithDiffs } from "../../abstract/tree-with-diffs/simple-node.impl";
import { AsyncApiTreeNodeKind } from "../types/node-kind";
import { AsyncApiTreeNodeMeta } from "../types/node-meta";
import { AsyncApiTreeNodeValue } from "../types/node-value";

export type AsyncApiSimpleTreeNodeWithDiffs = SimpleTreeNodeWithDiffs<
  AsyncApiTreeNodeValue<AsyncApiTreeNodeKind> | null,
  AsyncApiTreeNodeKind,
  AsyncApiTreeNodeMeta,
  AsyncApiTreeNodeValue<AsyncApiTreeNodeKind> | null
>
