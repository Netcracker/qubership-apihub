import { JsoTreeNodeValueWithDiffs } from "@apihub/next-data-model/model/jso/tree-with-diffs/node-value";
import { JsoTreeNodeWithDiffs } from "@apihub/next-data-model/model/jso/types/aliases";
import { JsoTreeNodeKind } from "@apihub/next-data-model/model/jso/types/node-kind";
import { JsoTreeNodeMeta } from "@apihub/next-data-model/model/jso/types/node-meta";
import { SyncCrawlHook } from "@netcracker/qubership-apihub-json-crawl";
import { JsoWithDiffsCrawlRule } from "../json-crawl-entities/rules/types";
import { JsoTreeWithDiffsCrawlState } from "../json-crawl-entities/state/types";
import { createTreeBuildingHooks, TreeBuildingHooksFactoryParams } from "../../abstract/json-crawl-entities/hooks/builder";

type JsoTreeWithDiffsBuildingNodeParams = {
  value: NonNullable<unknown> | null
  newDataLevel: boolean
  parent: JsoTreeNodeWithDiffs | null
  container: JsoTreeNodeWithDiffs | null
}

export interface JsoTreeWithDiffsBuildingHooksFactoryParams
  extends TreeBuildingHooksFactoryParams<
    JsoTreeNodeValueWithDiffs | null,
    JsoTreeNodeKind,
    JsoTreeNodeMeta,
    JsoTreeNodeWithDiffs,
    JsoTreeWithDiffsCrawlState,
    JsoTreeWithDiffsBuildingNodeParams
  > {
}

export function createJsoTreeWithDiffsBuildingHooks(
  params: JsoTreeWithDiffsBuildingHooksFactoryParams
): [
    SyncCrawlHook<JsoTreeWithDiffsCrawlState, JsoWithDiffsCrawlRule>,
    SyncCrawlHook<JsoTreeWithDiffsCrawlState, JsoWithDiffsCrawlRule>,
    SyncCrawlHook<JsoTreeWithDiffsCrawlState, JsoWithDiffsCrawlRule>,
  ] {
  return createTreeBuildingHooks<
    JsoTreeNodeValueWithDiffs | null,
    JsoTreeNodeKind,
    JsoTreeNodeMeta,
    JsoTreeNodeWithDiffs,
    JsoTreeWithDiffsCrawlState,
    JsoWithDiffsCrawlRule,
    JsoTreeWithDiffsBuildingNodeParams
  >(params);
}
