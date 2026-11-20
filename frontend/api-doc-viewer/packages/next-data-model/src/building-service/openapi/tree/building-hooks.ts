import { SyncCrawlHook } from "@netcracker/qubership-apihub-json-crawl"
import { OpenApiTreeNode } from "../../../model/openapi/types/aliases"
import { OpenApiTreeNodeKind } from "../../../model/openapi/types/node-kind"
import { OpenApiTreeNodeMeta } from "../../../model/openapi/types/node-meta"
import { OpenApiTreeNodeValue } from "../../../model/openapi/types/node-value"
import { createTreeBuildingHooks, TreeBuildingHooksFactoryParams } from "../../abstract/json-crawl-entities/hooks/builder"
import { OpenApiCrawlRule } from "../json-crawl-entities/rules/types"
import { OpenApiTreeCrawlState } from "../json-crawl-entities/state/types"

export type OpenApiTreeBuildingNodeParams = {
  value: object | null
  newDataLevel: boolean
  parent: OpenApiTreeNode | null
  container: OpenApiTreeNode | null
}

export type OpenApiTreeBuildingHooksFactoryParams = TreeBuildingHooksFactoryParams<
  OpenApiTreeNodeValue<OpenApiTreeNodeKind> | null,
  OpenApiTreeNodeKind,
  OpenApiTreeNodeMeta,
  OpenApiTreeNode,
  OpenApiTreeCrawlState,
  OpenApiTreeBuildingNodeParams
>

export function createOpenApiTreeBuildingHooks(
  params: OpenApiTreeBuildingHooksFactoryParams,
): [
  SyncCrawlHook<OpenApiTreeCrawlState, OpenApiCrawlRule>,
  SyncCrawlHook<OpenApiTreeCrawlState, OpenApiCrawlRule>,
  SyncCrawlHook<OpenApiTreeCrawlState, OpenApiCrawlRule>,
] {
  return createTreeBuildingHooks<
    OpenApiTreeNodeValue<OpenApiTreeNodeKind> | null,
    OpenApiTreeNodeKind,
    OpenApiTreeNodeMeta,
    OpenApiTreeNode,
    OpenApiTreeCrawlState,
    OpenApiCrawlRule,
    OpenApiTreeBuildingNodeParams
  >(params)
}
