import { syncCrawl } from '@netcracker/qubership-apihub-json-crawl';
import { createCycleGuardHook } from '../../abstract/hooks/cycle-guard';
import { createTransformCrawlHook } from '../../abstract/hooks/transform';
import { createJsonSchemaTreeCrawlHook } from '../tree/hooks/create-json-schema-nodes';
import { isObject } from '../../utils';
import { jsonSchemaCrawlRules } from '../rules';
import type { JsonSchemaCrawlState } from '../tree/types';
import { JsonSchemaModelDiffTree } from './model';
import { JsonSchemaDiffCrawlState } from './types';


export const createJsonSchemaDiffTree = (mergedAndNormalizedSpec: unknown, metaKey: symbol) => {
  const tree = new JsonSchemaModelDiffTree(mergedAndNormalizedSpec, metaKey)
  if (!isObject(mergedAndNormalizedSpec)) {
    return tree
  }
  const crawlState: JsonSchemaDiffCrawlState & JsonSchemaCrawlState = {
    parent: null,
    alreadyConvertedMappingStack: new Map(),
  }

  syncCrawl(mergedAndNormalizedSpec, [
    createCycleGuardHook(tree as any /*broken current domain API type safty*/),
    createTransformCrawlHook(mergedAndNormalizedSpec),
    createJsonSchemaTreeCrawlHook(tree as any /*broken current domain API type safty*/),
  ], { state: crawlState, rules: jsonSchemaCrawlRules() })

  return tree
}
