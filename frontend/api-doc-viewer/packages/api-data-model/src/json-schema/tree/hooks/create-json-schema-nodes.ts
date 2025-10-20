import { buildPointer } from '@netcracker/qubership-apihub-api-unifier';
import { SyncCrawlHook } from '@netcracker/qubership-apihub-json-crawl';
import { modelTreeNodeType } from '../../../abstract/constants';
import { LazyBuildingContext } from '../../../abstract/model/model-tree-node.impl';
import { jsonSchemaNodeKinds } from '../../constants';
import { isJsonSchemaTreeNode } from '../../utils';
import { crawlHooksJsonSchemaTree } from '../build';
import { JsonSchemaModelTree } from '../model';
import type { JsonSchemaComplexNode, JsonSchemaCrawlRule, JsonSchemaCrawlState } from '../types';

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

    const { parent, container, nodeIdPrefix } = state;
    const id = nodeIdPrefix + buildPointer(path);
    const { kind } = rules;

    /* Feature "Lazy Tree Building" */
    const lazyBuildingContext: LazyBuildingContext<any, any, any> = {
      tree: tree,
      crawlValue: value,
      crawlHooks: crawlHooksJsonSchemaTree(tree, value),
      crawlRules: rules as any, // TODO 17.10.25 // Get rid of "any"
      alreadyConvertedMappingStack: state.alreadyConvertedMappingStack as any, // TODO 17.10.25 // Get rid of "any"
      nodeIdPrefix: id,
      nextLevel: state.treeLevel,
      nextMaxLevel: state.maxTreeLevel,
    }
    /* --- */

    const alreadyExisted = state.alreadyConvertedMappingStack.has(value)

    const nodeCreationResult = container
      ? tree.createJsonSchemaNode(
        { id, kind, key, value, container, parent: container.parent, isCycle: alreadyExisted },
        lazyBuildingContext,
      )
      : tree.createJsonSchemaNode(
        { id, kind, key, value, parent, isCycle: alreadyExisted },
        lazyBuildingContext,
      )

    if (container) {
      container.addNestedNode(nodeCreationResult.node);
    } else {
      parent?.addChild(nodeCreationResult.node);
    }

    if (alreadyExisted) {
      return { done: true }
    }

    /* Feature "Lazy Tree Building" */
    if (
      state.treeLevel >= state.maxTreeLevel &&
      nodeCreationResult.node.type === modelTreeNodeType.simple
    ) {
      return { done: true }
    }
    const nextTreeLevel = state.treeLevel + 1
    /* --- */

    if (nodeCreationResult.value) {
      const stack = new Map(state.alreadyConvertedMappingStack);
      stack.set(value, nodeCreationResult.node);
      let newState: JsonSchemaCrawlState;
      if (isJsonSchemaTreeNode(nodeCreationResult.node)) {
        newState = {
          parent: nodeCreationResult.node,
          alreadyConvertedMappingStack: stack,
          /* Feature "Lazy Tree Building" */
          nodeIdPrefix: nodeIdPrefix,
          treeLevel: nextTreeLevel,
          maxTreeLevel: state.maxTreeLevel,
          /* --- */
        }
      } else {
        newState = {
          parent: parent,
          container: nodeCreationResult.node as JsonSchemaComplexNode,
          alreadyConvertedMappingStack: stack,
          /* Feature "Lazy Tree Building" */
          nodeIdPrefix: nodeIdPrefix,
          treeLevel: nextTreeLevel,
          maxTreeLevel: state.maxTreeLevel,
          /* --- */
        }
      }
      return { value: nodeCreationResult.value, state: newState };
    } else {
      return { done: true };
    }
  };
}
