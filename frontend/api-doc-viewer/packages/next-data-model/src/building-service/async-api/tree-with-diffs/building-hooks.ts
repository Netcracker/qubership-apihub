import { AsyncApiTreeNodeWithDiffs } from "@apihub/next-data-model/model/async-api/types/aliases";
import { AsyncApiTreeNodeKind } from "@apihub/next-data-model/model/async-api/types/node-kind";
import { AsyncApiTreeNodeMeta } from "@apihub/next-data-model/model/async-api/types/node-meta";
import { AsyncApiTreeNodeValue } from "@apihub/next-data-model/model/async-api/types/node-value";
import { SyncCrawlHook } from "@netcracker/qubership-apihub-json-crawl";
import { createTreeBuildingHooks, TreeBuildingHooksFactoryParams } from "../../abstract/json-crawl-entities/hooks/builder";
import { AsyncApiTreeWithDiffsCrawlRule } from "../json-crawl-entities/rules/types";
import { AsyncApiTreeWithDiffsCrawlState } from "../json-crawl-entities/state/types";

type AsyncApiTreeWithDiffsBuildingNodeParams = {
  value: object | null
  newDataLevel: boolean
  parent: AsyncApiTreeNodeWithDiffs | null
  container: AsyncApiTreeNodeWithDiffs | null
}

export interface AsyncApiTreeWithDiffsBuildingHooksFactoryParams
  extends TreeBuildingHooksFactoryParams<
    AsyncApiTreeNodeValue<AsyncApiTreeNodeKind> | null,
    AsyncApiTreeNodeKind,
    AsyncApiTreeNodeMeta,
    AsyncApiTreeNodeWithDiffs,
    AsyncApiTreeWithDiffsCrawlState,
    AsyncApiTreeWithDiffsBuildingNodeParams
  > {
}

export function createAsyncApiTreeWithDiffsBuildingHooks(
  params: AsyncApiTreeWithDiffsBuildingHooksFactoryParams
): [
  SyncCrawlHook<AsyncApiTreeWithDiffsCrawlState, AsyncApiTreeWithDiffsCrawlRule>,
  SyncCrawlHook<AsyncApiTreeWithDiffsCrawlState, AsyncApiTreeWithDiffsCrawlRule>,
  SyncCrawlHook<AsyncApiTreeWithDiffsCrawlState, AsyncApiTreeWithDiffsCrawlRule>,
] {
  return createTreeBuildingHooks<
    AsyncApiTreeNodeValue<AsyncApiTreeNodeKind> | null,
    AsyncApiTreeNodeKind,
    AsyncApiTreeNodeMeta,
    AsyncApiTreeNodeWithDiffs,
    AsyncApiTreeWithDiffsCrawlState,
    AsyncApiTreeWithDiffsCrawlRule,
    AsyncApiTreeWithDiffsBuildingNodeParams
  >(params);
}
