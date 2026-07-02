import { ITreeNodeWithDiffs } from "../../abstract/tree-with-diffs/tree-node.interface";
import { DdlApiTreeNodeValue } from "../tree/node-value";
import { DdlApiTreeNodeKind } from "../types/node-kind";
import { DdlApiTreeNodeMeta } from "../types/node-meta";

export type DdlApiSimpleTreeNodeWithDiffs = ITreeNodeWithDiffs<
  DdlApiTreeNodeValue | null,
  DdlApiTreeNodeKind,
  DdlApiTreeNodeMeta,
  DdlApiTreeNodeValue
>
