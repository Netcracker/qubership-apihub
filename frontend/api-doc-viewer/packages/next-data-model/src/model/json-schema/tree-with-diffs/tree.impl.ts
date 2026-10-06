import { TreeWithDiffs } from "@apihub/next-data-model/model/abstract/tree-with-diffs/tree.impl"
import { JsonSchemaTreeNodeStoredValue } from "@apihub/next-data-model/model/json-schema/types/node-value"
import { JsonSchemaTreeNodeKind } from "@apihub/next-data-model/model/json-schema/types/node-kind"
import { JsonSchemaTreeNodeMeta } from "@apihub/next-data-model/model/json-schema/types/node-meta"

export class JsonSchemaTreeWithDiffs extends TreeWithDiffs<
  JsonSchemaTreeNodeStoredValue | null,
  JsonSchemaTreeNodeKind,
  JsonSchemaTreeNodeMeta,
  JsonSchemaTreeNodeStoredValue | null
> {
  constructor() {
    super()
  }
}
