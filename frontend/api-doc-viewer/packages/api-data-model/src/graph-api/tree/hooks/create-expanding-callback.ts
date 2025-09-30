import { CrawlRules, syncCrawl } from "@netcracker/qubership-apihub-json-crawl";
import { GraphApiModelTree } from "../..";
import { createCycleGuardHook } from "../../../abstract/hooks/cycle-guard";
import { GraphApiCrawlRule, GraphApiCrawlState, GraphApiTreeNode } from "../types";
import { createGraphApiTreeCrawlHook } from "./create-graph-api-nodes";
import { createGraphSchemaTreeCrawlHook } from "./create-graph-api-schema-nodes";

export type ExpandingCallback = (parent: any) => void;

export function createExpandingCallback(
  tree: GraphApiModelTree,
  value: Record<PropertyKey, unknown>,
  state: GraphApiCrawlState,
  rules: CrawlRules<GraphApiCrawlRule> | undefined,
): ExpandingCallback {
  return (parent: GraphApiTreeNode) => {
    const initialState: GraphApiCrawlState = {
      parent: parent,
      alreadyConvertedMappingStack: state.alreadyConvertedMappingStack,
      treeLevel: state.treeLevel,
      maxTreeLevel: state.maxTreeLevel + 1,
    }
    syncCrawl(
      value,
      [
        createCycleGuardHook(tree),
        createGraphApiTreeCrawlHook(tree),
        createGraphSchemaTreeCrawlHook(tree),
      ],
      {
        state: initialState,
        rules: rules,
      },
      true, // enable "skip root level" mode
    )
  }
}
