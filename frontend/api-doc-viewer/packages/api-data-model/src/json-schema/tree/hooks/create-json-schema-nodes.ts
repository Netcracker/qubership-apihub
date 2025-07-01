import { buildPointer } from '@netcracker/qubership-apihub-api-unifier';
import { SyncCrawlHook } from '@netcracker/qubership-apihub-json-crawl';
import { jsonSchemaNodeKinds } from '../../constants';
import { isJsonSchemaTreeNode } from '../../utils';
import { JsonSchemaModelTree } from '../model';
import type { JsonSchemaCrawlState, JsonSchemaCrawlRule, JsonSchemaComplexNode } from '../types';


export function createJsonSchemaTreeCrawlHook(
  tree: JsonSchemaModelTree
): SyncCrawlHook<JsonSchemaCrawlState, JsonSchemaCrawlRule> {
  return ({ key, value, path, rules, state }) => {
    if (!rules) {
      return { done: true };
    }
    if (typeof key === 'symbol') {
      return { done: true };
    }
    if (value === undefined || value === null) {
      return { done: true };
    }
    if (!jsonSchemaNodeKinds.includes(rules?.kind) || Array.isArray(value)) {
      return;
    }

    const id = '#' + buildPointer(path);
    const { parent, container } = state;
    const { kind } = rules;

    const res = container
      ? tree.createNestedNode(id, kind, key, value, container, false /*TODO*/)
      : tree.createChildNode(id, kind, key, value, parent, false /*TODO*/);

    if (res.value) {
      const stack = new Map(state.alreadyConvertedMappingStack);
      stack.set(value, res.node);
      const newState: JsonSchemaCrawlState = isJsonSchemaTreeNode(res.node)
        ? { parent: res.node, alreadyConvertedMappingStack: stack }
        : { parent, container: res.node as JsonSchemaComplexNode, alreadyConvertedMappingStack: stack };
      return { value: res.value, state: newState };
    } else {
      return { done: true };
    }
  };
}
