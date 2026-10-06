import { ITreeNodeWithDiffs } from "@apihub/next-data-model/model/abstract/tree-with-diffs/tree-node.interface"
import { ITreeNode } from "@apihub/next-data-model/model/abstract/tree/tree-node.interface"
import { JsonSchemaTreeNodeStoredValue } from "@apihub/next-data-model/model/json-schema/types/node-value"
import { JsonSchemaTreeNodeKind } from "@apihub/next-data-model/model/json-schema/types/node-kind"
import { JsonSchemaTreeNodeMeta } from "@apihub/next-data-model/model/json-schema/types/node-meta"

export type JsonSchemaTreeNode<K extends JsonSchemaTreeNodeKind = JsonSchemaTreeNodeKind> =
  ITreeNode<JsonSchemaTreeNodeStoredValue | null, K, JsonSchemaTreeNodeMeta>

export type JsonSchemaTreeNodeWithDiffs<K extends JsonSchemaTreeNodeKind = JsonSchemaTreeNodeKind> =
  ITreeNodeWithDiffs<
    JsonSchemaTreeNodeStoredValue | null,
    K,
    JsonSchemaTreeNodeMeta,
    JsonSchemaTreeNodeStoredValue | null
  >

/** Plain or with-diffs node — use in viewers that support both tree modes. */
export type JsonSchemaViewerTreeNode<K extends JsonSchemaTreeNodeKind = JsonSchemaTreeNodeKind> =
  JsonSchemaTreeNode<K> | JsonSchemaTreeNodeWithDiffs<K>
