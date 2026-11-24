import { TreeWithDiffs } from "../../abstract/tree-with-diffs/tree.impl"
import { OpenApiTreeNodeKind } from "../types/node-kind"
import { OpenApiTreeNodeMeta } from "../types/node-meta"
import { OpenApiTreeNodeValue } from "../types/node-value"

export class OpenApiTreeWithDiffs extends TreeWithDiffs<
  OpenApiTreeNodeValue<OpenApiTreeNodeKind> | null,
  OpenApiTreeNodeKind,
  OpenApiTreeNodeMeta,
  OpenApiTreeNodeValue<OpenApiTreeNodeKind> | null
> {
  constructor() {
    super()
  }
}
