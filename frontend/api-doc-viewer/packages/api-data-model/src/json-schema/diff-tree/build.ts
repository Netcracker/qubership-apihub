import { syncCrawl } from '@netcracker/qubership-apihub-json-crawl';
import type { DiffMetaKeys } from '../../abstract/diff';
import { isObject } from '../../utils';
import { jsonSchemaCrawlRules } from '../rules';
import { crawlHooksJsonSchemaTree } from '../tree/build';
import type { JsonSchemaCrawlState } from '../tree/types';
import { JsonSchemaModelDiffTree } from './model';
import { JsonSchemaDiffCrawlState } from './types';

const DEFAULT_MAX_TREE_LEVEL = 2;

export const createJsonSchemaDiffTree = (
  mergedAndNormalizedSpec: unknown,
  metaKeys: DiffMetaKeys,
  maxTreeLevel: number = DEFAULT_MAX_TREE_LEVEL,
) => {
  const tree = new JsonSchemaModelDiffTree(mergedAndNormalizedSpec, metaKeys)
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
