import {
  ITreeNodeWithDiffs,
  NodeDescendantDiffsSummary,
  NodeDiffsSummary,
} from "@apihub/next-data-model/model/abstract/tree-with-diffs/tree-node.interface"
import { JsonSchemaTreeNodeKind } from "@apihub/next-data-model/model/json-schema/types/node-kind"
import { JsonSchemaTreeNodeMeta } from "@apihub/next-data-model/model/json-schema/types/node-meta"
import { JsonSchemaTreeNodeStoredValue } from "@apihub/next-data-model/model/json-schema/types/node-value"

type JsonSchemaWithDiffsNode = ITreeNodeWithDiffs<
  JsonSchemaTreeNodeStoredValue | null,
  JsonSchemaTreeNodeKind,
  JsonSchemaTreeNodeMeta,
  JsonSchemaTreeNodeStoredValue | null
>

function hasNonEmptyRecord(record: object | undefined): boolean {
  return !!record && Object.keys(record).length > 0
}

function hasNonEmptySet(set: NodeDiffsSummary | NodeDescendantDiffsSummary | undefined): boolean {
  return !!set && set.size > 0
}

export function hasOwnChangeSignals(node: JsonSchemaWithDiffsNode): boolean {
  return hasNonEmptyRecord(node.diffs)
    || hasNonEmptyRecord(node.descendantDiffs)
    || hasNonEmptySet(node.diffsSummary)
    || hasNonEmptySet(node.descendantDiffsSummary)
    || hasNonEmptyRecord(node.diffsSeverities)
}
