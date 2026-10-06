import { JsonSchemaTreeNodeStoredValue } from "@apihub/next-data-model/model/json-schema/types/node-value"
import { JsonSchemaTreeNode } from "@apihub/next-data-model/model/json-schema/types/aliases"
import { JsonSchemaTreeNodeKind } from "@apihub/next-data-model/model/json-schema/types/node-kind"
import { JsonSchemaTreeNodeMeta } from "@apihub/next-data-model/model/json-schema/types/node-meta"
import { SyncCrawlHook } from "@netcracker/qubership-apihub-json-crawl"
import { createTreeBuildingHooks, TreeBuildingHooksFactoryParams } from "../../abstract/json-crawl-entities/hooks/builder"
import { JsonSchemaCrawlRule } from "../json-crawl-entities/rules/types"
import { JsonSchemaTreeCrawlState } from "../json-crawl-entities/state/types"

export type JsonSchemaTreeBuildingNodeParams = {
  value: JsonSchemaTreeNodeStoredValue | null
  newDataLevel: boolean
  parent: JsonSchemaTreeNode | null
  container: JsonSchemaTreeNode | null
}

export interface JsonSchemaTreeBuildingHooksFactoryParams
  extends TreeBuildingHooksFactoryParams<
    JsonSchemaTreeNodeStoredValue | null,
    JsonSchemaTreeNodeKind,
    JsonSchemaTreeNodeMeta,
    JsonSchemaTreeNode,
    JsonSchemaTreeCrawlState,
    JsonSchemaTreeBuildingNodeParams
  > {
}

export function createJsonSchemaTreeBuildingHooks(
  params: JsonSchemaTreeBuildingHooksFactoryParams,
): [
  SyncCrawlHook<JsonSchemaTreeCrawlState, JsonSchemaCrawlRule>,
  SyncCrawlHook<JsonSchemaTreeCrawlState, JsonSchemaCrawlRule>,
  SyncCrawlHook<JsonSchemaTreeCrawlState, JsonSchemaCrawlRule>,
] {
  return createTreeBuildingHooks<
    JsonSchemaTreeNodeStoredValue | null,
    JsonSchemaTreeNodeKind,
    JsonSchemaTreeNodeMeta,
    JsonSchemaTreeNode,
    JsonSchemaTreeCrawlState,
    JsonSchemaCrawlRule,
    JsonSchemaTreeBuildingNodeParams
  >(params)
}
