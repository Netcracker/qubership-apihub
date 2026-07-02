import { DdlApiTreeNodeWithDiffs } from "@apihub/next-data-model/model/ddlapi/types/aliases";
import { DdlApiTreeNodeKind } from "@apihub/next-data-model/model/ddlapi/types/node-kind";
import { DdlApiTreeNodeMeta } from "@apihub/next-data-model/model/ddlapi/types/node-meta";
import { DdlApiTreeNodeValue } from "@apihub/next-data-model/model/ddlapi/tree/node-value";
import { SyncCrawlHook } from "@netcracker/qubership-apihub-json-crawl";
import { createTreeBuildingHooks, TreeBuildingHooksFactoryParams } from "../../abstract/json-crawl-entities/hooks/builder";
import { DdlApiTreeWithDiffsCrawlRule } from "../json-crawl-entities/rules/types";
import { DdlApiTreeWithDiffsCrawlState } from "../json-crawl-entities/state/types";

type DdlApiTreeWithDiffsBuildingNodeParams = {
  value: object | null
  newDataLevel: boolean
  parent: DdlApiTreeNodeWithDiffs | null
  container: DdlApiTreeNodeWithDiffs | null
}

export interface DdlApiTreeWithDiffsBuildingHooksFactoryParams
  extends TreeBuildingHooksFactoryParams<
    DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null,
    DdlApiTreeNodeKind,
    DdlApiTreeNodeMeta,
    DdlApiTreeNodeWithDiffs,
    DdlApiTreeWithDiffsCrawlState,
    DdlApiTreeWithDiffsBuildingNodeParams
  > {
}

export function createDdlApiTreeWithDiffsBuildingHooks(
  params: DdlApiTreeWithDiffsBuildingHooksFactoryParams
): [
  SyncCrawlHook<DdlApiTreeWithDiffsCrawlState, DdlApiTreeWithDiffsCrawlRule>,
  SyncCrawlHook<DdlApiTreeWithDiffsCrawlState, DdlApiTreeWithDiffsCrawlRule>,
  SyncCrawlHook<DdlApiTreeWithDiffsCrawlState, DdlApiTreeWithDiffsCrawlRule>,
] {
  return createTreeBuildingHooks<
    DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null,
    DdlApiTreeNodeKind,
    DdlApiTreeNodeMeta,
    DdlApiTreeNodeWithDiffs,
    DdlApiTreeWithDiffsCrawlState,
    DdlApiTreeWithDiffsCrawlRule,
    DdlApiTreeWithDiffsBuildingNodeParams
  >(params);
}
