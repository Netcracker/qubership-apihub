import { createCycleGuardHook } from "@apihub/abstract-model/hooks/cycle-guard";
import { syncCrawl } from "@netcracker/qubership-apihub-json-crawl";
import { GraphApiModelTree, graphApiRules } from "../..";
import { GraphApiCrawlState, GraphApiTreeComplexNode, GraphApiTreeNode } from "../types";
import { createGraphApiTreeCrawlHook } from "./create-graph-api-nodes";
import { createGraphSchemaTreeCrawlHook } from "./create-graph-api-schema-nodes";

export type ExpandingCallback = (parent: any) => void;

export function createExpandingCallback(
  tree: GraphApiModelTree,
  value: Record<PropertyKey, unknown>,
  alreadyConvertedMappingStack: Map<unknown, GraphApiTreeNode | GraphApiTreeComplexNode>,
): ExpandingCallback {
  return (parent: GraphApiTreeNode) => {
    const initialState: GraphApiCrawlState = { parent, alreadyConvertedMappingStack }
    syncCrawl(
      value,
      [
        createCycleGuardHook(tree),
        createGraphApiTreeCrawlHook(tree),
        createGraphSchemaTreeCrawlHook(tree),
      ],
      {
        state: initialState,
        rules: graphApiRules,
      },
      true, // enable "skip root level" mode
    )
  }
}
