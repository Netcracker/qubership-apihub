import { CrawlRules, syncCrawl, SyncCrawlHook } from '@netcracker/qubership-apihub-json-crawl';
import { createCycleGuardHook } from '../../abstract/hooks/cycle-guard';
import { graphApiRules } from '../rules';
import { createGraphSchemaTreeCrawlHook } from '../tree/hooks/create-graph-api-schema-nodes';
import type { GraphApiNodeKind } from '../tree/types';
import { createGraphApiDiffTreeCrawlHook } from './hooks/create-graph-api-nodes';
import { GraphApiModelDiffTree } from './model';
import { GraphApiDiffCrawlRule, GraphApiDiffCrawlState, GraphApiDiffNodeData, GraphApiDiffNodeMeta } from './types';

export function createGraphApiDiffTree(
  mergedSource: unknown,
  metaKey: symbol,
  options?: {
    rules?: CrawlRules<GraphApiDiffCrawlRule>
    state?: GraphApiDiffCrawlState
  }
) {
  const { rules, state } = options ?? {}

  const tree = new GraphApiModelDiffTree<
    GraphApiDiffNodeData,
    GraphApiNodeKind,
    GraphApiDiffNodeMeta
  >(mergedSource, metaKey)

  const defaultState: GraphApiDiffCrawlState = {
    parent: null,
    source: mergedSource,
    alreadyConvertedMappingStack: new Map(),
  }

  /**
   * FIXME 25.12.24 // Refactor cache used in "cycleGuardHook".
   * 
   * Now this is oriented to OpenAPI/JSON Schema specifications and works fine for them..
   * But data structure of GraphAPI is different. 
   * 
   * Cache memorizes as a key a value which json-crawl provides into hooks
   * "graphApiDiffTreeCrawlHook", "graphSchemaTreeCrawlHook".
   * GraphAPI is structured as a node is produced from a UNIQUE fragment, but
   * entity in this fragment is the only instance.
   * 
   * Example: 
   * Node will be constructed from fragment: 
   * {
   *    typeDef: {
   *      type: { kind: 'enum', values: { enumValue: {} }}
   *    }
   * }
   * The entire fragment is UNIQUE, but entity INSIDE PARENTHESES after "typeDef" - THE ONLY INSTANCE.
   * 
   * We MUST take into account this factor to provide relevant cache for GraphAPI.
   * Otherwise, it affects performance badly.
   */

  syncCrawl(
    mergedSource,
    [
      createCycleGuardHook(tree),
      createGraphApiDiffTreeCrawlHook(tree, metaKey) as SyncCrawlHook<any, any>,
      createGraphSchemaTreeCrawlHook(tree as any /*because AMT not type safe*/, metaKey) as SyncCrawlHook<any, any>,
    ],
    { state: state ?? defaultState, rules: rules ?? graphApiRules }
  )

  return tree
}
