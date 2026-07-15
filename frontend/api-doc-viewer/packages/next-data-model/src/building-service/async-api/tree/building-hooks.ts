import { AsyncApiTreeNode } from "@apihub/next-data-model/model/async-api/types/aliases";
import { AsyncApiTreeNodeKind } from "@apihub/next-data-model/model/async-api/types/node-kind";
import { AsyncApiTreeNodeMeta } from "@apihub/next-data-model/model/async-api/types/node-meta";
import { AsyncApiTreeNodeValue } from "@apihub/next-data-model/model/async-api/types/node-value";
import { SyncCrawlHook } from "@netcracker/qubership-apihub-json-crawl";
import { createTreeBuildingHooks, TreeBuildingHooksFactoryParams } from "../../abstract/json-crawl-entities/hooks/builder";
import { AsyncApiCrawlRule } from "../json-crawl-entities/rules/types";
import { AsyncApiTreeCrawlState } from "../json-crawl-entities/state/types";

type AsyncApiTreeBuildingNodeParams = {
  value: object | null
  newDataLevel: boolean
  parent: AsyncApiTreeNode | null
  container: AsyncApiTreeNode | null
}

export interface AsyncApiTreeBuildingHooksFactoryParams
  extends TreeBuildingHooksFactoryParams<
    AsyncApiTreeNodeValue<AsyncApiTreeNodeKind> | null,
    AsyncApiTreeNodeKind,
    AsyncApiTreeNodeMeta,
    AsyncApiTreeNode,
    AsyncApiTreeCrawlState,
    AsyncApiTreeBuildingNodeParams
  > {
}

export function createAsyncApiTreeBuildingHooks(
  params: AsyncApiTreeBuildingHooksFactoryParams
): [
  SyncCrawlHook<AsyncApiTreeCrawlState, AsyncApiCrawlRule>,
  SyncCrawlHook<AsyncApiTreeCrawlState, AsyncApiCrawlRule>,
  SyncCrawlHook<AsyncApiTreeCrawlState, AsyncApiCrawlRule>,
] {
  return createTreeBuildingHooks<
    AsyncApiTreeNodeValue<AsyncApiTreeNodeKind> | null,
    AsyncApiTreeNodeKind,
    AsyncApiTreeNodeMeta,
    AsyncApiTreeNode,
    AsyncApiTreeCrawlState,
    AsyncApiCrawlRule,
    AsyncApiTreeBuildingNodeParams
  >(params);
}
