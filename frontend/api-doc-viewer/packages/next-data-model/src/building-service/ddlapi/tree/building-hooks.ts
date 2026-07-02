import { DdlApiTreeNode } from "@apihub/next-data-model/model/ddlapi/types/aliases";
import { DdlApiTreeNodeKind } from "@apihub/next-data-model/model/ddlapi/types/node-kind";
import { DdlApiTreeNodeMeta } from "@apihub/next-data-model/model/ddlapi/types/node-meta";
import { DdlApiTreeNodeValue } from "@apihub/next-data-model/model/ddlapi/tree/node-value";
import { SyncCrawlHook } from "@netcracker/qubership-apihub-json-crawl";
import { createTreeBuildingHooks, TreeBuildingHooksFactoryParams } from "../../abstract/json-crawl-entities/hooks/builder";
import { DdlApiCrawlRule } from "../json-crawl-entities/rules/types";
import { DdlApiTreeCrawlState } from "../json-crawl-entities/state/types";

type DdlApiTreeBuildingNodeParams = {
  value: object | null
  newDataLevel: boolean
  parent: DdlApiTreeNode | null
  container: DdlApiTreeNode | null
}

export interface DdlApiTreeBuildingHooksFactoryParams
  extends TreeBuildingHooksFactoryParams<
    DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null,
    DdlApiTreeNodeKind,
    DdlApiTreeNodeMeta,
    DdlApiTreeNode,
    DdlApiTreeCrawlState,
    DdlApiTreeBuildingNodeParams
  > {
}

export function createDdlApiTreeBuildingHooks(
  params: DdlApiTreeBuildingHooksFactoryParams
): [
  SyncCrawlHook<DdlApiTreeCrawlState, DdlApiCrawlRule>,
  SyncCrawlHook<DdlApiTreeCrawlState, DdlApiCrawlRule>,
  SyncCrawlHook<DdlApiTreeCrawlState, DdlApiCrawlRule>,
] {
  return createTreeBuildingHooks<
    DdlApiTreeNodeValue<DdlApiTreeNodeKind> | null,
    DdlApiTreeNodeKind,
    DdlApiTreeNodeMeta,
    DdlApiTreeNode,
    DdlApiTreeCrawlState,
    DdlApiCrawlRule,
    DdlApiTreeBuildingNodeParams
  >(params);
}
