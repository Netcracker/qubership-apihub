import { buildPointer } from '@netcracker/qubership-apihub-api-unifier';
import { GraphApiSchema } from '@netcracker/qubership-apihub-graphapi';
import { SyncCrawlHook } from '@netcracker/qubership-apihub-json-crawl';
import { GraphApiCrawlRule, GraphApiCrawlState, GraphApiNodeData, graphApiNodeKind, GraphApiNodeKind, graphApiNodeKinds, GraphApiNodeMeta, GraphApiTreeComplexNode, GraphApiTreeNode } from '../..';
import { modelTreeNodeType } from "../../../abstract/constants";
import { ModelTreeNodeParams } from '../../../abstract/model/types';
import { isBrokenRef } from '../../../json-schema';
import { areExcludedComponents } from '../../utils';
import { GraphApiModelTree } from '../model';
import { createExpandingCallback } from './create-expanding-callback';

export function createGraphApiTreeCrawlHook(
  tree: GraphApiModelTree
): SyncCrawlHook<GraphApiCrawlState, GraphApiCrawlRule> {
  return ({ value, state, rules, path, key }) => {
    if (typeof key === 'symbol') {
      return { done: true };
    }
    if (value === undefined || value === null) {
      return { done: true };
    }
    if (!rules) {
      return areExcludedComponents(path) ? { done: true } : { value, state }
    }
    if (!('kind' in rules) || !graphApiNodeKinds.includes(rules.kind)) {
      return areExcludedComponents(path) ? { done: true } : { value, state }
    }

    const id = '#' + buildPointer(path);
    const { parent, container } = state;
    const { kind } = rules;

    let result: any = {
      value,
      node: {},
    };

    const expandingCallback = createExpandingCallback(tree, value as Record<PropertyKey, unknown>, state, rules);

    const newDataLevel = false;
    switch (kind) {
      case graphApiNodeKind.query:
      case graphApiNodeKind.mutation:
      case graphApiNodeKind.subscription: {
        result = tree.createGraphSchemaNode({
          id, kind, key, value, parent, container,
          newDataLevel: newDataLevel,
          isCycle: false,
          /* Feature "Lazy Tree Building" */
          expandingCallback,
          /* --- */
        });
        break;
      }
      case graphApiNodeKind.schema: {
        const { description } = value as GraphApiSchema;
        const params: ModelTreeNodeParams<GraphApiNodeData, GraphApiNodeKind, GraphApiNodeMeta> = {
          value: { description },
          parent,
          container,
          meta: {
            ...(isBrokenRef(value) ? { brokenRef: value.$ref } : {}),
            _fragment: value,
          },
          newDataLevel: newDataLevel,
          /* Feature "Lazy Tree Building" */
          expandingCallback,
          /* --- */
        };
        result.node = tree.createNode(id, kind, key, false, params);
        break;
      }
    }

    parent?.addChild(result.node);

    /* Feature "Lazy Tree Building" */
    if (state.treeLevel === state.maxTreeLevel) {
      return { done: true };
    }

    const nextTreeLevel = state.treeLevel + 1;
    /* --- */

    if (result.value) {
      const stack = new Map(state.alreadyConvertedMappingStack);
      stack.set(value, result.node);
      let newState: GraphApiCrawlState
      if (result.node!.type === modelTreeNodeType.simple) {
        newState = {
          parent: result.node as GraphApiTreeNode,
          alreadyConvertedMappingStack: stack,
          /* Feature "Lazy Tree Building" */
          treeLevel: nextTreeLevel,
          maxTreeLevel: state.maxTreeLevel,
          /* --- */
        }
      } else {
        newState = {
          parent: parent,
          container: result.node as GraphApiTreeComplexNode,
          alreadyConvertedMappingStack: stack,
          /* Feature "Lazy Tree Building" */
          treeLevel: nextTreeLevel,
          maxTreeLevel: state.maxTreeLevel,
          /* --- */
        }
      }
      return { value: result.value, state: newState };
    } else {
      return { done: true };
    }
  };
}
