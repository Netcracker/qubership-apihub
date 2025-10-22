import { CrawlRules, syncCrawl, SyncCrawlHook } from '@netcracker/qubership-apihub-json-crawl';
import { graphApiRules } from '../rules';
import { createGraphSchemaTreeCrawlHook } from '../tree/hooks/create-graph-api-schema-nodes';
import type { GraphApiNodeKind } from '../tree/types';
import { createGraphApiDiffTreeCrawlHook } from './hooks/create-graph-api-nodes';
import { GraphApiModelDiffTree } from './model';
import { GraphApiDiffCrawlRule, GraphApiDiffCrawlState, GraphApiDiffNodeData, GraphApiDiffNodeMeta } from './types';
import { createLeaveOnlyOneOperationFilter } from '../utils';
import { createCycleGuardHook } from '../../abstract/hooks/cycle-guard';

const DEFAULT_MAX_TREE_LEVEL = 3;

const CRAWL_HOOKS_CACHE: Map<GraphApiModelDiffTree<GraphApiDiffNodeData, GraphApiNodeKind, GraphApiDiffNodeMeta>, any[]> = new Map()

export function crawlHooksGraphApiDiffTree(
  tree: GraphApiModelDiffTree<GraphApiDiffNodeData, GraphApiNodeKind, GraphApiDiffNodeMeta>,
  metaKey: symbol,
  aggregatedMetaKey?: symbol,
): any[] {
  if (!CRAWL_HOOKS_CACHE.has(tree)) {
    CRAWL_HOOKS_CACHE.set(tree, [
      createCycleGuardHook(tree),
      createGraphApiDiffTreeCrawlHook(tree as any, metaKey, aggregatedMetaKey) as SyncCrawlHook<any, any>,
      createGraphSchemaTreeCrawlHook(tree as any /*because AMT not type safe*/, metaKey, aggregatedMetaKey) as SyncCrawlHook<any, any>,
    ])
  }
  return CRAWL_HOOKS_CACHE.get(tree)!
}

export function createGraphApiDiffTree(
  mergedSource: unknown,
  metaKeys: {
    diffsMetaKey: symbol,
    aggregatedDiffsMetaKey: symbol,
  },
  options?: {
    rules?: CrawlRules<GraphApiDiffCrawlRule>
    state?: GraphApiDiffCrawlState
  },
  maxTreeLevel: number = DEFAULT_MAX_TREE_LEVEL,
  operationName?: string
) {
  const { rules, state } = options ?? {}

  const { diffsMetaKey, aggregatedDiffsMetaKey } = metaKeys

  const tree = new GraphApiModelDiffTree<
    GraphApiDiffNodeData,
    GraphApiNodeKind,
    GraphApiDiffNodeMeta
  >(mergedSource, diffsMetaKey, aggregatedDiffsMetaKey)

  if (maxTreeLevel < 2) {
    console.error('We do not display nodes with kind = "schema", so it will be impossible to expand such node.')
    return tree
  }

  const defaultState: GraphApiDiffCrawlState = {
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
    crawlHooksGraphApiDiffTree(tree, diffsMetaKey, aggregatedDiffsMetaKey),
    { state: state ?? defaultState, rules: rules ?? graphApiRules }
  )

  const childrenFilter = createLeaveOnlyOneOperationFilter(operationName)
  tree.root?.removeChildrenByCondition(childrenFilter)

  return tree
}
