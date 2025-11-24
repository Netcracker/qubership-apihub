import { syncCrawl } from '@netcracker/qubership-apihub-json-crawl';
import { isObject } from '../../utils';
import { graphApiNodeKind } from '../constants';
import { graphApiRules } from '../rules';
import { createLeaveOnlyOneOperationFilter } from '../utils';
import { createGraphApiTreeCrawlHook } from './hooks/create-graph-api-nodes';
import { createGraphSchemaTreeCrawlHook } from './hooks/create-graph-api-schema-nodes';
import { GraphApiModelTree } from './model';
import { GraphApiCrawlRule, GraphApiCrawlState, GraphApiNodeData, GraphApiNodeKind, GraphApiNodeMeta } from './types';

const DEFAULT_MAX_TREE_LEVEL = 2;

const CRAWL_HOOKS_CACHE: Map<GraphApiModelTree, any[]> = new Map()

export function crawlHooksGraphApiTree(tree: GraphApiModelTree): any[] {
  if (!CRAWL_HOOKS_CACHE.has(tree)) {
    CRAWL_HOOKS_CACHE.set(tree, [
      createGraphApiTreeCrawlHook(tree),
      createGraphSchemaTreeCrawlHook(tree),
    ])
  }
  return CRAWL_HOOKS_CACHE.get(tree)!
}

export const createGraphApiTree = (
  mergedSource: unknown,
  maxTreeLevel: number = DEFAULT_MAX_TREE_LEVEL,
  operationType?: keyof typeof graphApiNodeKind,
  operationName?: string
) => {
  const tree = new GraphApiModelTree<GraphApiNodeData, GraphApiNodeKind, GraphApiNodeMeta>(mergedSource)

  if (!isObject(mergedSource)) {
    return tree
  }

  if (maxTreeLevel < 2) {
    console.error('We do not display nodes with kind = "schema", so it will be impossible to expand such node.')
    return tree
  }

  const crawlState: GraphApiCrawlState = {
    parent: null,
    alreadyConvertedMappingStack: new Map(),
    /* Feature "Lazy Tree Building" */
    nodeIdPrefix: '#',
    treeLevel: 0,
    maxTreeLevel: maxTreeLevel,
    /* --- */
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
    crawlHooksGraphApiTree(tree),
    {
      state: crawlState,
      rules: graphApiRules,
    }
  )

  const childrenFilter = createLeaveOnlyOneOperationFilter(operationType, operationName)
  tree.root?.removeChildrenByCondition(childrenFilter)

  return tree
}
