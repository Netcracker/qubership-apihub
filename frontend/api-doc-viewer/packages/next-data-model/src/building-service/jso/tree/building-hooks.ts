import { JsoTreeNodeValue } from "@apihub/next-data-model/model/jso/tree/node-value";
import { JsoTreeNode } from "@apihub/next-data-model/model/jso/types/aliases";
import { JsoTreeNodeKind } from "@apihub/next-data-model/model/jso/types/node-kind";
import { JsoTreeNodeMeta } from "@apihub/next-data-model/model/jso/types/node-meta";
import { SyncCrawlHook } from "@netcracker/qubership-apihub-json-crawl";
import { JsoCrawlRule } from "../json-crawl-entities/rules/types";
import { JsoTreeCrawlState } from "../json-crawl-entities/state/types";
import { createTreeBuildingHooks, TreeBuildingHooksFactoryParams } from "../../abstract/json-crawl-entities/hooks/builder";

type JsoTreeBuildingNodeParams = {
  value: object | null
  newDataLevel: boolean
  parent: JsoTreeNode | null
  container: JsoTreeNode | null
}

export interface JsoTreeBuildingHooksFactoryParams
  extends TreeBuildingHooksFactoryParams<
    JsoTreeNodeValue | null,
    JsoTreeNodeKind,
    JsoTreeNodeMeta,
    JsoTreeNode,
    JsoTreeCrawlState,
    JsoTreeBuildingNodeParams
  > {
}

export function createJsoTreeBuildingHooks(
  params: JsoTreeBuildingHooksFactoryParams
): [
    SyncCrawlHook<JsoTreeCrawlState, JsoCrawlRule>,
    SyncCrawlHook<JsoTreeCrawlState, JsoCrawlRule>,
    SyncCrawlHook<JsoTreeCrawlState, JsoCrawlRule>,
  ] {
  return createTreeBuildingHooks<
    JsoTreeNodeValue | null,
    JsoTreeNodeKind,
    JsoTreeNodeMeta,
    JsoTreeNode,
    JsoTreeCrawlState,
    JsoCrawlRule,
    JsoTreeBuildingNodeParams
  >(params);
}
