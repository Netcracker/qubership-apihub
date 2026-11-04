import { Tree } from "../../abstract/tree/tree.impl"
import { OpenApiTreeNodeKind } from "../types/node-kind"
import { OpenApiTreeNodeMeta } from "../types/node-meta"
import { OpenApiTreeNodeValue } from "../types/node-value"

export class OpenApiTree extends Tree<
  OpenApiTreeNodeValue<OpenApiTreeNodeKind> | null,
  OpenApiTreeNodeKind,
  OpenApiTreeNodeMeta
> {
  constructor() {
    super()
  }
}
