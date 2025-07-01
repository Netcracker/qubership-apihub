import { syncCrawl } from '@netcracker/qubership-apihub-json-crawl';
import { createCycleGuardHook } from '../../abstract/hooks/cycle-guard';
import { createTransformCrawlHook } from '../../abstract/hooks/transform';
import { createJsonSchemaTreeCrawlHook } from './hooks/create-json-schema-nodes';
import { isObject } from '../../utils';
import { jsonSchemaCrawlRules } from '../rules';
import { JsonSchemaModelTree } from './model';
import type { JsonSchemaNodeValue, JsonSchemaNodeKind, JsonSchemaNodeMeta, JsonSchemaCrawlState } from './types';


export const createJsonSchemaTree = (normalizedSchema: unknown) => {
  const tree = new JsonSchemaModelTree<JsonSchemaNodeValue, JsonSchemaNodeKind, JsonSchemaNodeMeta>(normalizedSchema)
  if (!isObject(normalizedSchema)) {
    return tree
  }

  const crawlState: JsonSchemaCrawlState = {
    parent: null,
    alreadyConvertedMappingStack: new Map(),
  }

  syncCrawl(
    normalizedSchema,
    [
      createCycleGuardHook(tree),
      createTransformCrawlHook(normalizedSchema),
      createJsonSchemaTreeCrawlHook(tree),
    ],
    {
      state: crawlState,
      rules: jsonSchemaCrawlRules(),
    }
  )

  return tree
}
