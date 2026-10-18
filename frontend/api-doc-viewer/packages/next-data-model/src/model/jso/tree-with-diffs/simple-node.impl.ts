import { ITreeNodeWithDiffs } from "../../abstract/tree-with-diffs/tree-node.interface";
import { JsoTreeNodeKind } from "../types/node-kind";
import { JsoTreeNodeMeta } from "../types/node-meta";
import { JsoTreeNodeDiffsSource } from "./node-diffs-source";
import { JsoTreeNodeValueWithDiffs } from "./node-value";

export type JsoSimpleTreeNodeWithDiffs = ITreeNodeWithDiffs<
  JsoTreeNodeValueWithDiffs | null,
  JsoTreeNodeKind,
  JsoTreeNodeMeta,
  JsoTreeNodeDiffsSource
>
