import { syncCrawl } from '@netcracker/qubership-apihub-json-crawl';
import { isObject } from '../../utils';
import { jsonSchemaCrawlRules } from '../rules';
import { crawlHooksJsonSchemaTree } from '../tree/build';
import type { JsonSchemaCrawlState } from '../tree/types';
import { JsonSchemaModelDiffTree } from './model';
import { JsonSchemaDiffCrawlState } from './types';

const DEFAULT_MAX_TREE_LEVEL = 2;

export const createJsonSchemaDiffTree = (
  mergedAndNormalizedSpec: unknown,
  metaKeys: {
    diffsMetaKey: symbol,
    aggregatedDiffsMetaKey: symbol,
  },
  maxTreeLevel: number = DEFAULT_MAX_TREE_LEVEL,
) => {
  const { diffsMetaKey, aggregatedDiffsMetaKey } = metaKeys;
  const tree = new JsonSchemaModelDiffTree(mergedAndNormalizedSpec, diffsMetaKey, aggregatedDiffsMetaKey)
  if (!isObject(mergedAndNormalizedSpec)) {
    return tree
  }
  
  const crawlState: JsonSchemaDiffCrawlState & JsonSchemaCrawlState = {
    parent: null,
    alreadyConvertedMappingStack: new Map(),
    /* Feature "Lazy Tree Building" */
    nodeIdPrefix: '#',
    treeLevel: 0,
    maxTreeLevel: maxTreeLevel,
    /* --- */
  }

  syncCrawl(
    mergedAndNormalizedSpec,
    crawlHooksJsonSchemaTree(tree, mergedAndNormalizedSpec),
    {
      state: crawlState,
      rules: jsonSchemaCrawlRules()
    }
  )

  return tree
}
