import { syncCrawl } from '@netcracker/qubership-apihub-json-crawl';
import { createTransformCrawlHook } from '../../abstract/hooks/transform';
import { isObject } from '../../utils';
import { jsonSchemaCrawlRules } from '../rules';
import { createJsonSchemaTreeCrawlHook } from './hooks/create-json-schema-nodes';
import { JsonSchemaModelTree } from './model';
import type { JsonSchemaCrawlState, JsonSchemaNodeKind, JsonSchemaNodeMeta, JsonSchemaNodeValue } from './types';

const DEFAULT_MAX_TREE_LEVEL = 2;

export function crawlHooksJsonSchemaTree<Tree extends JsonSchemaModelTree<any, any, any>>(
  tree: Tree,
  preparedSchema: unknown,
): any[] {
  return [
    createTransformCrawlHook(preparedSchema),
    createJsonSchemaTreeCrawlHook(tree),
  ]
}

export const createJsonSchemaTree = (
  normalizedSchema: unknown,
  maxTreeLevel: number = DEFAULT_MAX_TREE_LEVEL,
) => {
  const tree = new JsonSchemaModelTree<JsonSchemaNodeValue, JsonSchemaNodeKind, JsonSchemaNodeMeta>(normalizedSchema)
  if (!isObject(normalizedSchema)) {
    return tree
  }

  const crawlState: JsonSchemaCrawlState = {
    parent: null,
    alreadyConvertedMappingStack: new Map(),
    /* Feature "Lazy Tree Building" */
    nodeIdPrefix: '#',
    treeLevel: 0,
    maxTreeLevel: maxTreeLevel,
    /* --- */
  }

  syncCrawl(
    normalizedSchema,
    crawlHooksJsonSchemaTree(tree, normalizedSchema),
    {
      state: crawlState,
      rules: jsonSchemaCrawlRules(),
    }
  )

  return tree
}
