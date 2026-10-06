import { ITreeNode } from "@apihub/next-data-model/model/abstract/tree/tree-node.interface"
import {
  JsonSchemaTreeNode,
  JsonSchemaTreeNodeWithDiffs,
} from "@apihub/next-data-model/model/json-schema/types/aliases"
import { JsonSchemaTreeNodeStoredValue } from "@apihub/next-data-model/model/json-schema/types/node-value"
import { JsonSchemaTreeNodeKind } from "@apihub/next-data-model/model/json-schema/types/node-kind"
import { JsonSchemaTreeNodeMeta } from "@apihub/next-data-model/model/json-schema/types/node-meta"

export function isRequiredJsonSchemaProperty(
  key: string | number,
  parent: ITreeNode<JsonSchemaTreeNodeStoredValue | null, JsonSchemaTreeNodeKind, JsonSchemaTreeNodeMeta> | null,
): boolean {
  if (!parent || typeof key === "number" || !key) {
    return false
  }
  const value = parent.value()
  return !!value
    && typeof value === "object"
    && "required" in value
    && Array.isArray(value.required)
    && value.required.includes(String(key))
}

export function isJsonSchemaTreeNodeWithDiffs(
  node: JsonSchemaTreeNode | JsonSchemaTreeNodeWithDiffs,
): node is JsonSchemaTreeNodeWithDiffs {
  return (
    "diffs" in node &&
    "diffsSummary" in node &&
    "descendantDiffs" in node &&
    "descendantDiffsSummary" in node &&
    "diffsSeverities" in node
  )
}
