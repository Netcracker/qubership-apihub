import { buildPointer } from '@netcracker/qubership-apihub-api-unifier';
import { GraphApiSchema } from '@netcracker/qubership-apihub-graphapi';
import { SyncCrawlHook } from '@netcracker/qubership-apihub-json-crawl';
import {
  GraphApiCrawlState,
  GraphApiNodeData,
  graphApiNodeKind,
  GraphApiNodeKind,
  graphApiNodeKinds,
  GraphApiNodeMeta,
  GraphApiTreeComplexNode,
  GraphApiTreeNode
} from '../..';
import { modelTreeNodeType } from "../../../abstract/constants";
import { ModelTreeNodeParams } from '../../../abstract/model/types';
import { isBrokenRef } from '../../../json-schema';
import { areExcludedComponents } from '../../utils';
import { GraphApiModelTree } from '../model';
import { LazyBuildingContext } from "@apihub/abstract-model/model/model-tree-node.impl";

export function createGraphApiTreeCrawlHook(
  tree: GraphApiModelTree
  // FIXME 01.10.25 // Revert "any"
): SyncCrawlHook<any, any> {
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

    const lazyBuildingContext: LazyBuildingContext<any, any, any> = {
      tree: tree,
      crawlValue: value,
      crawlRules: rules,
      alreadyConvertedMappingStack: new Map(state.alreadyConvertedMappingStack),
      nextLevel: state.treeLevel,
      nextMaxLevel: state.maxTreeLevel + 1,
    }

    const newDataLevel = false;
    switch (kind) {
      case graphApiNodeKind.query:
      case graphApiNodeKind.mutation:
      case graphApiNodeKind.subscription: {
        result = tree.createGraphSchemaNode({
          id,
          kind,
          key,
          value,
          parent,
          container,
          newDataLevel: newDataLevel,
          isCycle: false
        }, lazyBuildingContext);
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
          // @ts-expect-error FIXME 01.10.25 // Fix types
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
          // @ts-expect-error FIXME 01.10.25 // Fix types
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
