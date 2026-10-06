import { Tree } from "@apihub/next-data-model/model/abstract/tree/tree.impl"
import { JsonSchemaTreeNodeStoredValue } from "@apihub/next-data-model/model/json-schema/types/node-value"
import { JsonSchemaTreeNodeKind } from "@apihub/next-data-model/model/json-schema/types/node-kind"
import { JsonSchemaTreeNodeMeta } from "@apihub/next-data-model/model/json-schema/types/node-meta"

export class JsonSchemaTree extends Tree<
  JsonSchemaTreeNodeStoredValue | null,
  JsonSchemaTreeNodeKind,
  JsonSchemaTreeNodeMeta
> {
  constructor() {
    super()
  }
}
