import { syncCrawl } from '@netcracker/qubership-apihub-json-crawl';
import { createCycleGuardHook } from '../../abstract/hooks/cycle-guard';
import { isObject } from '../../utils';
import { graphApiRules } from '../rules';
import { createGraphApiTreeCrawlHook } from './hooks/create-graph-api-nodes';
import { createGraphSchemaTreeCrawlHook } from './hooks/create-graph-api-schema-nodes';
import { GraphApiModelTree } from './model';
import { GraphApiCrawlRule, GraphApiCrawlState, GraphApiNodeData, GraphApiNodeKind, GraphApiNodeMeta } from './types';

export const createGraphApiTree = (mergedSource: unknown) => {
  const tree = new GraphApiModelTree<GraphApiNodeData, GraphApiNodeKind, GraphApiNodeMeta>(mergedSource)
  if (!isObject(mergedSource)) {
    return tree
  }

  const crawlState: GraphApiCrawlState = {
    parent: null,
    alreadyConvertedMappingStack: new Map(),
  }

  /**
   * FIXME 25.12.24 // Refactor cache used in "cycleGuardHook".
   * 
   * Now this is oriented to OpenAPI/JSON Schema specifications and works fine for them..
   * But data structure of GraphAPI is different. 
   * 
   * Cache memorizes as a key a value which json-crawl provides into hooks
   * "graphApiTreeCrawlHook", "graphSchemaTreeCrawlHook".
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

  syncCrawl<GraphApiCrawlState, GraphApiCrawlRule>(
    mergedSource,
    [
      createCycleGuardHook(tree),
      createGraphApiTreeCrawlHook(tree),
      createGraphSchemaTreeCrawlHook(tree),
    ],
    {
      state: crawlState,
      rules: graphApiRules,
    }
  )

  return tree
}
